import { useState, useEffect, useCallback } from 'react'
import { getUsers, registerUser, loginUser, getTasks, createTask, updateTask, deleteTask, deleteMember, savePushSubscription } from './lib/supabase.js'
import { requestPermission, hasPermission, scheduleNotifications, cancelNotification, subscribeToPush } from './lib/notifications.js'
import { getDayType } from './lib/holidays.js'
import './App.css'

// ── 定数 ──────────────────────────────────────────────
const STATUS_LABELS  = { pending: '未着手', in_progress: '進行中', completed: '完了' }
const STATUS_COLORS  = { pending: 'status-pending', in_progress: 'status-progress', completed: 'status-done' }
const NOTIFY_OPTIONS = [
  { value: 0,     label: '期限時刻に通知' },
  { value: 30,    label: '30分前' },
  { value: 60,    label: '1時間前' },
  { value: 1440,  label: '1日前' },
  { value: 4320,  label: '3日前' },
  { value: 10080, label: '1週間前' },
]
const EMPTY_FORM = { title: '', description: '', status: 'pending', due_date: '', due_time: '', notify_before: 0, category: '' }

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
        <h1 className="login-title">📝 タスクアプリ</h1>

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
// カレンダー
// ══════════════════════════════════════════════════════
function CalendarView({ tasks, selectedDay, onSelectDay }) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const taskDays = new Set(tasks.filter(t => t.due_date).map(t => t.due_date))
  const todayStr  = today.toISOString().slice(0, 10)
  const firstDow  = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      return { d, dateStr }
    }),
  ]

  return (
    <div className="calendar">
      <div className="cal-nav">
        <button className="icon-btn" onClick={() => setViewDate(new Date(year, month - 1, 1))}>‹</button>
        <span className="cal-title">{year}年{month + 1}月</span>
        <button className="icon-btn" onClick={() => setViewDate(new Date(year, month + 1, 1))}>›</button>
      </div>
      <div className="cal-grid">
        {['日','月','火','水','木','金','土'].map(d => (
          <div key={d} className="cal-dow">{d}</div>
        ))}
        {cells.map((cell, i) => cell ? (
          <div
            key={i}
            className={['cal-day', `day-${getDayType(cell.dateStr)}`, taskDays.has(cell.dateStr) ? 'has-task' : '', cell.dateStr === todayStr ? 'today' : '', cell.dateStr === selectedDay ? 'cal-selected' : ''].filter(Boolean).join(' ')}
            onClick={() => onSelectDay(cell.dateStr === selectedDay ? null : cell.dateStr)}
          >
            <span>{cell.d}</span>
            {taskDays.has(cell.dateStr) && <span className="cal-dot" />}
          </div>
        ) : <div key={i} className="cal-empty" />)}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// タスクフォーム（モーダル）
// ══════════════════════════════════════════════════════
function TaskModal({ task, userId, onSave, onClose }) {
  const [form, setForm] = useState(task ? {
    title:         task.title,
    description:   task.description ?? '',
    status:        task.status,
    due_date:      task.due_date ?? '',
    due_time:      task.due_time ?? '',
    notify_before: task.notify_before ?? 0,
    category:      task.category ?? '',
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
        <div className="modal-header">
          <h2>{task ? '✏️ タスクを編集' : '➕ 新しいタスク'}</h2>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="modal-body">
            <label>タイトル <span className="req">*</span>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                required maxLength={255} placeholder="タスクのタイトル" />
            </label>
            <label>カテゴリ
              <input type="text" value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                maxLength={30} placeholder="仕事・買い物など（任意）" />
            </label>
            <label>メモ
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                rows={2} placeholder="詳細（任意）" />
            </label>
            <label>ステータス
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label>期限日
              <input type="date" value={form.due_date ?? ''} onChange={e => setForm({...form, due_date: e.target.value, due_time: '', notify_before: 0})} />
            </label>
            {form.due_date && (
              <label>期限時刻
                <input type="time" value={form.due_time ?? ''} onChange={e => setForm({...form, due_time: e.target.value, notify_before: 0})} />
              </label>
            )}
            {form.due_date && form.due_time && (
              <label>通知タイミング
                <select value={form.notify_before} onChange={e => setForm({...form, notify_before: Number(e.target.value)})}>
                  {NOTIFY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            )}
          </div>
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
  const [notifLoading, setNotifLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showNotifBanner, setShowNotifBanner] = useState(false)
  const [sortBy, setSortBy]             = useState('newest')
  const [filterCat, setFilterCat]       = useState('all')
  const [hideCompleted, setHideCompleted] = useState(false)
  const [calendarDay, setCalendarDay]   = useState(null)
  const [showCalendar, setShowCalendar] = useState(false)

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
    if (notifLoading) return
    setNotifLoading(true)
    try {
      // 通知API自体がない（iOSでPWAインストール前など）
      if (!('Notification' in window)) {
        alert('このブラウザは通知に対応していません。\niOSの場合はホーム画面に追加してからお試しください。')
        return
      }
      // すでに拒否されている場合
      if (Notification.permission === 'denied') {
        setShowNotifBanner(true)
        return
      }
      const ok = await requestPermission()
      setNotifEnabled(ok)
      if (!ok) {
        alert('通知が許可されませんでした。')
        return
      }
      // バックグラウンド通知用プッシュ登録
      const sub = await subscribeToPush()
      if (sub) await savePushSubscription(user.id, sub, new Date().getTimezoneOffset())
      if (tasks.length > 0) scheduleNotifications(tasks)
    } catch (e) {
      alert('通知の設定に失敗しました: ' + e.message)
    } finally {
      setNotifLoading(false)
    }
  }

  // ログイン済みで既に許可済みの場合もプッシュ登録を更新
  useEffect(() => {
    if (hasPermission()) {
      subscribeToPush().then(sub => {
        if (sub) savePushSubscription(user.id, sub, new Date().getTimezoneOffset())
      })
    }
  }, [user.id])

  // カテゴリ一覧（重複除去）
  const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))]

  // 選択中カテゴリが消えたらリセット
  useEffect(() => {
    if (filterCat !== 'all' && !categories.includes(filterCat)) setFilterCat('all')
  }, [categories.join(',')])

  // 表示タスク（絞り込み＋並び替え）
  const displayedTasks = tasks
    .filter(t => !hideCompleted || t.status !== 'completed')
    .filter(t => filterCat === 'all' || t.category === filterCat)
    .filter(t => !calendarDay || t.due_date === calendarDay)
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sortBy === 'due') {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      }
      if (sortBy === 'status') {
        const o = { pending: 0, in_progress: 1, completed: 2 }
        return o[a.status] - o[b.status]
      }
      return 0
    })

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
    if (!updated) return

    const newTasks = tasks.map(t => t.id === task.id ? updated : t)
    setTasks(newTasks)

    // 当日タスクがすべて完了になったか確認
    const todayStr = new Date().toISOString().slice(0, 10)
    const todayTasks = newTasks.filter(t => t.due_date === todayStr)
    if (
      todayTasks.length > 0 &&
      newStatus === 'completed' &&
      todayTasks.every(t => t.status === 'completed')
    ) {
      if (confirm('今日のタスクがすべて完了しました！\nタスクを削除しますか？')) {
        await Promise.all(todayTasks.map(t => deleteTask(t.id, user.id)))
        todayTasks.forEach(t => cancelNotification(t.id))
        setTasks(prev => prev.filter(t => t.due_date !== todayStr))
      }
    }
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
    <div className="app" onClick={() => setMenuOpen(false)}>
      <header className="app-header">
        <span className="header-name">{user.name}</span>
        <div className="header-actions">
          {!notifEnabled && (
            <button className="btn btn-notif" onClick={e => { e.stopPropagation(); enableNotifications() }} disabled={notifLoading}>
              {notifLoading ? '...' : '🔔'}
            </button>
          )}
          <button className="theme-btn" onClick={onToggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingTask(null); setShowModal(true) }}>
            ＋ 新規
          </button>
          {/* ハンバーガーメニュー */}
          <div className="menu-wrap">
            <button className="icon-btn menu-btn" onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}>
              ⋮
            </button>
            {menuOpen && (
              <div className="dropdown" onClick={e => e.stopPropagation()}>
                <button className="dropdown-item" onClick={() => { setMenuOpen(false); logout() }}>
                  ログアウト
                </button>
                <button className="dropdown-item danger" onClick={() => { setMenuOpen(false); handleDeleteAccount() }}>
                  アカウント削除
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showNotifBanner && (
        <div className="notif-banner">
          <div className="notif-banner-body">
            <span>🔕 通知がブロックされています</span>
            <p>ブラウザの設定から通知を許可してください。</p>
            <p className="notif-banner-hint">
              iOSの場合: Safari のアドレスバー横「AA」→「Webサイトの設定」→「通知」→「許可」<br />
              Androidの場合: アドレスバー横の🔒→「通知」→「許可」
            </p>
          </div>
          <button className="notif-banner-close" onClick={() => setShowNotifBanner(false)}>✕</button>
        </div>
      )}

      <main className="main">
        {/* カレンダートグル＋ソート */}
        <div className="toolbar">
          <button
            className={`btn ${showCalendar ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setShowCalendar(v => { if (v) setCalendarDay(null); return !v })}
          >📅 {calendarDay ? calendarDay.slice(5).replace('-', '/') : 'カレンダー'}</button>
          <button
            className={`btn btn-sm ${hideCompleted ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setHideCompleted(v => !v)}
          >{hideCompleted ? '完了を表示' : '完了を非表示'}</button>
          <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">新しい順</option>
            <option value="oldest">古い順</option>
            <option value="due">期限日順</option>
            <option value="status">ステータス順</option>
          </select>
        </div>

        {/* カレンダー */}
        {showCalendar && (
          <CalendarView tasks={tasks} selectedDay={calendarDay} onSelectDay={setCalendarDay} />
        )}

        {/* カテゴリフィルタータブ */}
        {categories.length > 0 && (
          <div className="cat-tabs">
            {['all', ...categories].map(cat => (
              <button
                key={cat}
                className={`cat-tab ${filterCat === cat ? 'active' : ''}`}
                onClick={() => setFilterCat(cat)}
              >{cat === 'all' ? 'すべて' : cat}</button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="loading-wrap"><div className="spinner" /></div>
        ) : displayedTasks.length === 0 ? (
          <div className="empty-state">
            <p className="empty-emoji">{tasks.length === 0 ? '📭' : '🔍'}</p>
            <p>{tasks.length === 0 ? 'タスクがありません' : '該当するタスクがありません'}</p>
            {tasks.length === 0 && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>最初のタスクを追加</button>
            )}
          </div>
        ) : (
          <ul className="task-list">
            {displayedTasks.map(task => (
              <li key={task.id} className="task-card">
                <div className="task-body">
                  <div className="task-badges">
                    <span className={`status-badge ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</span>
                    {task.category && <span className="cat-badge">{task.category}</span>}
                  </div>
                  <p className="task-title">{task.title}</p>
                  {task.description && <p className="task-desc">{task.description}</p>}
                  {task.due_date && <p className="task-due">📅 {task.due_date}{task.due_time && ` ${task.due_time.slice(0,5)}`}</p>}
                  {task.due_time && task.notify_before > 0 && (
                    <p className="task-time">🔔 {NOTIFY_OPTIONS.find(o => o.value === task.notify_before)?.label ?? ''}に通知</p>
                  )}
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
