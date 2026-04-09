const VAPID_PUBLIC_KEY = 'BOlxqrJmljowqfDmaAQ1f6J2uBzGAQE1ztKJoNtgHlxzfOIpLzgangQFE_iRMMc_WJD033Pk6qGQReGGOjMtpmY'

// メインスレッドタイマー（アプリが開いてる間の通知）
const timers = new Map()

export async function requestPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function hasPermission() {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}

// ── Web Push サブスクリプション取得（バックグラウンド通知用）──
function urlBase64ToUint8Array(base64) {
  const pad = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

export async function subscribeToPush() {
  if (!('PushManager' in window)) return null
  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }
    return sub.toJSON()
  } catch (e) {
    console.warn('Push subscription failed:', e)
    return null
  }
}

// ── アプリ開いてる間の通知（メインスレッドタイマー）──────
export function scheduleNotifications(tasks) {
  if (!hasPermission()) return

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

export function cancelNotification(taskId) {
  if (timers.has(taskId)) {
    clearTimeout(timers.get(taskId))
    timers.delete(taskId)
  }
}
