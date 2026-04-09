// ── Service Worker: バックグラウンド通知管理 ──────────────

const CACHE = 'family-task-v3'
const pending = new Map() // taskId → timeoutId

// ── インストール・アクティベート ──────────────────────────
self.addEventListener('install',  () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
))

// ── オフラインキャッシュ（基本ファイルのみ）─────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('supabase.co')) return

  // HTML は常にネットワーク優先（キャッシュ古くなり防止）
  const isHTML = event.request.headers.get('accept')?.includes('text/html')
  if (isHTML) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(event.request, clone))
        }
        return res
      }).catch(() => cached)
    })
  )
})

// ── 通知スケジュール管理 ──────────────────────────────────
function scheduleOne({ id, title, body, delay }) {
  if (pending.has(id)) clearTimeout(pending.get(id))
  if (delay <= 0 || delay > 24 * 60 * 60 * 1000) return // 24時間超は無視

  const tid = setTimeout(async () => {
    pending.delete(id)
    await self.registration.showNotification(title, {
      body,
      icon:    '/icon-192.png',
      badge:   '/icon-192.png',
      tag:     `task-${id}`,
      vibrate: [200, 100, 200],
      data:    { id },
    })
  }, delay)
  pending.set(id, tid)
}

// ── アプリからのメッセージ受信 ────────────────────────────
self.addEventListener('message', event => {
  const { type } = event.data ?? {}

  // 全タスクを再スケジュール
  if (type === 'SCHEDULE') {
    pending.forEach(tid => clearTimeout(tid))
    pending.clear()
    ;(event.data.notifications ?? []).forEach(scheduleOne)
  }

  // 単一タスクをキャンセル
  if (type === 'CANCEL') {
    if (pending.has(event.data.id)) {
      clearTimeout(pending.get(event.data.id))
      pending.delete(event.data.id)
    }
  }
})

// ── サーバーからのプッシュ受信 ────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? '⏰ タスクの時間です', {
      body:    data.body ?? '',
      icon:    '/icon-192.png',
      badge:   '/icon-192.png',
      vibrate: [200, 100, 200],
    })
  )
})

// ── 通知クリック → アプリを開く ───────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(list => {
      if (list.length > 0) return list[0].focus()
      return self.clients.openWindow('/')
    })
  )
})
