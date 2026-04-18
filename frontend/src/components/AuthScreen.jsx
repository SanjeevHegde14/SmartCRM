function AuthScreen({
  authMode,
  authError,
  busy,
  loginForm,
  signupForm,
  setAuthMode,
  setAuthError,
  setLoginForm,
  setSignupForm,
  onLogin,
  onSignup,
  goBack,
}) {
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
              <button className="ghost" onClick={goBack} type="button">
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
                onChange={(event) =>
                  setSignupForm((prev) => ({ ...prev, confirm_password: event.target.value }))
                }
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
              <button className="ghost" onClick={goBack} type="button">
                Back
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  )
}

export default AuthScreen
