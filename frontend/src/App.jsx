import { useEffect, useMemo, useState } from 'react'
import { aiApi, authApi, leadApi } from './api'
import './App.css'

function App() {
  const [theme, setTheme] = useState('dark')
  const [screen, setScreen] = useState('landing')
  const [workspaceView, setWorkspaceView] = useState('pipeline')
  const [user, setUser] = useState(null)
  const [authError, setAuthError] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [busy, setBusy] = useState(false)
  const [leads, setLeads] = useState([])
  const [metrics, setMetrics] = useState({ total_value: 0, won_value: 0, conversion_rate: 0 })
  const [aiInsights, setAiInsights] = useState({
    summary: { lead_count: 0, average_win_probability: 0, expected_revenue: 0, forecast_gap: 0, pipeline_value: 0 },
    all: [],
  })
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiReply, setAiReply] = useState('')
  const [aiChatBusy, setAiChatBusy] = useState(false)
  const [aiChatError, setAiChatError] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState(null)
  const [logItems, setLogItems] = useState([])
  const [reminderItems, setReminderItems] = useState([])
  const [logForm, setLogForm] = useState({ channel: 'email', note: '' })
  const [reminderForm, setReminderForm] = useState({ task: '', due_at: '' })
  const [logsBusy, setLogsBusy] = useState(false)
  const [remindersBusy, setRemindersBusy] = useState(false)
  const [logsError, setLogsError] = useState('')
  const [remindersError, setRemindersError] = useState('')
  const [stageDrafts, setStageDrafts] = useState({})
  const [updatingLeadId, setUpdatingLeadId] = useState(null)
  const [stageUpdateError, setStageUpdateError] = useState('')

  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [signupForm, setSignupForm] = useState({ username: '', password: '', confirm_password: '' })
  const [leadForm, setLeadForm] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    source: 'Website',
    stage: 'new',
    estimated_value: '',
    assigned_to: '',
    last_touch: '',
    notes: '',
  })

  useEffect(() => {
    const savedTheme = localStorage.getItem('smartcrm-theme')
    const initialTheme = savedTheme || 'dark'
    setTheme(initialTheme)
    document.documentElement.setAttribute('data-theme', initialTheme)
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
    localStorage.setItem('smartcrm-theme', nextTheme)
  }

  const loadData = async () => {
    const [leadResponse, dashboardResponse, aiResponse] = await Promise.all([
      leadApi.list(),
      leadApi.dashboard(),
      aiApi.overview(),
    ])
    setLeads(leadResponse.items || [])
    setMetrics(dashboardResponse.metrics || { total_value: 0, won_value: 0, conversion_rate: 0 })
    setAiInsights(
      aiResponse || {
        summary: { lead_count: 0, average_win_probability: 0, expected_revenue: 0, forecast_gap: 0, pipeline_value: 0 },
        all: [],
      },
    )
  }

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await authApi.session()
        setUser(response.user)
        setScreen('workspace')
        await loadData()
      } catch {
        setScreen('landing')
      }
    }

    checkSession()
  }, [])

  const pipeline = useMemo(() => {
    const byStage = leads.reduce((acc, lead) => {
      acc[lead.stage] = (acc[lead.stage] || 0) + 1
      return acc
    }, {})

    return [
      { label: 'New', key: 'new', value: byStage.new || 0 },
      { label: 'Qualified', key: 'qualified', value: byStage.qualified || 0 },
      { label: 'Proposal', key: 'proposal', value: byStage.proposal || 0 },
      { label: 'Negotiation', key: 'negotiation', value: byStage.negotiation || 0 },
      { label: 'Won', key: 'won', value: byStage.won || 0 },
      { label: 'Lost', key: 'lost', value: byStage.lost || 0 },
    ]
  }, [leads])

  const totalValue = useMemo(() => leads.reduce((sum, lead) => sum + Number(lead.estimated_value), 0), [leads])
  const wonValue = useMemo(() => leads.filter((lead) => lead.stage === 'won').reduce((sum, lead) => sum + Number(lead.estimated_value), 0), [leads])
  const conversionRate = leads.length ? Math.round((pipeline.find((item) => item.key === 'won').value / leads.length) * 100) : 0
  const averageDealSize = leads.length ? totalValue / leads.length : 0
  const wonCount = pipeline.find((item) => item.key === 'won').value
  const lostCount = pipeline.find((item) => item.key === 'lost').value

  const sourceBreakdown = useMemo(() => {
    const grouped = leads.reduce((acc, lead) => {
      const source = (lead.source || 'Unknown').trim() || 'Unknown'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {})

    return Object.entries(grouped)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [leads])

  const selectedLead = useMemo(() => {
    if (!selectedLeadId) return null
    return leads.find((item) => item.id === selectedLeadId) || null
  }, [selectedLeadId, leads])

  useEffect(() => {
    const drafts = {}
    leads.forEach((lead) => {
      drafts[lead.id] = lead.stage
    })
    setStageDrafts(drafts)
    if (!selectedLeadId && leads.length) {
      setSelectedLeadId(leads[0].id)
    }
    if (selectedLeadId && !leads.find((item) => item.id === selectedLeadId) && leads.length) {
      setSelectedLeadId(leads[0].id)
    }
  }, [leads])

  const toMoney = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount)

  const openLogin = () => {
    setScreen('login')
    setAuthError('')
    setAuthMode('login')
  }

  const onLogin = async (event) => {
    event.preventDefault()
    setBusy(true)
    setAuthError('')
    try {
      const response = await authApi.login(loginForm)
      setUser(response.user)
      await loadData()
      setScreen('workspace')
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setBusy(false)
    }
  }

  const onSignup = async (event) => {
    event.preventDefault()
    setBusy(true)
    setAuthError('')
    try {
      const response = await authApi.signup(signupForm)
      setUser(response.user)
      await loadData()
      setScreen('workspace')
      setWorkspaceView('pipeline')
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setBusy(false)
    }
  }

  const onLogout = async () => {
    await authApi.logout()
    setUser(null)
    setLeads([])
    setScreen('landing')
    setWorkspaceView('pipeline')
    setLoginForm({ username: '', password: '' })
    setSignupForm({ username: '', password: '', confirm_password: '' })
  }

  const onCreateLead = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      await leadApi.create({
        ...leadForm,
        estimated_value: Number(leadForm.estimated_value || 0),
      })
      await loadData()
      setLeadForm({
        company_name: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        source: 'Website',
        stage: 'new',
        estimated_value: '',
        assigned_to: '',
        last_touch: '',
        notes: '',
      })
      setWorkspaceView('pipeline')
    } finally {
      setBusy(false)
    }
  }

  const openAiAssistant = () => {
    setWorkspaceView('ai')
  }

  const goHome = () => {
    setWorkspaceView('pipeline')
  }

  const onAskAi = async (event) => {
    event.preventDefault()
    const prompt = aiPrompt.trim()
    if (!prompt) return

    setAiChatBusy(true)
    setAiChatError('')
    try {
      const response = await aiApi.chat(prompt)
      setAiReply(response.reply || '')
    } catch (error) {
      setAiChatError(error.message || 'Could not fetch AI response')
    } finally {
      setAiChatBusy(false)
    }
  }

  const onUpdateLeadStage = async (leadId) => {
    const nextStage = stageDrafts[leadId]
    const currentLead = leads.find((item) => item.id === leadId)
    if (!currentLead || !nextStage || nextStage === currentLead.stage) {
      return
    }

    setStageUpdateError('')
    setUpdatingLeadId(leadId)
    try {
      // Preserve all existing fields when updating stage
      await leadApi.update(leadId, {
        ...currentLead,
        stage: nextStage,
      })
      await loadData()
    } catch (error) {
      setStageUpdateError(error.message || 'Could not update lead stage')
    } finally {
      setUpdatingLeadId(null)
    }
  }

  const formatDateTimeLocal = (isoValue) => {
    if (!isoValue) return ''
    const date = new Date(isoValue)
    if (Number.isNaN(date.getTime())) return ''
    const pad = (value) => String(value).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  const loadLogsForLead = async (leadId) => {
    if (!leadId) return
    setLogsBusy(true)
    setLogsError('')
    try {
      const response = await leadApi.listNotes(leadId)
      setLogItems(response.items || [])
    } catch (error) {
      setLogsError(error.message || 'Could not load communication logs')
    } finally {
      setLogsBusy(false)
    }
  }

  const loadRemindersForLead = async (leadId) => {
    if (!leadId) return
    setRemindersBusy(true)
    setRemindersError('')
    try {
      const response = await leadApi.listReminders(leadId)
      setReminderItems(response.items || [])
    } catch (error) {
      setRemindersError(error.message || 'Could not load reminders')
    } finally {
      setRemindersBusy(false)
    }
  }

  const openCommunicationLogs = async () => {
    setWorkspaceView('logs')
    if (selectedLeadId) {
      await loadLogsForLead(selectedLeadId)
    }
  }

  const openReminders = async () => {
    setWorkspaceView('reminders')
    if (selectedLeadId) {
      await loadRemindersForLead(selectedLeadId)
    }
  }

  const onChangeLeadContext = async (nextLeadId) => {
    const nextId = nextLeadId
    setSelectedLeadId(nextId)
    if (workspaceView === 'logs') {
      await loadLogsForLead(nextId)
    }
    if (workspaceView === 'reminders') {
      await loadRemindersForLead(nextId)
    }
  }

  const onCreateLog = async (event) => {
    event.preventDefault()
    if (!selectedLeadId) return

    setLogsBusy(true)
    setLogsError('')
    try {
      await leadApi.addNote(selectedLeadId, {
        channel: logForm.channel,
        note: logForm.note,
      })
      setLogForm((prev) => ({ ...prev, note: '' }))
      await loadLogsForLead(selectedLeadId)
    } catch (error) {
      setLogsError(error.message || 'Could not create communication log')
    } finally {
      setLogsBusy(false)
    }
  }

  const onCreateReminder = async (event) => {
    event.preventDefault()
    if (!selectedLeadId) return

    setRemindersBusy(true)
    setRemindersError('')
    try {
      await leadApi.createReminder(selectedLeadId, {
        task: reminderForm.task,
        due_at: new Date(reminderForm.due_at).toISOString(),
      })
      setReminderForm({ task: '', due_at: '' })
      await loadRemindersForLead(selectedLeadId)
    } catch (error) {
      setRemindersError(error.message || 'Could not create reminder')
    } finally {
      setRemindersBusy(false)
    }
  }

  const onToggleReminderDone = async (reminder) => {
    setRemindersBusy(true)
    setRemindersError('')
    try {
      await leadApi.updateReminder(reminder.id, { is_done: !reminder.is_done })
      await loadRemindersForLead(selectedLeadId)
    } catch (error) {
      setRemindersError(error.message || 'Could not update reminder')
    } finally {
      setRemindersBusy(false)
    }
  }

  const WorkspaceTopBar = () => (
    <header className="topbar">
      <div className="topbar-left">
        <button className="square-home" onClick={goHome} type="button" aria-label="Back to home">
          ←
        </button>
        <button className="brand-btn" onClick={goHome} type="button">
          <span className="brand-logo">S</span>
          <span>SmartCRM</span>
        </button>
      </div>

      <div className="topbar-actions">
        <button className="top-btn ask-ai-top" onClick={openAiAssistant} type="button">
          Ask AI
        </button>
        <button className="top-btn" onClick={() => setWorkspaceView('create')} type="button">
          Create Lead
        </button>
        <button className="top-btn" onClick={() => setWorkspaceView('reports')} type="button">
          Reports
        </button>
        <button className="top-btn" onClick={openReminders} type="button">
          Reminders
        </button>
        <button className="top-btn" onClick={openCommunicationLogs} type="button">
          Communication Logs
        </button>
        <button className="top-btn" onClick={onLogout} type="button">
          Log Out
        </button>
        <button className="theme-square" onClick={toggleTheme} type="button" aria-label="Toggle theme">
          {theme === 'light' ? '☾' : '☀'}
        </button>
      </div>
    </header>
  )

  if (screen === 'landing') {
    return (
      <main className="crm">
        <header className="hero">
          <div className="hero-top">
            <p className="kicker">Smart CRM</p>
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
          </div>
          <h1>Lead Management Workspace</h1>
          <p className="sub">
            Track leads, move pipeline stages, and monitor conversion with a focused sales workflow.
          </p>
          <div className="hero-actions">
            <button className="cta" onClick={openLogin}>
              Log In
            </button>
            <span className="hint">Open workspace to access AI pipeline, lead creation, and reports.</span>
          </div>
        </header>
      </main>
    )
  }

  if (screen === 'login') {
    return (
      <main className="crm auth-wrap">
        <section className="panel auth-card">
          <p className="kicker">Smart CRM Access</p>
          <h1>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="muted-text">Choose Login or Signup to access SmartCRM.</p>

          <div className="auth-mode-tabs">
            <button
              className={authMode === 'login' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => {
                setAuthMode('login')
                setAuthError('')
              }}
              type="button"
            >
              Login
            </button>
            <button
              className={authMode === 'signup' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => {
                setAuthMode('signup')
                setAuthError('')
              }}
              type="button"
            >
              Signup
            </button>
          </div>

          {authMode === 'login' ? (
            <form onSubmit={onLogin} className="form-grid">
              <label>
                Username
                <input
                  value={loginForm.username}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, username: event.target.value }))}
                  placeholder="e.g. admin"
                  required
                />
              </label>
              <label>
                Password
                <input
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Your password"
                  type="password"
                  required
                />
              </label>
              {authError && <p className="error">{authError}</p>}
              <div className="row-actions">
                <button className="cta" disabled={busy} type="submit">
                  {busy ? 'Signing in...' : 'Sign In'}
                </button>
                <button className="ghost" onClick={() => setScreen('landing')} type="button">
                  Back
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={onSignup} className="form-grid">
              <label>
                Username
                <input
                  value={signupForm.username}
                  onChange={(event) => setSignupForm((prev) => ({ ...prev, username: event.target.value }))}
                  placeholder="Choose username"
                  required
                />
              </label>
              <label>
                Password
                <input
                  value={signupForm.password}
                  onChange={(event) => setSignupForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="At least 8 characters"
                  type="password"
                  required
                />
              </label>
              <label className="full">
                Confirm Password
                <input
                  value={signupForm.confirm_password}
                  onChange={(event) => setSignupForm((prev) => ({ ...prev, confirm_password: event.target.value }))}
                  placeholder="Re-enter password"
                  type="password"
                  required
                />
              </label>
              {authError && <p className="error">{authError}</p>}
              <div className="row-actions">
                <button className="cta" disabled={busy} type="submit">
                  {busy ? 'Creating account...' : 'Create Account'}
                </button>
                <button className="ghost" onClick={() => setScreen('landing')} type="button">
                  Back
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    )
  }

  if (workspaceView === 'create') {
    return (
      <main className="crm">
        <WorkspaceTopBar />

        <header className="subpage-top panel">
          <h1>Create Lead</h1>
          <p className="muted-text">Add a new lead in a dedicated full-page form.</p>
        </header>

        <section className="panel lead-create-page">
          <form onSubmit={onCreateLead} className="form-grid">
            <label>
              Company Name
              <input
                required
                value={leadForm.company_name}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, company_name: event.target.value }))}
              />
            </label>
            <label>
              Contact Name
              <input
                required
                value={leadForm.contact_name}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, contact_name: event.target.value }))}
              />
            </label>
            <label>
              Contact Email
              <input
                type="email"
                value={leadForm.contact_email}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, contact_email: event.target.value }))}
              />
            </label>
            <label>
              Contact Phone
              <input
                value={leadForm.contact_phone}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, contact_phone: event.target.value }))}
              />
            </label>
            <label>
              Source
              <input
                value={leadForm.source}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, source: event.target.value }))}
              />
            </label>
            <label>
              Assigned To
              <input
                value={leadForm.assigned_to}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, assigned_to: event.target.value }))}
              />
            </label>
            <label>
              Stage
              <select
                value={leadForm.stage}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, stage: event.target.value }))}
              >
                <option value="new">New</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal</option>
                <option value="negotiation">Negotiation</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </label>
            <label>
              Estimated Value
              <input
                type="number"
                min="0"
                value={leadForm.estimated_value}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, estimated_value: event.target.value }))}
              />
            </label>
            <label>
              Last Touch
              <input
                type="date"
                value={leadForm.last_touch}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, last_touch: event.target.value }))}
              />
            </label>
            <label className="full">
              Notes
              <textarea
                rows="3"
                value={leadForm.notes}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>
            <button className="cta" disabled={busy} type="submit">
              {busy ? 'Saving...' : 'Create Lead'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  if (workspaceView === 'reports') {
    return (
      <main className="crm">
        <WorkspaceTopBar />

        <header className="subpage-top panel">
          <h1>Conversion Reports</h1>
          <p className="muted-text">A dedicated analytics page for conversion and source performance.</p>
        </header>

        <section className="metrics">
          <article>
            <h2>Conversion Rate</h2>
            <p>{metrics.conversion_rate || conversionRate}%</p>
          </article>
          <article>
            <h2>Won Leads</h2>
            <p>{wonCount}</p>
          </article>
          <article>
            <h2>Avg Deal Size</h2>
            <p>{toMoney(averageDealSize)}</p>
          </article>
        </section>

        <section className="panel">
          <h2>Conversion Reports Dashboard</h2>
          <div className="report-grid">
            <article className="report-card">
              <span>Expected Revenue</span>
              <strong>{toMoney(aiInsights.summary.expected_revenue || 0)}</strong>
            </article>
            <article className="report-card">
              <span>Forecast Gap</span>
              <strong>{toMoney(aiInsights.summary.forecast_gap || 0)}</strong>
            </article>
            <article className="report-card">
              <span>Closed Lost</span>
              <strong>{lostCount}</strong>
            </article>
          </div>
        </section>

        <section className="two-col">
          <article className="panel">
            <h2>Stage Distribution</h2>
            <ul className="analytic-list">
              {pipeline.map((item) => (
                <li key={`stage-${item.key}`}>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <progress max={Math.max(leads.length, 1)} value={item.value} />
                </li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <h2>Source Analytics</h2>
            <ul className="analytic-list">
              {sourceBreakdown.map((item) => (
                <li key={`source-${item.label}`}>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <progress max={Math.max(leads.length, 1)} value={item.value} />
                </li>
              ))}
              {!sourceBreakdown.length && <li className="muted-text">No source data yet.</li>}
            </ul>
          </article>
        </section>
      </main>
    )
  }

  if (workspaceView === 'reminders') {
    return (
      <main className="crm">
        <WorkspaceTopBar />

        <header className="subpage-top panel">
          <h1>Reminder Management</h1>
          <p className="muted-text">Create follow-up reminders per lead and mark tasks complete.</p>
        </header>

        <section className="panel">
          <div className="inline-context-row">
            <label>
              Lead
              <select
                value={selectedLeadId || ''}
                onChange={(event) => onChangeLeadContext(event.target.value)}
              >
                {leads.map((lead) => (
                  <option key={`reminder-lead-${lead.id}`} value={lead.id}>
                    {lead.company_name}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted-text">
              {selectedLead ? `Managing reminders for ${selectedLead.company_name}` : 'Create at least one lead first.'}
            </p>
          </div>

          <form className="inline-form" onSubmit={onCreateReminder}>
            <label>
              Task
              <input
                value={reminderForm.task}
                onChange={(event) => setReminderForm((prev) => ({ ...prev, task: event.target.value }))}
                placeholder="Follow up with procurement"
                required
              />
            </label>
            <label>
              Due At
              <input
                type="datetime-local"
                value={reminderForm.due_at}
                onChange={(event) => setReminderForm((prev) => ({ ...prev, due_at: event.target.value }))}
                required
              />
            </label>
            <button className="cta" type="submit" disabled={!selectedLeadId || remindersBusy}>
              {remindersBusy ? 'Saving...' : 'Add Reminder'}
            </button>
          </form>

          {remindersError && <p className="error">{remindersError}</p>}

          <ul className="reminder-list">
            {reminderItems.map((item) => (
              <li key={`rem-${item.id}`}>
                <div>
                  <strong>{item.task}</strong>
                  <button
                    type="button"
                    className={item.is_done ? 'ghost' : 'cta'}
                    onClick={() => onToggleReminderDone(item)}
                    disabled={remindersBusy}
                  >
                    {item.is_done ? 'Mark Pending' : 'Mark Done'}
                  </button>
                </div>
                <time>{new Date(item.due_at).toLocaleString()}</time>
              </li>
            ))}
            {!reminderItems.length && !remindersBusy && <li className="muted-text">No reminders for this lead yet.</li>}
          </ul>
        </section>
      </main>
    )
  }

  if (workspaceView === 'logs') {
    return (
      <main className="crm">
        <WorkspaceTopBar />

        <header className="subpage-top panel">
          <h1>Communication Logs</h1>
          <p className="muted-text">Track call, email, meeting, and chat updates by lead.</p>
        </header>

        <section className="panel">
          <div className="inline-context-row">
            <label>
              Lead
              <select
                value={selectedLeadId || ''}
                onChange={(event) => onChangeLeadContext(event.target.value)}
              >
                {leads.map((lead) => (
                  <option key={`log-lead-${lead.id}`} value={lead.id}>
                    {lead.company_name}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted-text">
              {selectedLead ? `Viewing communication history for ${selectedLead.company_name}` : 'Create at least one lead first.'}
            </p>
          </div>

          <form className="inline-form" onSubmit={onCreateLog}>
            <label>
              Channel
              <select
                value={logForm.channel}
                onChange={(event) => setLogForm((prev) => ({ ...prev, channel: event.target.value }))}
              >
                <option value="email">Email</option>
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
                <option value="chat">Chat</option>
              </select>
            </label>
            <label className="full-inline">
              Note
              <textarea
                rows="3"
                value={logForm.note}
                onChange={(event) => setLogForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="Shared revised pricing and requested feedback by Friday"
                required
              />
            </label>
            <button className="cta" type="submit" disabled={!selectedLeadId || logsBusy}>
              {logsBusy ? 'Saving...' : 'Add Log Entry'}
            </button>
          </form>

          {logsError && <p className="error">{logsError}</p>}

          <ul className="log-list">
            {logItems.map((item) => (
              <li key={`log-${item.id}`}>
                <div>
                  <strong>{item.channel.toUpperCase()}</strong>
                  <small>{new Date(item.created_at).toLocaleString()}</small>
                </div>
                <p>{item.note}</p>
                <span>Owner: {item.owner}</span>
              </li>
            ))}
            {!logItems.length && !logsBusy && <li className="muted-text">No communication logs for this lead yet.</li>}
          </ul>
        </section>
      </main>
    )
  }

  if (workspaceView === 'ai') {
    return (
      <main className="crm">
        <WorkspaceTopBar />

        <header className="subpage-top panel">
          <h1>Ask AI</h1>
          <p className="muted-text">Chat with your local CRM assistant in a dedicated page.</p>
        </header>

        <section className="panel">
          <h2>Local AI Assistant (Ollama)</h2>
          <form className="ai-chat-form" onSubmit={onAskAi}>
            <label>
              Ask for help with follow-up strategy, risk review, or message drafting
              <textarea
                rows="4"
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                placeholder="Example: Draft a follow-up email for high-value leads stuck in negotiation"
              />
            </label>
            <button className="cta" disabled={aiChatBusy} type="submit">
              {aiChatBusy ? 'Thinking...' : 'Ask Local AI'}
            </button>
          </form>
          {aiChatError && <p className="error">{aiChatError}</p>}
          {aiReply && (
            <article className="ai-reply">
              <h3>Assistant Reply</h3>
              <p>{aiReply}</p>
            </article>
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="crm">
      <WorkspaceTopBar />

      <header className="hero">
        <p className="kicker">Workspace Home</p>
        <h1>Lead Tracking and Follow-Up Workspace</h1>
        <p className="sub">Simple navigation for pipeline, lead creation, conversion analytics, and AI chat.</p>
      </header>

      <section className="action-hub">
        <button
          className={workspaceView === 'create' ? 'hub-btn active' : 'hub-btn'}
          onClick={() => setWorkspaceView('create')}
          type="button"
        >
          + Create Lead
        </button>
        <button
          className={workspaceView === 'reports' ? 'hub-btn active' : 'hub-btn'}
          onClick={() => setWorkspaceView('reports')}
          type="button"
        >
          Conversion Reports
        </button>
        <button
          className={workspaceView === 'reminders' ? 'hub-btn active' : 'hub-btn'}
          onClick={openReminders}
          type="button"
        >
          Reminder Management
        </button>
        <button
          className={workspaceView === 'logs' ? 'hub-btn active' : 'hub-btn'}
          onClick={openCommunicationLogs}
          type="button"
        >
          Communication Logs
        </button>
      </section>

      {workspaceView === 'pipeline' && (
        <>
          <section className="panel">
            <h2>AI Lead Pipeline</h2>
            <div className="ai-summary-grid">
              <article className="ai-chip">
                <span>Expected Revenue</span>
                <strong>{toMoney(aiInsights.summary.expected_revenue || 0)}</strong>
              </article>
              <article className="ai-chip">
                <span>Avg Win Probability</span>
                <strong>{aiInsights.summary.average_win_probability || 0}%</strong>
              </article>
              <article className="ai-chip">
                <span>Pipeline Value</span>
                <strong>{toMoney(aiInsights.summary.pipeline_value || metrics.total_value || totalValue)}</strong>
              </article>
            </div>
            <div className="ai-pipeline-grid">
              {(aiInsights.all || []).slice(0, 8).map((item) => (
                <article key={`ai-${item.lead_id}`} className="ai-pipeline-card">
                  <div>
                    <strong>{item.company_name}</strong>
                    <span className={`risk-pill ${item.risk_level}`}>{item.risk_level}</span>
                  </div>
                  <p>Win chance: {item.win_probability}%</p>
                  <small>{item.next_action}</small>
                </article>
              ))}
              {!aiInsights.all?.length && <p className="muted-text">Create leads to see AI pipeline insights.</p>}
            </div>
          </section>

          <section className="panel">
            <h2>Lead Pipeline</h2>
            <div className="pipeline-grid">
              {pipeline.map((item) => (
                <div key={item.label} className="pipeline-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Leads</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Stage</th>
                    <th>Value</th>
                    <th>Last Touch</th>
                    <th>Move Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td>
                        <strong>{lead.company_name}</strong>
                        <small>#{lead.id}</small>
                      </td>
                      <td>{lead.contact_name}</td>
                      <td>
                        <span className={`tag ${lead.stage}`}>{lead.stage}</span>
                      </td>
                      <td>{toMoney(lead.estimated_value)}</td>
                      <td>{lead.last_touch || '-'}</td>
                      <td>
                        <div className="stage-actions">
                          <select
                            className="stage-select"
                            value={stageDrafts[lead.id] || lead.stage}
                            onChange={(event) =>
                              setStageDrafts((prev) => ({
                                ...prev,
                                [lead.id]: event.target.value,
                              }))
                            }
                            aria-label={`Change stage for ${lead.company_name}`}
                          >
                            <option value="new">New</option>
                            <option value="qualified">Qualified</option>
                            <option value="proposal">Proposal</option>
                            <option value="negotiation">Negotiation</option>
                            <option value="won">Won</option>
                            <option value="lost">Lost</option>
                          </select>
                          <button
                            type="button"
                            className="stage-save"
                            onClick={() => onUpdateLeadStage(lead.id)}
                            disabled={
                              updatingLeadId === lead.id ||
                              (stageDrafts[lead.id] || lead.stage) === lead.stage
                            }
                          >
                            {updatingLeadId === lead.id ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {stageUpdateError && <p className="error">{stageUpdateError}</p>}
          </section>

        </>
      )}
    </main>
  )
}

export default App
