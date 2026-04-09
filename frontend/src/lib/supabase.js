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
  if (!text.trim()) return null

  const data = JSON.parse(text)

  // Supabase エラーレスポンス（code/message 形式）をスロー
  if (data?.code && !Array.isArray(data)) {
    throw new Error(data.message ?? 'Supabase エラー')
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
  return sb('/users?select=id,name&order=created_at')
}

export async function registerUser(name, pin) {
  const pin_hash = await hashPin(pin)
  const rows = await sb('/users?select=id,name', {
    method: 'POST',
    prefer: 'return=representation',
    body: { name, pin_hash },
  })
  return Array.isArray(rows) ? rows[0] : null
}

export async function loginUser(userId, pin) {
  const pin_hash = await hashPin(pin)
  const rows = await sb(`/users?id=eq.${userId}&pin_hash=eq.${pin_hash}&select=id,name`)
  return Array.isArray(rows) ? rows[0] ?? null : null
}

// ── タスク操作 ─────────────────────────────────────────
export async function getTasks(userId) {
  const rows = await sb(`/tasks?user_id=eq.${userId}&order=created_at.desc&select=*`)
  return Array.isArray(rows) ? rows : []
}

export async function createTask(userId, task) {
  const rows = await sb('/tasks?select=*', {
    method: 'POST',
    prefer: 'return=representation',
    body: { ...task, user_id: userId },
  })
  return Array.isArray(rows) ? rows[0] : null
}

export async function updateTask(taskId, userId, task) {
  const rows = await sb(`/tasks?id=eq.${taskId}&user_id=eq.${userId}&select=*`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: { ...task, updated_at: new Date().toISOString() },
  })
  return Array.isArray(rows) ? rows[0] : null
}

export async function deleteTask(taskId, userId) {
  return sb(`/tasks?id=eq.${taskId}&user_id=eq.${userId}`, { method: 'DELETE' })
}
