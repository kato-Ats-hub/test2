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
  const now = new Date()

  // 全プッシュサブスクリプションを取得
  const subs: Array<{
    id: string
    user_id: string
    subscription: PushSubscriptionJSON
    tz_offset: number
  }> = await query('/push_subscriptions?select=*')

  let sent = 0

  for (const sub of subs) {
    // tz_offset = JS の getTimezoneOffset() の値
    // ユーザーのローカル時刻 = UTC - tz_offset（分）
    const localNow    = new Date(now.getTime() - sub.tz_offset * 60 * 1000)
    const localDate   = localNow.toISOString().slice(0, 10)   // YYYY-MM-DD
    const localHHMM   = localNow.toISOString().slice(11, 16)  // HH:MM

    // due_time が HH:MM で始まるタスクを検索（TIME型は HH:MM:SS で保存される場合も対応）
    const encoded = encodeURIComponent(localHHMM + '%')
    const tasks: Array<{
      id: string
      title: string
      due_date: string | null
      due_time: string
    }> = await query(
      `/tasks?user_id=eq.${sub.user_id}&status=neq.completed&due_time=like.${encoded}&select=id,title,due_date,due_time`
    )

    for (const task of tasks) {
      // due_date が設定されている場合は日付も確認
      if (task.due_date && task.due_date !== localDate) continue

      try {
        await webpush.sendNotification(
          sub.subscription as Parameters<typeof webpush.sendNotification>[0],
          JSON.stringify({
            title: '⏰ タスクの時間です',
            body:  task.title,
          }),
        )
        sent++
      } catch (e: unknown) {
        // 410 = 無効なサブスクリプション → 削除
        if (typeof e === 'object' && e !== null && 'statusCode' in e && (e as { statusCode: number }).statusCode === 410) {
          await del(`/push_subscriptions?id=eq.${sub.id}`)
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, subscribers: subs.length, sent }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
