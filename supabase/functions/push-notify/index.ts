// Supabase Edge Function: push-notify
// 毎分 pg_cron から呼び出され、due_time のタスクをプッシュ通知する

import webpush from 'npm:web-push@3'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!

webpush.setVapidDetails(
  'mailto:admin@family-task.app',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
)

// Supabase REST ヘルパー（service role で RLS バイパス）
async function query(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      apikey:        SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })
  const text = await res.text()
  return text ? JSON.parse(text) : []
}

async function del(path: string) {
  await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method:  'DELETE',
    headers: {
      apikey:        SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })
}

Deno.serve(async () => {
  try {
    const now = new Date()

    const subs: Array<{
      id: string
      user_id: string
      // deno-lint-ignore no-explicit-any
      subscription: any
      tz_offset: number
    }> = await query('/push_subscriptions?select=*')

    let sent = 0

    for (const sub of subs) {
      const localNow  = new Date(now.getTime() - sub.tz_offset * 60 * 1000)
      const localDate = localNow.toISOString().slice(0, 10)
      const localHHMM = localNow.toISOString().slice(11, 16)

      const tasks: Array<{
        id: string
        title: string
        due_date: string | null
        due_time: string
        notify_before: number | null
      }> = await query(
        `/tasks?user_id=eq.${sub.user_id}&status=neq.completed&due_time=not.is.null&select=id,title,due_date,due_time,notify_before`
      )

      for (const task of tasks) {
        if (!task.due_time) continue
        const taskDueDate = task.due_date ?? localDate
        const effectiveDueDate = taskDueDate < localDate ? localDate : taskDueDate
        const dueDatetimeLocal = new Date(`${effectiveDueDate}T${task.due_time}`)
        const notifyAtLocal = new Date(dueDatetimeLocal.getTime() - (task.notify_before ?? 0) * 60 * 1000)
        const notifyDate = notifyAtLocal.toISOString().slice(0, 10)
        const notifyHHMM = notifyAtLocal.toISOString().slice(11, 16)
        if (notifyDate !== localDate || notifyHHMM !== localHHMM) continue

        try {
          await webpush.sendNotification(
            sub.subscription,
            JSON.stringify({
              title: '⏰ タスクの時間です',
              body:  task.title,
            }),
          )
          sent++
        } catch (e: unknown) {
          const err = e as { statusCode?: number }
          if (err.statusCode === 410) {
            await del(`/push_subscriptions?id=eq.${sub.id}`)
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, subscribers: subs.length, sent }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
