// メインスレッドでタイマー管理（SWのsetTimeoutはSWが停止すると消えるため）
const timers = new Map() // taskId → timeoutId

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

  // 既存タイマーをすべてリセット
  timers.forEach(id => clearTimeout(id))
  timers.clear()

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  tasks
    .filter(t => t.due_time && t.status !== 'completed')
    .forEach(t => {
      const dateStr = t.due_date ?? todayStr
      const effectiveDate = dateStr < todayStr ? todayStr : dateStr
      const notifyAt = new Date(`${effectiveDate}T${t.due_time}`)
      const delay = notifyAt - now

      if (delay <= 0 || delay > 24 * 60 * 60 * 1000) return

      const id = setTimeout(() => {
        timers.delete(t.id)
        if (Notification.permission !== 'granted') return
        new Notification('⏰ タスクの時間です', {
          body:    t.title,
          icon:    '/icon-192.png',
          badge:   '/icon-192.png',
          tag:     `task-${t.id}`,
          vibrate: [200, 100, 200],
        })
      }, delay)

      timers.set(t.id, id)
    })
}

// ── 単一タスクの通知をキャンセル ─────────────────────────
export function cancelNotification(taskId) {
  if (timers.has(taskId)) {
    clearTimeout(timers.get(taskId))
    timers.delete(taskId)
  }
}
