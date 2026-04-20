import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { aiApi, authApi, leadApi } from './api'
import './App.css'

const WORKSPACE_VIEWS = new Set(['pipeline', 'create', 'edit', 'reports', 'reminders', 'logs', 'ai'])

function getViewFromHash() {
  const hash = window.location.hash || ''
  const cleaned = hash.replace(/^#\/?/, '')
  return WORKSPACE_VIEWS.has(cleaned) ? cleaned : 'pipeline'
}

// ─── Markdown renderer ─────────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return ''
  let html = text
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
  return `<p>${html}</p>`
}

function MarkdownReply({ text }) {
  return <div className="md-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
}

// ─── CSV & PDF export helpers ──────────────────────────────────────────────
function downloadCSV(leads) {
  const headers = ['Company', 'Contact', 'Email', 'Phone', 'Source', 'Stage', 'Value (INR)', 'Assigned To', 'Last Touch', 'Notes']
  const rows = leads.map((l) => [
    l.company_name, l.contact_name, l.contact_email, l.contact_phone,
    l.source, l.stage, l.estimated_value, l.assigned_to, l.last_touch,
    (l.notes || '').replace(/[\r\n,]/g, ' '),
  ])
  const csv = [headers, ...rows].map((row) => row.map((v) => `"${v ?? ''}"`).join(',')).join('\n')
  // BOM so Excel opens UTF-8 correctly
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = `smartcrm-leads-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function downloadPDF(leads, metrics) {
  const toMoney = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>SmartCRM — Lead Report</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 2cm; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .sub { color: #666; margin-bottom: 20px; font-size: 11px; }
    .kpis { display: flex; gap: 32px; margin-bottom: 24px; }
    .kpi { border: 1px solid #ddd; border-radius: 6px; padding: 10px 16px; min-width: 120px; }
    .kpi-label { font-size: 10px; color: #888; text-transform: uppercase; }
    .kpi-val { font-size: 18px; font-weight: bold; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; color: #666; border-bottom: 2px solid #ddd; }
    td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: bold; }
    .tag-won { background: #d1fae5; color: #065f46; }
    .tag-lost { background: #fee2e2; color: #991b1b; }
    .tag-qualified { background: #d1fae5; color: #065f46; }
    .tag-proposal { background: #fef3c7; color: #92400e; }
    .tag-negotiation { background: #ffedd5; color: #9a3412; }
    .tag-new { background: #dbeafe; color: #1e40af; }
    @media print { body { margin: 1cm; } }
  </style>
</head>
<body>
  <h1>SmartCRM — Lead Report</h1>
  <p class="sub">Generated ${new Date().toLocaleString()} · ${leads.length} leads</p>
  <div class="kpis">
    <div class="kpi"><div class="kpi-label">Total Pipeline</div><div class="kpi-val">${toMoney(metrics.total)}</div></div>
    <div class="kpi"><div class="kpi-label">Won Revenue</div><div class="kpi-val">${toMoney(metrics.won)}</div></div>
    <div class="kpi"><div class="kpi-label">Conversion Rate</div><div class="kpi-val">${metrics.rate}%</div></div>
    <div class="kpi"><div class="kpi-label">Lead Count</div><div class="kpi-val">${leads.length}</div></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Company</th><th>Contact</th><th>Source</th><th>Stage</th><th>Value</th><th>Last Touch</th></tr></thead>
    <tbody>
      ${leads.map((l, i) => `<tr>
        <td>${i + 1}</td>
        <td><strong>${l.company_name}</strong>${l.contact_email ? `<br><span style="color:#888">${l.contact_email}</span>` : ''}</td>
        <td>${l.contact_name || '—'}</td>
        <td>${l.source || '—'}</td>
        <td><span class="tag tag-${l.stage}">${l.stage}</span></td>
        <td>${toMoney(l.estimated_value)}</td>
        <td>${l.last_touch || '—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</body>
</html>`
  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

// ─── Lead form fields ──────────────────────────────────────────────────────
const EMPTY_FORM = {
  company_name: '', contact_name: '', contact_email: '', contact_phone: '',
  source: 'Website', stage: 'new', estimated_value: '', assigned_to: '', last_touch: '', notes: '',
}

function LeadFormFields({ value, onChange }) {
  const set = (key) => (e) => onChange((p) => ({ ...p, [key]: e.target.value }))
  return (
    <>
      <label>Company Name *<input required placeholder="e.g. Acme Corp" value={value.company_name} onChange={set('company_name')} /></label>
      <label>Contact Name *<input required placeholder="e.g. Jane Smith" value={value.contact_name} onChange={set('contact_name')} /></label>
      <label>Email<input type="email" placeholder="jane@company.com" value={value.contact_email} onChange={set('contact_email')} /></label>
      <label>Phone<input placeholder="+1 555 000 0000" value={value.contact_phone} onChange={set('contact_phone')} /></label>
      <label>Source
        <select value={value.source} onChange={set('source')}>
          {['Website','Referral','Cold Outreach','LinkedIn','Event','Other'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label>Assigned To<input placeholder="Sales rep name" value={value.assigned_to} onChange={set('assigned_to')} /></label>
      <label>Stage
        <select value={value.stage} onChange={set('stage')}>
          {[['new','New'],['qualified','Qualified'],['proposal','Proposal'],['negotiation','Negotiation'],['won','Won'],['lost','Lost']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label>Estimated Value (INR)<input type="number" min="0" placeholder="0" value={value.estimated_value} onChange={set('estimated_value')} /></label>
      <label>Last Touch<input type="date" value={value.last_touch} onChange={set('last_touch')} /></label>
      <label className="full">Notes<textarea rows="3" placeholder="Key context, next steps…" value={value.notes} onChange={set('notes')} /></label>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [theme,          setTheme]          = useState('dark')
  const [screen,         setScreen]         = useState('loading')
  const [view,           setView]           = useState(() => getViewFromHash())
  const [user,           setUser]           = useState(null)
  const [authMode,       setAuthMode]       = useState('signin')
  const [authError,      setAuthError]      = useState('')
  const [busy,           setBusy]           = useState(false)

  // leads — populated by real-time onSnapshot
  const [leads,          setLeads]          = useState([])
  const [leadsLoading,   setLeadsLoading]   = useState(false)

  // forms
  const [loginForm,      setLoginForm]      = useState({ username: '', password: '' })
  const [signupForm,     setSignupForm]     = useState({ username: '', email: '', password: '', confirm_password: '' })
  const [leadForm,       setLeadForm]       = useState(EMPTY_FORM)
  const [editId,         setEditId]         = useState(null)
  const [editForm,       setEditForm]       = useState(EMPTY_FORM)

  // stage drafts
  const [stageDrafts,    setStageDrafts]    = useState({})
  const [updatingId,     setUpdatingId]     = useState(null)
  const [stageErr,       setStageErr]       = useState('')

  // logs
  const [selectedLead,   setSelectedLead]   = useState(null)
  const [logs,           setLogs]           = useState([])
  const [logForm,        setLogForm]        = useState({ channel: 'email', note: '' })
  const [logsBusy,       setLogsBusy]       = useState(false)
  const [logsErr,        setLogsErr]        = useState('')

  // reminders
  const [reminders,      setReminders]      = useState([])
  const [remForm,        setRemForm]        = useState({ task: '', due_at: '' })
  const [remBusy,        setRemBusy]        = useState(false)
  const [remErr,         setRemErr]         = useState('')

  // AI
  const [aiPrompt,       setAiPrompt]       = useState('')
  const [aiReply,        setAiReply]        = useState('')
  const [aiChatBusy,     setAiChatBusy]     = useState(false)
  const [aiErr,          setAiErr]          = useState('')

  // unsubscribe refs
  const leadsUnsub   = useRef(null)
  const logsUnsub    = useRef(null)
  const remUnsub     = useRef(null)

  // ── Theme ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('smartcrm-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('smartcrm-theme', next)
  }

  // ── Dynamic page title ────────────────────────────────────────────────
  useEffect(() => {
    const titles = {
      loading:   'SmartCRM',
      landing:   'SmartCRM — Intelligent Lead Management',
      auth:      authMode === 'signin' ? 'Sign In — SmartCRM' : 'Create Account — SmartCRM',
      workspace: { pipeline: 'Pipeline', create: 'New Lead', edit: 'Edit Lead', reports: 'Reports', reminders: 'Reminders', logs: 'Logs', ai: 'AI Assistant' }[view] + ' — SmartCRM',
    }
    document.title = titles[screen] || 'SmartCRM'
  }, [screen, view, authMode])

  // ── Auth state listener ─────────────────────────────────────────────
  useEffect(() => {
    const unsub = authApi.onAuthChange((firebaseUser) => {
      if (firebaseUser) {
        const u = { id: firebaseUser.uid, username: firebaseUser.displayName || firebaseUser.email?.split('@')[0], email: firebaseUser.email }
        setUser(u)
        setView(getViewFromHash())
        setScreen('workspace')
        startLeadsSubscription()
      } else {
        setUser(null)
        setLeads([])
        stopLeadsSubscription()
        if (screen !== 'loading') setScreen('landing')
        else setScreen('landing')
      }
    })
    return unsub
  }, [])

  // ── Keep active workspace tab on refresh/back via URL hash ───────────
  useEffect(() => {
    const onHashChange = () => {
      const next = getViewFromHash()
      setView((prev) => (prev === next ? prev : next))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (screen !== 'workspace' || !WORKSPACE_VIEWS.has(view)) return
    const nextHash = `#/${view}`
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash)
    }
  }, [screen, view])

  // ── Real-time leads subscription ─────────────────────────────────────
  function startLeadsSubscription() {
    stopLeadsSubscription()
    setLeadsLoading(true)
    leadsUnsub.current = leadApi.subscribe((newLeads) => {
      setLeads(newLeads)
      setLeadsLoading(false)
      setStageDrafts(Object.fromEntries(newLeads.map((l) => [l.id, l.stage])))
    })
  }

  function stopLeadsSubscription() {
    if (leadsUnsub.current) { leadsUnsub.current(); leadsUnsub.current = null }
  }

  // ── Real-time notes & reminders subscriptions ────────────────────────
  useEffect(() => {
    if (logsUnsub.current) { logsUnsub.current(); logsUnsub.current = null }
    if (selectedLead && view === 'logs') {
      logsUnsub.current = leadApi.subscribeNotes(selectedLead.id, setLogs)
    }
  }, [selectedLead?.id, view])

  useEffect(() => {
    if (remUnsub.current) { remUnsub.current(); remUnsub.current = null }
    if (selectedLead && view === 'reminders') {
      remUnsub.current = leadApi.subscribeReminders(selectedLead.id, setReminders)
    }
  }, [selectedLead?.id, view])

  // ── Derived metrics ───────────────────────────────────────────────────
  const pipeline = useMemo(() => {
    const byStage = leads.reduce((a, l) => { a[l.stage] = (a[l.stage] || 0) + 1; return a }, {})
    return [
      { label: 'New',         key: 'new',         value: byStage.new         || 0 },
      { label: 'Qualified',   key: 'qualified',   value: byStage.qualified   || 0 },
      { label: 'Proposal',    key: 'proposal',    value: byStage.proposal    || 0 },
      { label: 'Negotiation', key: 'negotiation', value: byStage.negotiation || 0 },
      { label: 'Won',         key: 'won',         value: byStage.won         || 0 },
      { label: 'Lost',        key: 'lost',        value: byStage.lost        || 0 },
    ]
  }, [leads])

  const totalValue    = useMemo(() => leads.reduce((s, l) => s + Number(l.estimated_value), 0), [leads])
  const wonValue      = useMemo(() => leads.filter((l) => l.stage === 'won').reduce((s, l) => s + Number(l.estimated_value), 0), [leads])
  const wonCount      = pipeline.find((i) => i.key === 'won').value
  const lostCount     = pipeline.find((i) => i.key === 'lost').value
  const convRate      = leads.length ? Math.round((wonCount / leads.length) * 100) : 0
  const avgDeal       = leads.length ? totalValue / leads.length : 0

  const srcBreakdown  = useMemo(() => {
    const g = leads.reduce((a, l) => { const s = l.source || 'Unknown'; a[s] = (a[s] || 0) + 1; return a }, {})
    return Object.entries(g).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [leads])

  const toMoney = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  // auto-select first lead if none selected
  useEffect(() => {
    if (leads.length && !selectedLead) setSelectedLead(leads[0])
    if (selectedLead && !leads.find((l) => l.id === selectedLead.id)) setSelectedLead(leads[0] || null)
  }, [leads])

  // ── Auth handlers ─────────────────────────────────────────────────────
  const openAuth = (mode = 'signin') => { setAuthMode(mode); setAuthError(''); setScreen('auth') }

  const friendlyAuthError = (msg = '') => {
    if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found'))
      return 'Incorrect email or password. Please try again.'
    if (msg.includes('email-already-in-use'))
      return 'An account with this email already exists. Sign in instead.'
    if (msg.includes('weak-password'))
      return 'Password must be at least 6 characters.'
    if (msg.includes('invalid-email'))
      return 'Please enter a valid email address.'
    if (msg.includes('too-many-requests'))
      return 'Too many attempts. Wait a moment and try again.'
    return msg
  }

  const onSignIn = async (e) => {
    e.preventDefault(); setBusy(true); setAuthError('')
    try { await authApi.signIn(loginForm) }
    catch (err) { setAuthError(friendlyAuthError(err.message)) }
    finally { setBusy(false) }
  }

  const onSignUp = async (e) => {
    e.preventDefault(); setBusy(true); setAuthError('')
    try { await authApi.signUp({ ...signupForm }) }
    catch (err) { setAuthError(friendlyAuthError(err.message)) }
    finally { setBusy(false) }
  }

  const onSignOut = async () => {
    await authApi.signOut()
    setLeads([]); setView('pipeline')
    setLoginForm({ username: '', password: '' })
    setSignupForm({ username: '', email: '', password: '', confirm_password: '' })
  }

  // ── Lead handlers ─────────────────────────────────────────────────────
  const onCreateLead = async (e) => {
    e.preventDefault(); setBusy(true)
    try { await leadApi.create({ ...leadForm, estimated_value: Number(leadForm.estimated_value || 0) }); setLeadForm(EMPTY_FORM); setView('pipeline') }
    finally { setBusy(false) }
  }

  const openEdit = (lead) => {
    setEditId(lead.id)
    setEditForm({ ...lead, estimated_value: String(lead.estimated_value ?? '') })
    setView('edit')
  }

  const onSaveEdit = async (e) => {
    e.preventDefault(); if (!editId) return
    setBusy(true); setStageErr('')
    try { await leadApi.update(editId, { ...editForm, estimated_value: Number(editForm.estimated_value || 0) }); setView('pipeline'); setEditId(null) }
    catch (err) { setStageErr(err.message) }
    finally { setBusy(false) }
  }

  const onMoveStage = async (leadId) => {
    const nextStage = stageDrafts[leadId]
    const current = leads.find((l) => l.id === leadId)
    if (!current || nextStage === current.stage) return
    setStageErr(''); setUpdatingId(leadId)
    try { await leadApi.update(leadId, { ...current, stage: nextStage }) }
    catch (err) { setStageErr(err.message) }
    finally { setUpdatingId(null) }
  }

  // ── Log handlers ──────────────────────────────────────────────────────
  const onCreateLog = async (e) => {
    e.preventDefault(); if (!selectedLead) return
    setLogsBusy(true); setLogsErr('')
    try { await leadApi.addNote(selectedLead.id, logForm); setLogForm((p) => ({ ...p, note: '' })) }
    catch (err) { setLogsErr(err.message) }
    finally { setLogsBusy(false) }
  }

  // ── Reminder handlers ─────────────────────────────────────────────────
  const onCreateReminder = async (e) => {
    e.preventDefault(); if (!selectedLead) return
    setRemBusy(true); setRemErr('')
    try { await leadApi.createReminder(selectedLead.id, { task: remForm.task, due_at: new Date(remForm.due_at).toISOString() }); setRemForm({ task: '', due_at: '' }) }
    catch (err) { setRemErr(err.message) }
    finally { setRemBusy(false) }
  }

  const onToggleDone = async (rem) => {
    setRemBusy(true)
    try { await leadApi.updateReminder(selectedLead.id, rem.id, { is_done: !rem.is_done }) }
    catch (err) { setRemErr(err.message) }
    finally { setRemBusy(false) }
  }

  // ── AI handler ────────────────────────────────────────────────────────
  const onAskAi = async (e) => {
    e.preventDefault()
    const prompt = aiPrompt.trim(); if (!prompt) return
    setAiChatBusy(true); setAiErr(''); setAiReply('')
    try { const r = await aiApi.chat(prompt, leads); setAiReply(r.reply || '') }
    catch (err) { setAiErr(err.message || 'Could not get response. Please try again.') }
    finally { setAiChatBusy(false) }
  }

  // ── Navigation helpers ────────────────────────────────────────────────
  const goHome = () => setView('pipeline')

  const openLogs = (lead) => {
    if (lead) setSelectedLead(lead)
    setView('logs')
  }

  const openReminders = (lead) => {
    if (lead) setSelectedLead(lead)
    setView('reminders')
  }

  // ── Top bar ───────────────────────────────────────────────────────────
  const TopBar = () => (
    <header className="topbar">
      <div className="topbar-left">
        <button className="brand-btn" onClick={goHome} type="button">
          <span className="brand-logo">S</span>
          <span className="brand-name">SmartCRM</span>
        </button>
      </div>
      <nav className="topbar-nav">
        {[['pipeline','Pipeline'],['reports','Reports'],['reminders','Reminders'],['logs','Logs']].map(([k,l]) => (
          <button key={k} className={`nav-btn${view===k?' active':''}`}
            onClick={() => { if(k==='reminders') openReminders(); else if(k==='logs') openLogs(); else setView(k) }}
            type="button">{l}</button>
        ))}
      </nav>
      <div className="topbar-actions">
        <button className="nav-btn ask-ai-btn" onClick={() => setView('ai')} type="button">✦ Ask AI</button>
        <button className="nav-btn new-lead-btn" onClick={() => setView('create')} type="button">+ New Lead</button>
        <span className="user-chip">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
        <button className="nav-btn signout-btn" onClick={onSignOut} type="button">Sign Out</button>
        <button className="theme-sq" onClick={toggleTheme} type="button" aria-label="Toggle theme">
          {theme === 'light' ? '☾' : '☀'}
        </button>
      </div>
    </header>
  )

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  if (screen === 'loading') {
    return <div className="splash"><span className="brand-logo lg">S</span><p>Loading…</p></div>
  }

  // ── Landing ────────────────────────────────────────────────────────────
  if (screen === 'landing') {
    return (
      <main className="landing-page">
        <nav className="landing-nav">
          <div className="brand-row">
            <span className="brand-logo">S</span>
            <span className="brand-name">SmartCRM</span>
          </div>
          <div className="landing-nav-actions">
            <button className="ghost-sm" onClick={() => openAuth('signin')} type="button">Sign In</button>
            <button className="cta-sm" onClick={() => openAuth('signup')} type="button">Get Started</button>
            <button className="theme-sq" onClick={toggleTheme} type="button" aria-label="Toggle theme">
              {theme === 'light' ? '☾' : '☀'}
            </button>
          </div>
        </nav>

        <section className="landing-hero">
          <div className="landing-left">
            <span className="eyebrow">Intelligent Lead Management</span>
            <h1>Close more deals with<br />smarter pipeline control</h1>
            <p className="hero-desc">
              SmartCRM unifies your entire sales operation — lead tracking, pipeline stages, follow-up reminders, communication logs, and AI-powered insights — in one clean workspace.
            </p>
            <div className="hero-actions">
              <button className="cta-lg" onClick={() => openAuth('signup')} type="button">Start for Free</button>
              <button className="ghost-lg" onClick={() => openAuth('signin')} type="button">Sign In</button>
            </div>
            <div className="trust-pills">
              <span>✓ Real-time data sync</span>
              <span>✓ AI-powered insights</span>
              <span>✓ Secure &amp; private</span>
            </div>
          </div>

          <div className="landing-right">
            <div className="feature-grid">
              {[
                {
                  svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
                  title: 'Pipeline Tracker', desc: 'Visualise every deal across New → Won in real time. Move stages with one click.'
                },
                {
                  svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 8v4l3 3"/><circle cx="19" cy="5" r="3" fill="currentColor" stroke="none"/></svg>,
                  title: 'AI Assistant', desc: 'Ask anything about your pipeline. Get strategy, email drafts, and risk analysis instantly.'
                },
                {
                  svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
                  title: 'Follow-up Reminders', desc: 'Never drop a lead. Set contextual reminders per deal and track completion.'
                },
                {
                  svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
                  title: 'Communication Logs', desc: 'Log every call, email, and meeting. Instantly recall context before outreach.'
                },
                {
                  svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
                  title: 'Conversion Analytics', desc: 'Track win rates, average deal size, and source ROI with live charts.'
                },
                {
                  svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
                  title: 'Export Anytime', desc: 'Download your pipeline as CSV or PDF for reporting, sharing, or archiving.'
                },
              ].map((f) => (
                <div className="feature-card" key={f.title}>
                  <span className="f-icon">{f.svg}</span>
                  <div>
                    <strong>{f.title}</strong>
                    <p>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    )
  }

  // ── Auth ───────────────────────────────────────────────────────────────
  if (screen === 'auth') {
    return (
      <main className="auth-page">
        {/* Minimal top bar */}
        <nav className="auth-nav">
          <div className="brand-row">
            <span className="brand-logo">S</span>
            <span className="brand-name">SmartCRM</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="ghost-back-inline" onClick={() => setScreen('landing')} type="button">← Back</button>
            <button className="theme-sq" onClick={toggleTheme} type="button" aria-label="Toggle theme">
              {theme === 'light' ? '☾' : '☀'}
            </button>
          </div>
        </nav>

        {/* Centered card */}
        <div className="auth-center">
          <div className="auth-card">
            <div className="auth-card-brand">
              <span className="brand-logo">S</span>
              <span className="brand-name">SmartCRM</span>
            </div>

            <div className="auth-tabs">
              <button id="tab-signin" className={`auth-tab${authMode==='signin'?' active':''}`}
                onClick={() => { setAuthMode('signin'); setAuthError('') }} type="button">Sign In</button>
              <button id="tab-signup" className={`auth-tab${authMode==='signup'?' active':''}`}
                onClick={() => { setAuthMode('signup'); setAuthError('') }} type="button">Create Account</button>
            </div>

            {authMode === 'signin' ? (
              <>
                <h1 className="auth-title">Welcome back</h1>
                <p className="auth-subtitle">Sign in to access your workspace.</p>
                <form onSubmit={onSignIn} className="auth-form">
                  <label>Email Address
                    <input id="signin-user" value={loginForm.username}
                      onChange={(e) => setLoginForm((p) => ({ ...p, username: e.target.value }))}
                      placeholder="you@company.com" autoComplete="email" type="email" required />
                  </label>
                  <label>Password
                    <input id="signin-pwd" type="password" value={loginForm.password}
                      onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Your password" autoComplete="current-password" required />
                  </label>
                  {authError && <p className="error">{authError}</p>}
                  <button id="signin-submit" className="cta full-btn" disabled={busy} type="submit">
                    {busy ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>
                <p className="auth-switch">No account?{' '}
                  <button type="button" onClick={() => { setAuthMode('signup'); setAuthError('') }}>Create one free →</button>
                </p>
              </>
            ) : (
              <>
                <h1 className="auth-title">Create your account</h1>
                <p className="auth-subtitle">Free to start — no credit card needed.</p>
                <form onSubmit={onSignUp} className="auth-form">
                  <label>Full Name
                    <input id="signup-name" value={signupForm.username}
                      onChange={(e) => setSignupForm((p) => ({ ...p, username: e.target.value }))}
                      placeholder="Your name" autoComplete="name" required />
                  </label>
                  <label>Email Address
                    <input id="signup-email" type="email" value={signupForm.email}
                      onChange={(e) => setSignupForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="you@company.com" autoComplete="email" required />
                  </label>
                  <label>Password
                    <input id="signup-pwd" type="password" value={signupForm.password}
                      onChange={(e) => setSignupForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="At least 6 characters" autoComplete="new-password" required />
                  </label>
                  <label>Confirm Password
                    <input id="signup-confirm" type="password" value={signupForm.confirm_password}
                      onChange={(e) => setSignupForm((p) => ({ ...p, confirm_password: e.target.value }))}
                      placeholder="Re-enter password" autoComplete="new-password" required />
                  </label>
                  {authError && <p className="error">{authError}</p>}
                  <button id="signup-submit" className="cta full-btn" disabled={busy} type="submit">
                    {busy ? 'Creating account…' : 'Create Account'}
                  </button>
                </form>
                <p className="auth-switch">Have an account?{' '}
                  <button type="button" onClick={() => { setAuthMode('signin'); setAuthError('') }}>Sign in →</button>
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // WORKSPACE
  // ═══════════════════════════════════════════════════════════════════════

  // ── Create Lead ──────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <main className="crm">
        <TopBar />
        <header className="page-hdr panel">
          <div><h1>New Lead</h1><p className="muted">Add a new prospect to your pipeline.</p></div>
        </header>
        <section className="panel">
          <form onSubmit={onCreateLead} className="form-grid">
            <LeadFormFields value={leadForm} onChange={setLeadForm} />
            <div className="row-actions full">
              <button className="cta" disabled={busy} type="submit">{busy ? 'Saving…' : 'Create Lead'}</button>
              <button className="ghost" type="button" onClick={goHome}>Cancel</button>
            </div>
          </form>
        </section>
      </main>
    )
  }

  // ── Edit Lead ────────────────────────────────────────────────────────
  if (view === 'edit') {
    return (
      <main className="crm">
        <TopBar />
        <header className="page-hdr panel">
          <div><h1>Edit Lead</h1><p className="muted">Update lead details.</p></div>
        </header>
        <section className="panel">
          <form onSubmit={onSaveEdit} className="form-grid">
            <LeadFormFields value={editForm} onChange={setEditForm} />
            <div className="row-actions full">
              <button className="cta" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save Changes'}</button>
              <button className="ghost" type="button" onClick={goHome}>Cancel</button>
            </div>
            {stageErr && <p className="error full">{stageErr}</p>}
          </form>
        </section>
      </main>
    )
  }

  // ── Reports ──────────────────────────────────────────────────────────
  if (view === 'reports') {
    return (
      <main className="crm">
        <TopBar />
        <header className="page-hdr panel">
          <div>
            <h1>Conversion Reports</h1>
            <p className="muted">Live analytics from your pipeline — {leads.length} leads.</p>
          </div>
          <div className="hdr-actions">
            <button className="ghost-sm" onClick={() => downloadCSV(leads)} type="button">⬇ CSV</button>
            <button className="ghost-sm" onClick={() => downloadPDF(leads, { total: totalValue, won: wonValue, rate: convRate })} type="button">⬇ PDF</button>
          </div>
        </header>

        <section className="metrics">
          <article><h2>Total Pipeline</h2><p>{toMoney(totalValue)}</p><small>{leads.length} leads</small></article>
          <article><h2>Won Revenue</h2><p>{toMoney(wonValue)}</p><small>{wonCount} deals closed</small></article>
          <article><h2>Conversion Rate</h2><p>{convRate}%</p><small>{lostCount} lost</small></article>
          <article><h2>Avg Deal Size</h2><p>{toMoney(avgDeal)}</p><small>pipeline ÷ count</small></article>
        </section>

        <div className="two-col">
          <article className="panel">
            <h2>Stage Distribution</h2>
            <ul className="stat-list">
              {pipeline.map((item) => (
                <li key={item.key}>
                  <div className="stat-row">
                    <span className={`tag ${item.key}`}>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <progress max={Math.max(leads.length, 1)} value={item.value} />
                </li>
              ))}
            </ul>
          </article>
          <article className="panel">
            <h2>Lead Sources</h2>
            <ul className="stat-list">
              {srcBreakdown.map((item) => (
                <li key={item.label}>
                  <div className="stat-row"><span>{item.label}</span><strong>{item.value}</strong></div>
                  <progress max={Math.max(leads.length, 1)} value={item.value} />
                </li>
              ))}
              {!srcBreakdown.length && <li className="empty">No leads yet.</li>}
            </ul>
          </article>
        </div>
      </main>
    )
  }

  // ── Reminders ────────────────────────────────────────────────────────
  if (view === 'reminders') {
    return (
      <main className="crm">
        <TopBar />
        <header className="page-hdr panel">
          <div><h1>Reminders</h1><p className="muted">Follow-up tasks per lead, synced in real time.</p></div>
        </header>
        <section className="panel">
          <div className="context-row">
            <label>Lead
              <select
                value={selectedLead?.id || ''}
                onChange={(e) => setSelectedLead(leads.find((l) => l.id === e.target.value) || null)}
                disabled={!leads.length}
              >
                {!leads.length && <option value="">No leads available</option>}
                {leads.map((l) => <option key={l.id} value={l.id}>{l.company_name}</option>)}
              </select>
            </label>
            {selectedLead && <p className="muted">Reminders for <strong>{selectedLead.company_name}</strong></p>}
            {!leads.length && <p className="muted">Create a lead first to add reminders.</p>}
          </div>
          <form className="inline-form entry-form" onSubmit={onCreateReminder}>
            <label>Task<input value={remForm.task} onChange={(e) => setRemForm((p) => ({ ...p, task: e.target.value }))} placeholder="e.g. Follow up on proposal" required /></label>
            <label>Due<input type="datetime-local" value={remForm.due_at} onChange={(e) => setRemForm((p) => ({ ...p, due_at: e.target.value }))} required /></label>
            <button className="cta form-submit" type="submit" disabled={!selectedLead || remBusy}>{remBusy ? 'Saving…' : 'Add Reminder'}</button>
          </form>
          {remErr && <p className="error">{remErr}</p>}
          <ul className="item-list">
            {reminders.map((r) => (
              <li key={r.id} className={r.is_done ? 'done' : ''}>
                <div className="item-row">
                  <strong>{r.task}</strong>
                  <button type="button" className={r.is_done ? 'ghost-sm' : 'cta-sm'} onClick={() => onToggleDone(r)} disabled={remBusy}>
                    {r.is_done ? 'Reopen' : 'Done'}
                  </button>
                </div>
                <time>{new Date(r.due_at).toLocaleString()}</time>
                {r.is_done && <span className="done-badge">✓ Completed</span>}
              </li>
            ))}
            {!reminders.length && <li className="empty">No reminders yet. Add one above.</li>}
          </ul>
        </section>
      </main>
    )
  }

  // ── Communication Logs ───────────────────────────────────────────────
  if (view === 'logs') {
    return (
      <main className="crm">
        <TopBar />
        <header className="page-hdr panel">
          <div><h1>Communication Logs</h1><p className="muted">Record every touchpoint per lead — synced live.</p></div>
        </header>
        <section className="panel">
          <div className="context-row">
            <label>Lead
              <select
                value={selectedLead?.id || ''}
                onChange={(e) => setSelectedLead(leads.find((l) => l.id === e.target.value) || null)}
                disabled={!leads.length}
              >
                {!leads.length && <option value="">No leads available</option>}
                {leads.map((l) => <option key={l.id} value={l.id}>{l.company_name}</option>)}
              </select>
            </label>
            {selectedLead && <p className="muted">Logs for <strong>{selectedLead.company_name}</strong></p>}
            {!leads.length && <p className="muted">Create a lead first to add logs.</p>}
          </div>
          <form className="inline-form entry-form" onSubmit={onCreateLog}>
            <label>Channel
              <select value={logForm.channel} onChange={(e) => setLogForm((p) => ({ ...p, channel: e.target.value }))}>
                {['email','call','meeting','chat'].map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </label>
            <label className="full-inline">Note
              <textarea rows="3" value={logForm.note} onChange={(e) => setLogForm((p) => ({ ...p, note: e.target.value }))} placeholder="Key points from this interaction…" required />
            </label>
            <button className="cta form-submit" type="submit" disabled={!selectedLead || logsBusy}>{logsBusy ? 'Saving…' : 'Add Log'}</button>
          </form>
          {logsErr && <p className="error">{logsErr}</p>}
          <ul className="item-list">
            {logs.map((item) => (
              <li key={item.id}>
                <div className="item-row">
                  <span className="channel-tag">{item.channel?.toUpperCase()}</span>
                  <small>{new Date(item.created_at).toLocaleString()}</small>
                </div>
                <p>{item.note}</p>
              </li>
            ))}
            {!logs.length && <li className="empty">No logs yet. Add one above.</li>}
          </ul>
        </section>
      </main>
    )
  }

  // ── AI Assistant ──────────────────────────────────────────────────────
  if (view === 'ai') {
    return (
      <main className="crm">
        <TopBar />
        <header className="page-hdr panel">
          <div><h1>AI Assistant</h1><p className="muted">Ask anything about your pipeline and get instant answers.</p></div>
        </header>
        <section className="panel">
          <form className="ai-form" onSubmit={onAskAi}>
            <label>Your question
              <textarea
                rows="5"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={'Examples:\n• Draft a follow-up email for deals in negotiation\n• Which leads are at highest risk?\n• Summarise my pipeline performance'}
              />
            </label>
            <button className="cta" disabled={aiChatBusy} type="submit">
              {aiChatBusy ? 'Thinking…' : '✦ Ask AI'}
            </button>
          </form>
          {aiErr && <p className="error">{aiErr}</p>}
          {aiReply && (
            <article className="ai-reply">
              <h3>Response</h3>
              <MarkdownReply text={aiReply} />
            </article>
          )}
          {!aiReply && !aiChatBusy && (
            <div className="ai-chips-wrap">
              <p className="muted small">Try one of these prompts:</p>
              <div className="ai-chips">
                {[
                  'Summarise my pipeline and highlight top risks',
                  'Draft a follow-up email for negotiation-stage leads',
                  'Which lead sources convert best?',
                  'What should I prioritise this week?',
                ].map((s) => (
                  <button key={s} type="button" className="ai-chip" onClick={() => setAiPrompt(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    )
  }

  // ── Pipeline (default) ────────────────────────────────────────────────
  return (
    <main className="crm">
      <TopBar />

      <header className="page-hdr panel workspace-hdr">
        <div>
          <span className="eyebrow-sm">Welcome back, {user?.username || 'there'}</span>
          <h1>Lead Pipeline</h1>
          <p className="muted">{leads.length} lead{leads.length !== 1 ? 's' : ''} in your pipeline{leadsLoading ? ' — syncing…' : ''}</p>
        </div>
        <div className="hdr-actions">
          <button className="ghost-sm" onClick={() => downloadCSV(leads)} type="button" title="Export CSV">⬇ CSV</button>
          <button className="ghost-sm" onClick={() => downloadPDF(leads, { total: totalValue, won: wonValue, rate: convRate })} type="button" title="Export PDF">⬇ PDF</button>
          <button className="cta-sm" onClick={() => setView('create')} type="button">+ New Lead</button>
        </div>
      </header>

      {/* KPIs */}
      <section className="metrics">
        <article><h2>Total Pipeline</h2><p>{toMoney(totalValue)}</p><small>{leads.length} leads</small></article>
        <article><h2>Won Revenue</h2><p>{toMoney(wonValue)}</p><small>{wonCount} closed</small></article>
        <article><h2>Conversion Rate</h2><p>{convRate}%</p><small>{lostCount} lost</small></article>
      </section>

      {/* Stage funnel */}
      <section className="panel">
        <h2>Stage Funnel</h2>
        <div className="pipeline-grid">
          {pipeline.map((item) => (
            <div key={item.key} className={`p-card stage-${item.key}`}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{leads.length ? Math.round((item.value / leads.length) * 100) : 0}%</small>
            </div>
          ))}
        </div>
      </section>

      {/* Leads table */}
      <section className="panel">
        <h2>All Leads</h2>
        {!leads.length && !leadsLoading && (
          <p className="empty-state">No leads yet. Click "+ New Lead" to add your first prospect.</p>
        )}
        {leadsLoading && <p className="muted" style={{ marginTop: '1rem' }}>Loading…</p>}
        {leads.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th><th>Contact</th><th>Source</th><th>Stage</th>
                  <th>Value</th><th>Last Touch</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <strong>{lead.company_name}</strong>
                      {lead.assigned_to && <small>→ {lead.assigned_to}</small>}
                    </td>
                    <td>
                      {lead.contact_name}
                      {lead.contact_email && <small>{lead.contact_email}</small>}
                    </td>
                    <td><span className="src-tag">{lead.source || '—'}</span></td>
                    <td><span className={`tag ${lead.stage}`}>{lead.stage}</span></td>
                    <td>{toMoney(lead.estimated_value)}</td>
                    <td>{lead.last_touch || '—'}</td>
                    <td>
                      <div className="row-actions">
                        <select
                          className="stage-sel"
                          value={stageDrafts[lead.id] || lead.stage}
                          onChange={(e) => setStageDrafts((p) => ({ ...p, [lead.id]: e.target.value }))}
                        >
                          {[['new','New'],['qualified','Qualified'],['proposal','Proposal'],['negotiation','Negotiation'],['won','Won'],['lost','Lost']].map(([v,l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                        <button type="button" className="act-btn"
                          onClick={() => onMoveStage(lead.id)}
                          disabled={updatingId === lead.id || (stageDrafts[lead.id] || lead.stage) === lead.stage}>
                          {updatingId === lead.id ? '…' : 'Move'}
                        </button>
                        <button type="button" className="act-btn muted-btn" onClick={() => openEdit(lead)}>Edit</button>
                        <button type="button" className="act-btn muted-btn" onClick={() => openLogs(lead)}>Logs</button>
                        <button type="button" className="act-btn muted-btn" onClick={() => openReminders(lead)}>Tasks</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {stageErr && <p className="error">{stageErr}</p>}
      </section>
    </main>
  )
}
