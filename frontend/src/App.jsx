import { useEffect, useMemo, useState } from 'react'
import { aiApi, authApi, leadApi } from './api'
import './App.css'
import LandingScreen from './components/LandingScreen'
import AuthScreen from './components/AuthScreen'
import CreateLeadPage from './components/CreateLeadPage'
import ReportsPage from './components/ReportsPage'
import RemindersPage from './components/RemindersPage'
import LogsPage from './components/LogsPage'
import AiPage from './components/AiPage'
import PipelinePage from './components/PipelinePage'

const defaultMetrics = { total_value: 0, won_value: 0, conversion_rate: 0 }
const defaultAiInsights = {
  summary: {
    lead_count: 0,
    average_win_probability: 0,
    expected_revenue: 0,
    forecast_gap: 0,
    pipeline_value: 0,
  },
  all: [],
}

const defaultLeadForm = {
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
}

function App() {
  const [theme, setTheme] = useState('dark')
  const [screen, setScreen] = useState('landing')
  const [workspaceView, setWorkspaceView] = useState('pipeline')
  const [user, setUser] = useState(null)
  const [authError, setAuthError] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [busy, setBusy] = useState(false)
  const [leads, setLeads] = useState([])
  const [metrics, setMetrics] = useState(defaultMetrics)
  const [aiInsights, setAiInsights] = useState(defaultAiInsights)
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
  const [leadForm, setLeadForm] = useState(defaultLeadForm)

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
    setMetrics(dashboardResponse.metrics || defaultMetrics)
    setAiInsights(aiResponse || defaultAiInsights)
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
  const wonValue = useMemo(
    () => leads.filter((lead) => lead.stage === 'won').reduce((sum, lead) => sum + Number(lead.estimated_value), 0),
    [leads],
  )
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
  }, [leads, selectedLeadId])

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
      setLeadForm(defaultLeadForm)
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
      await leadApi.update(leadId, { stage: nextStage })
      await loadData()
    } catch (error) {
      setStageUpdateError(error.message || 'Could not update lead stage')
    } finally {
      setUpdatingLeadId(null)
    }
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
    const parsed = Number(nextLeadId)
    setSelectedLeadId(parsed)
    if (workspaceView === 'logs') {
      await loadLogsForLead(parsed)
    }
    if (workspaceView === 'reminders') {
      await loadRemindersForLead(parsed)
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

  const topBarProps = {
    goHome,
    openAiAssistant,
    openCreateLead: () => setWorkspaceView('create'),
    openReports: () => setWorkspaceView('reports'),
    openReminders,
    openCommunicationLogs,
    onLogout,
    toggleTheme,
    theme,
  }

  if (screen === 'landing') {
    return <LandingScreen toggleTheme={toggleTheme} theme={theme} openLogin={openLogin} />
  }

  if (screen === 'login') {
    return (
      <AuthScreen
        authMode={authMode}
        authError={authError}
        busy={busy}
        loginForm={loginForm}
        signupForm={signupForm}
        setAuthMode={setAuthMode}
        setAuthError={setAuthError}
        setLoginForm={setLoginForm}
        setSignupForm={setSignupForm}
        onLogin={onLogin}
        onSignup={onSignup}
        goBack={() => setScreen('landing')}
      />
    )
  }

  if (workspaceView === 'create') {
    return (
      <CreateLeadPage
        topBarProps={topBarProps}
        leadForm={leadForm}
        setLeadForm={setLeadForm}
        onCreateLead={onCreateLead}
        busy={busy}
      />
    )
  }

  if (workspaceView === 'reports') {
    return (
      <ReportsPage
        topBarProps={topBarProps}
        metrics={metrics}
        conversionRate={conversionRate}
        wonCount={wonCount}
        averageDealSize={averageDealSize}
        toMoney={toMoney}
        aiInsights={aiInsights}
        lostCount={lostCount}
        pipeline={pipeline}
        leads={leads}
        sourceBreakdown={sourceBreakdown}
      />
    )
  }

  if (workspaceView === 'reminders') {
    return (
      <RemindersPage
        topBarProps={topBarProps}
        selectedLeadId={selectedLeadId}
        leads={leads}
        onChangeLeadContext={onChangeLeadContext}
        selectedLead={selectedLead}
        reminderForm={reminderForm}
        setReminderForm={setReminderForm}
        onCreateReminder={onCreateReminder}
        remindersBusy={remindersBusy}
        remindersError={remindersError}
        reminderItems={reminderItems}
        onToggleReminderDone={onToggleReminderDone}
      />
    )
  }

  if (workspaceView === 'logs') {
    return (
      <LogsPage
        topBarProps={topBarProps}
        selectedLeadId={selectedLeadId}
        leads={leads}
        onChangeLeadContext={onChangeLeadContext}
        selectedLead={selectedLead}
        logForm={logForm}
        setLogForm={setLogForm}
        onCreateLog={onCreateLog}
        logsBusy={logsBusy}
        logsError={logsError}
        logItems={logItems}
      />
    )
  }

  if (workspaceView === 'ai') {
    return (
      <AiPage
        topBarProps={topBarProps}
        onAskAi={onAskAi}
        aiPrompt={aiPrompt}
        setAiPrompt={setAiPrompt}
        aiChatBusy={aiChatBusy}
        aiChatError={aiChatError}
        aiReply={aiReply}
      />
    )
  }

  return (
    <PipelinePage
      topBarProps={topBarProps}
      workspaceView={workspaceView}
      setWorkspaceView={setWorkspaceView}
      openReminders={openReminders}
      openCommunicationLogs={openCommunicationLogs}
      aiInsights={aiInsights}
      toMoney={toMoney}
      metrics={metrics}
      totalValue={totalValue}
      pipeline={pipeline}
      leads={leads}
      stageDrafts={stageDrafts}
      setStageDrafts={setStageDrafts}
      onUpdateLeadStage={onUpdateLeadStage}
      updatingLeadId={updatingLeadId}
      stageUpdateError={stageUpdateError}
      wonValue={wonValue}
      user={user}
    />
  )
}

export default App
