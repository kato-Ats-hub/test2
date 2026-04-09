import { useState, useEffect, useCallback } from 'react'
import { getUsers, registerUser, loginUser, getTasks, createTask, updateTask, deleteTask, deleteMember } from './lib/supabase.js'
import { requestPermission, hasPermission, scheduleNotifications, cancelNotification } from './lib/notifications.js'
import './App.css'

// ── 定数 ──────────────────────────────────────────────
const STATUS_LABELS = { pending: '未着手', in_progress: '進行中', completed: '完了' }
const STATUS_COLORS = { pending: 'status-pending', in_progress: 'status-progress', completed: 'status-done' }
const EMPTY_FORM = { title: '', description: '', status: 'pending', due_date: '', due_time: '' }

// ── PIN入力欄（キーボード／テンキー） ─────────────────
function PinInput({ value, onChange, onComplete, placeholder = '••••', disabled, autoFocus = false }) {
  return (
    <input
      className="pin-input"
      type="password"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={4}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      onChange={e => {
        const v = e.target.value.replace(/\D/g, '').slice(0, 4)
        onChange(v)
        if (v.length === 4 && onComplete) onComplete(v)
      }}
    />
  )
}

// ══════════════════════════════════════════════════════
// 新規登録画面
// ══════════════════════════════════════════════════════
function RegisterScreen({ onLogin, onCancel }) {
  const [step, setStep]       = useState('name')
  const [name, setName]       = useState('')
  const [pin, setPin]         = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  function handlePinComplete(v) {
    setPin(v)
    setStep('confirm')
  }

  function handleConfirmComplete(v) {
    setConfirm(v)
    if (v !== pin) {
      setError('PINが一致しません。もう一度試してください')
      setPin(''); setConfirm(''); setStep('pin')
    } else {
      submit()
    }
  }

  async function submit() {
    setLoading(true); setError('')
    try {
      const user = await registerUser(name.trim(), pin)
      if (!user) throw new Error('登録に失敗しました')
      localStorage.setItem('user', JSON.stringify(user))
      onLogin(user)
    } catch (e) {
      setError(e.message ?? '登録に失敗しました')
      setPin(''); setConfirm(''); setStep('name')
    } finally { setLoading(false) }
  }

  return (
    <div className="pin-area">
      <button className="back-link" onClick={onCancel}>← もどる</button>
      <div className="pin-user"><span>新規登録</span></div>

      {step === 'name' && (
        <div className="reg-name-wrap">
          <input
            className="reg-name-input"
            type="text"
            placeholder="名前を入力してください"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && name.trim() && (setError(''), setStep('pin'))}
          />
          {error && <p className="pin-error">{error}</p>}
          <button
            className="btn btn-primary"
            style={{ marginTop: 12, width: '100%' }}
            disabled={!name.trim()}
            onClick={() => { setError(''); setStep('pin') }}
          >次へ →</button>
        </div>
      )}

      {step === 'pin' && (
        <>
          <p className="pin-step-label">4桁のPINを決めてください</p>
          {error && <p className="pin-error">{error}</p>}
          <PinInput value={pin} onChange={setPin} onComplete={handlePinComplete} disabled={loading} autoFocus />
        </>
      )}

      {step === 'confirm' && (
        <>
          <p className="pin-step-label">もう一度PINを入力してください</p>
          {error && <p className="pin-error">{error}</p>}
          <PinInput value={confirm} onChange={setConfirm} onComplete={handleConfirmComplete} disabled={loading} autoFocus />
        </>
      )}

      {loading && <p className="pin-loading">登録中...</p>}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// ログイン画面
// ══════════════════════════════════════════════════════
function LoginScreen({ onLogin, theme, onToggleTheme }) {
  const [members, setMembers] = useState([])
  const [mode, setMode]       = useState('select')
  const [selected, setSelected] = useState(null)
  const [pin, setPin]         = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getUsers().then(data => setMembers(data ?? []))
  }, [])

  function selectMember(m) { setSelected(m); setPin(''); setError(''); setMode('login') }
  function backToSelect()  { setMode('select'); setSelected(null); setPin(''); setError('') }

  async function submitLogin(pinValue) {
    setLoading(true); setError('')
    try {
      const user = await loginUser(selected.id, pinValue)
      if (!user) { setError('PINが違います'); setPin(''); return }
      localStorage.setItem('user', JSON.stringify(user))
      onLogin(user)
    } finally { setLoading(false) }
  }

  function handleRegistered(user) {
    setMembers(prev => [...prev, { id: user.id, name: user.name }])
    onLogin(user)
  }

  return (
    <div className="login-bg">
      <button className="theme-btn login-theme-btn" onClick={onToggleTheme} title="テーマ切替">
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="login-card">
        <h1 className="login-title">👨‍👩‍👧‍👦 家族タスク</h1>

        {mode === 'select' && (
          <>
            <p className="login-sub">だれですか？</p>
            <div className="member-grid">
              {members.map(m => (
                <button key={m.id} className="member-btn" onClick={() => selectMember(m)}>
                  <span className="member-name">{m.name}</span>
                </button>
              ))}
            </div>
            <button className="btn-register-link" onClick={() => setMode('register')}>
              ＋ 新しくアカウントを作る
            </button>
          </>
        )}

        {mode === 'login' && (
          <div className="pin-area">
            <button className="back-link" onClick={backToSelect}>← もどる</button>
            <div className="pin-user"><span>{selected.name}</span></div>
            {error && <p className="pin-error">{error}</p>}
            <PinInput value={pin} onChange={setPin} onComplete={submitLogin} disabled={loading} autoFocus />
            {loading && <p className="pin-loading">確認中...</p>}
          </div>
        )}

        {mode === 'register' && (
          <RegisterScreen onLogin={handleRegistered} onCancel={backToSelect} />
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// タスクフォーム（モーダル）
// ══════════════════════════════════════════════════════
function TaskModal({ task, userId, onSave, onClose }) {
  const [form, setForm] = useState(task ? {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    due_date: task.due_date ?? '',
    due_time: task.due_time ?? '',
  } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true)
    try {
      const saved = task
        ? await updateTask(task.id, userId, form)
        : await createTask(userId, form)
      if (!saved) throw new Error('保存に失敗しました')
      onSave(saved, !!task)
    } catch (e) { alert(e.message)
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
            <input type="date" value={form.due_date ?? ''} onChange={e => setForm({...form, due_date: e.target.value})} />
          </label>
          <label>
            通知時刻 <span className="label-hint">（設定するとその時間に通知）</span>
            <input type="time" value={form.due_time ?? ''} onChange={e => setForm({...form, due_time: e.target.value})} />
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
function MainApp({ user, onLogout, theme, onToggleTheme }) {
  const [tasks, setTasks]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [notifEnabled, setNotifEnabled] = useState(hasPermission)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTasks(user.id)
      setTasks(data ?? [])
    } finally { setLoading(false) }
  }, [user.id])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // タスク読み込み後に通知をスケジュール
  useEffect(() => {
    if (tasks.length > 0) scheduleNotifications(tasks)
  }, [tasks])

  async function enableNotifications() {
    const ok = await requestPermission()
    setNotifEnabled(ok)
    if (ok && tasks.length > 0) scheduleNotifications(tasks)
  }

  function handleSave(saved, isEdit) {
    if (isEdit) setTasks(prev => prev.map(t => t.id === saved.id ? saved : t))
    else setTasks(prev => [saved, ...prev])
    setShowModal(false); setEditingTask(null)
  }

  async function handleDelete(task) {
    if (!confirm(`「${task.title}」を削除しますか？`)) return
    await deleteTask(task.id, user.id)
    cancelNotification(task.id)
    setTasks(prev => prev.filter(t => t.id !== task.id))
  }

  async function handleStatusChange(task, newStatus) {
    const updated = await updateTask(task.id, user.id, { ...task, status: newStatus })
    if (updated) setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
  }

  function logout() {
    localStorage.removeItem('user')
    onLogout()
  }

  async function handleDeleteAccount() {
    if (!confirm(`「${user.name}」のアカウントとすべてのタスクを削除しますか？\nこの操作は元に戻せません。`)) return
    try {
      await deleteMember(user.id)
      localStorage.removeItem('user')
      onLogout()
    } catch (e) {
      alert('削除に失敗しました: ' + e.message)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-user">
          <span className="header-name">{user.name}</span>
        </div>
        <div className="header-actions">
          {!notifEnabled && (
            <button className="btn btn-notif" onClick={enableNotifications} title="通知を有効にする">
              🔔
            </button>
          )}
          <button className="theme-btn" onClick={onToggleTheme} title="テーマ切替">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingTask(null); setShowModal(true) }}>
            ＋ 新規
          </button>
          <button className="btn btn-ghost" onClick={logout}>ログアウト</button>
          <button className="btn btn-danger" onClick={handleDeleteAccount}>アカウント削除</button>
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
                  {task.due_date && <p className="task-due">📅 {task.due_date}</p>}
                  {task.due_time && <p className="task-time">🔔 {task.due_time.slice(0,5)}</p>}
                </div>
                <div className="task-controls">
                  <select className="status-select" value={task.status}
                    onChange={e => handleStatusChange(task, e.target.value)}>
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
          userId={user.id}
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
  const [user, setUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') ?? 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() { setTheme(t => t === 'light' ? 'dark' : 'light') }

  if (!user) {
    return <LoginScreen onLogin={setUser} theme={theme} onToggleTheme={toggleTheme} />
  }
  return <MainApp user={user} onLogout={() => setUser(null)} theme={theme} onToggleTheme={toggleTheme} />
}
