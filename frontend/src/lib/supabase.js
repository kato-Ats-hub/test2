const BASE_URL = import.meta.env.VITE_SUPABASE_URL
const KEY      = import.meta.env.VITE_SUPABASE_KEY

// ── Supabase REST ヘルパー ─────────────────────────────
async function sb(path, options = {}) {
  const { prefer, headers: extraHeaders, body, ...rest } = options
  const res = await fetch(`${BASE_URL}/rest/v1${path}`, {
    ...rest,
    headers: {
      apikey:          KEY,
      Authorization:   `Bearer ${KEY}`,
      'Content-Type':  'application/json',
      Prefer:          prefer ?? '',
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204 || res.status === 201 && res.headers.get('content-length') === '0') return null
  return res.json()
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
  if (rows?.code) throw new Error(rows.message ?? '登録に失敗しました')
  return rows?.[0] ?? null
}

export async function loginUser(userId, pin) {
  const pin_hash = await hashPin(pin)
  const rows = await sb(`/users?id=eq.${userId}&pin_hash=eq.${pin_hash}&select=id,name`)
  return rows?.[0] ?? null
}

// ── タスク操作 ─────────────────────────────────────────
export async function getTasks(userId) {
  return sb(`/tasks?user_id=eq.${userId}&order=created_at.desc&select=*`)
}

export async function createTask(userId, task) {
  const rows = await sb('/tasks?select=*', {
    method: 'POST',
    prefer: 'return=representation',
    body: { ...task, user_id: userId },
  })
  return rows?.[0] ?? null
}

export async function updateTask(taskId, userId, task) {
  const rows = await sb(`/tasks?id=eq.${taskId}&user_id=eq.${userId}&select=*`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: { ...task, updated_at: new Date().toISOString() },
  })
  return rows?.[0] ?? null
}

export async function deleteTask(taskId, userId) {
  return sb(`/tasks?id=eq.${taskId}&user_id=eq.${userId}`, { method: 'DELETE' })
}
