const BASE_URL = import.meta.env.VITE_SUPABASE_URL
const KEY      = import.meta.env.VITE_SUPABASE_KEY

// ── Supabase REST ヘルパー ─────────────────────────────
async function sb(path, options = {}) {
  const { prefer, headers: extraHeaders, body, ...rest } = options

  const headers = {
    apikey:         KEY,
    Authorization:  `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    ...extraHeaders,
  }
  if (prefer) headers['Prefer'] = prefer

  const res = await fetch(`${BASE_URL}/rest/v1${path}`, {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  if (!text.trim()) {
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return null
  }

  const data = JSON.parse(text)

  // 非2xx はすべてエラーとしてスロー（Supabase のエラー形式を問わず）
  if (!res.ok) {
    throw new Error(data?.message ?? data?.error_description ?? `HTTP ${res.status}: ${text}`)
  }

  return data
}

// ── PINハッシュ（WebCrypto / SHA-256）─────────────────
async function hashPin(pin) {
  const data = new TextEncoder().encode('family-task:' + pin)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── ユーザー操作 ───────────────────────────────────────
export async function getUsers() {
  const rows = await sb('/members?select=id,name&order=created_at')
  return Array.isArray(rows) ? rows : []
}

export async function registerUser(name, pin) {
  const pin_hash = await hashPin(pin)
  // まず INSERT（レスポンスボディは使わない）
  await sb('/members', {
    method: 'POST',
    body: { name, pin_hash },
  })
  // 挿入したユーザーを GET で取得
  const rows = await sb(`/members?name=eq.${encodeURIComponent(name)}&select=id,name`)
  return Array.isArray(rows) ? rows[0] ?? null : null
}

export async function loginUser(userId, pin) {
  const pin_hash = await hashPin(pin)
  const rows = await sb(`/members?id=eq.${userId}&pin_hash=eq.${pin_hash}&select=id,name`)
  return Array.isArray(rows) ? rows[0] ?? null : null
}

// ── タスク操作 ─────────────────────────────────────────
export async function getTasks(userId) {
  const rows = await sb(`/tasks?user_id=eq.${userId}&order=created_at.desc&select=*`)
  return Array.isArray(rows) ? rows : []
}

export async function createTask(userId, task) {
  // 空文字を null に変換してから INSERT
  const body = Object.fromEntries(
    Object.entries({ ...task, user_id: userId })
      .map(([k, v]) => [k, v === '' ? null : v])
  )
  await sb('/tasks', { method: 'POST', body })
  // 最新のタスクを GET で取得
  const rows = await sb(`/tasks?user_id=eq.${userId}&order=created_at.desc&limit=1&select=*`)
  return Array.isArray(rows) ? rows[0] ?? null : null
}

export async function updateTask(taskId, userId, task) {
  const body = Object.fromEntries(
    Object.entries({ ...task, updated_at: new Date().toISOString() })
      .map(([k, v]) => [k, v === '' ? null : v])
  )
  await sb(`/tasks?id=eq.${taskId}&user_id=eq.${userId}`, { method: 'PATCH', body })
  // 更新後のタスクを GET で取得
  const rows = await sb(`/tasks?id=eq.${taskId}&select=*`)
  return Array.isArray(rows) ? rows[0] ?? null : null
}

export async function deleteTask(taskId, userId) {
  return sb(`/tasks?id=eq.${taskId}&user_id=eq.${userId}`, { method: 'DELETE' })
}
