function LandingScreen({ toggleTheme, theme, openLogin }) {
  return (
    <main className="crm">
      <header className="hero">
        <div className="hero-top">
          <p className="kicker">Smart CRM</p>
          <button className="theme-toggle" onClick={toggleTheme} type="button">
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </div>
        <h1>Lead Management Workspace</h1>
        <p className="sub">
          Track leads, move pipeline stages, and monitor conversion with a focused sales workflow.
        </p>
        <div className="hero-actions">
          <button className="cta" onClick={openLogin} type="button">
            Log In
          </button>
          <span className="hint">Open workspace to access AI pipeline, lead creation, and reports.</span>
        </div>
      </header>
    </main>
  )
}

export default LandingScreen
