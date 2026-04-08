// ── 通知許可を要求 ────────────────────────────────────────
export async function requestPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function hasPermission() {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}

// ── タスク一覧から通知をスケジュール ──────────────────────
export function scheduleNotifications(tasks) {
  if (!hasPermission()) return
  if (!navigator.serviceWorker?.controller) return

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  const notifications = tasks
    .filter(t => t.due_time && t.status !== 'completed')
    .map(t => {
      // 日付が設定されていればその日、なければ今日
      const dateStr = t.due_date ?? todayStr
      // 過去の日付は今日として扱う
      const effectiveDate = dateStr < todayStr ? todayStr : dateStr
      const notifyAt = new Date(`${effectiveDate}T${t.due_time}`)
      return {
        id:    t.id,
        title: '⏰ タスクの時間です',
        body:  t.title,
        delay: notifyAt - now,
      }
    })
    .filter(n => n.delay > 0)

  navigator.serviceWorker.controller.postMessage({ type: 'SCHEDULE', notifications })
}

// ── 単一タスクの通知をキャンセル ─────────────────────────
export function cancelNotification(taskId) {
  navigator.serviceWorker?.controller?.postMessage({ type: 'CANCEL', id: taskId })
}
