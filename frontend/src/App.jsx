import { useState, useEffect, useCallback } from 'react'
import './App.css'

// ── 定数 ──────────────────────────────────────────────
const STATUS_LABELS = { pending: '未着手', in_progress: '進行中', completed: '完了' }
const STATUS_COLORS = { pending: 'status-pending', in_progress: 'status-progress', completed: 'status-done' }
const EMPTY_FORM = { title: '', description: '', status: 'pending', due_date: '' }

// ── API ヘルパー ────────────────────────────────────────
function apiFetch(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(path, { ...options, headers })
}

// ── アバター絵文字 ─────────────────────────────────────
const AVATARS = ['👨', '👩', '👦', '👧', '🧑', '👴', '👵']
function getAvatar(index) { return AVATARS[index % AVATARS.length] }

// ══════════════════════════════════════════════════════
// ログイン画面
// ══════════════════════════════════════════════════════
function LoginScreen({ onLogin, theme, onToggleTheme }) {
  const [members, setMembers] = useState([])
  const [selected, setSelected] = useState(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    apiFetch('/api/users').then(r => r.json()).then(setMembers)
  }, [])

  function pressDigit(d) {
    if (pin.length < 4) setPin(p => p + d)
  }
  function backspace() { setPin(p => p.slice(0, -1)) }
  function clear() { setPin(''); setError('') }

  async function submit() {
    if (pin.length !== 4) { setError('4桁のPINを入力してください'); return }
    setLoading(true); setError('')
    try {
      const res = await apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ user_id: selected.id, pin }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? 'ログイン失敗'); setPin(''); return }
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      onLogin(data.token, data.user)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (pin.length === 4) submit()
  }, [pin])

  return (
    <div className="login-bg">
      <button className="theme-btn login-theme-btn" onClick={onToggleTheme} title="テーマ切替">
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="login-card">
        <h1 className="login-title">👨‍👩‍👧‍👦 家族タスク</h1>
        <p className="login-sub">だれですか？</p>

        {!selected ? (
          <div className="member-grid">
            {members.map((m, i) => (
              <button key={m.id} className="member-btn" onClick={() => { setSelected(m); setPin(''); setError('') }}>
                <span className="member-avatar">{getAvatar(i)}</span>
                <span className="member-name">{m.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="pin-area">
            <button className="back-link" onClick={() => { setSelected(null); setPin(''); setError('') }}>
              ← もどる
            </button>
            <div className="pin-user">
              <span className="pin-avatar">{getAvatar(members.findIndex(m => m.id === selected.id))}</span>
              <span>{selected.name}</span>
            </div>
            <div className="pin-dots">
              {[0, 1, 2, 3].map(i => (
                <span key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
              ))}
            </div>
            {error && <p className="pin-error">{error}</p>}
            <div className="numpad">
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
                <button
                  key={i}
                  className={`num-btn ${d === '' ? 'invisible' : ''}`}
                  onClick={() => d === '⌫' ? backspace() : pressDigit(d)}
                  disabled={loading || d === ''}
                >
                  {d}
                </button>
              ))}
            </div>
            {loading && <p className="pin-loading">確認中...</p>}
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// タスクフォーム（モーダル）
// ══════════════════════════════════════════════════════
function TaskModal({ task, token, onSave, onClose }) {
  const [form, setForm] = useState(task ? {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    due_date: task.due_date ? task.due_date.slice(0, 10) : '',
  } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true)
    try {
      const url = task ? `/api/tasks/${task.id}` : '/api/tasks'
      const res = await apiFetch(url, { method: task ? 'PUT' : 'POST', body: JSON.stringify(form) }, token)
      if (!res.ok) { const d = await res.json(); alert(d.message ?? '保存失敗'); return }
      const saved = await res.json()
      onSave(saved, !!task)
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{task ? '✏️ タスクを編集' : '➕ 新しいタスク'}</h2>
        <form onSubmit={handleSubmit}>
          <label>タイトル <span className="req">*</span>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              required maxLength={255} placeholder="タスクのタイトル" />
          </label>
          <label>メモ
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              rows={3} placeholder="詳細（任意）" />
          </label>
          <label>ステータス
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label>期限日
            <input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
          </label>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>キャンセル</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '保存中...' : '💾 保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// メインアプリ
// ══════════════════════════════════════════════════════
function MainApp({ token, user, onLogout, theme, onToggleTheme }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/tasks', {}, token)
      if (res.ok) setTasks(await res.json())
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  function handleSave(saved, isEdit) {
    if (isEdit) setTasks(prev => prev.map(t => t.id === saved.id ? saved : t))
    else setTasks(prev => [saved, ...prev])
    setShowModal(false); setEditingTask(null)
  }

  async function handleDelete(task) {
    if (!confirm(`「${task.title}」を削除しますか？`)) return
    const res = await apiFetch(`/api/tasks/${task.id}`, { method: 'DELETE' }, token)
    if (res.ok) setTasks(prev => prev.filter(t => t.id !== task.id))
    else alert('削除に失敗しました')
  }

  async function handleStatusChange(task, newStatus) {
    const res = await apiFetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...task, status: newStatus }),
    }, token)
    if (res.ok) { const updated = await res.json(); setTasks(prev => prev.map(t => t.id === task.id ? updated : t)) }
  }

  async function logout() {
    await apiFetch('/api/logout', { method: 'POST' }, token)
    localStorage.removeItem('token'); localStorage.removeItem('user')
    onLogout()
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-user">
          <span className="header-avatar">{user.name[0]}</span>
          <span className="header-name">{user.name}</span>
        </div>
        <div className="header-actions">
          <button className="theme-btn" onClick={onToggleTheme} title="テーマ切替">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingTask(null); setShowModal(true) }}>
            ＋ 新規
          </button>
          <button className="btn btn-ghost" onClick={logout}>ログアウト</button>
        </div>
      </header>

      <main className="main">
        {loading ? (
          <div className="loading-wrap"><div className="spinner" /></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <p className="empty-emoji">📭</p>
            <p>タスクがありません</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>最初のタスクを追加</button>
          </div>
        ) : (
          <ul className="task-list">
            {tasks.map(task => (
              <li key={task.id} className="task-card">
                <div className="task-body">
                  <span className={`status-badge ${STATUS_COLORS[task.status]}`}>
                    {STATUS_LABELS[task.status]}
                  </span>
                  <p className="task-title">{task.title}</p>
                  {task.description && <p className="task-desc">{task.description}</p>}
                  {task.due_date && (
                    <p className="task-due">📅 {task.due_date.slice(0, 10)}</p>
                  )}
                </div>
                <div className="task-controls">
                  <select
                    className="status-select"
                    value={task.status}
                    onChange={e => handleStatusChange(task, e.target.value)}
                  >
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <button className="icon-btn edit-btn" onClick={() => { setEditingTask(task); setShowModal(true) }}>✏️</button>
                  <button className="icon-btn del-btn" onClick={() => handleDelete(task)}>🗑️</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {showModal && (
        <TaskModal
          task={editingTask}
          token={token}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingTask(null) }}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// ルート
// ══════════════════════════════════════════════════════
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') ?? 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function handleLogin(t, u) { setToken(t); setUser(u) }
  function handleLogout()    { setToken(null); setUser(null) }
  function toggleTheme()     { setTheme(t => t === 'light' ? 'dark' : 'light') }

  if (!token || !user) {
    return <LoginScreen onLogin={handleLogin} theme={theme} onToggleTheme={toggleTheme} />
  }
  return <MainApp token={token} user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />
}
