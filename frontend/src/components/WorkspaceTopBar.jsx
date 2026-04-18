function WorkspaceTopBar({
  goHome,
  openAiAssistant,
  openCreateLead,
  openReports,
  openReminders,
  openCommunicationLogs,
  onLogout,
  toggleTheme,
  theme,
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="square-home" onClick={goHome} type="button" aria-label="Back to home">
          {'<'}
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
        <button className="top-btn" onClick={openCreateLead} type="button">
          Create Lead
        </button>
        <button className="top-btn" onClick={openReports} type="button">
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
          {theme === 'light' ? 'Moon' : 'Sun'}
        </button>
      </div>
    </header>
  )
}

export default WorkspaceTopBar
