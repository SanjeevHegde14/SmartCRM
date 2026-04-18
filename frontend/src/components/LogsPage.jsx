import WorkspaceTopBar from './WorkspaceTopBar'

function LogsPage({
  topBarProps,
  selectedLeadId,
  leads,
  onChangeLeadContext,
  selectedLead,
  logForm,
  setLogForm,
  onCreateLog,
  logsBusy,
  logsError,
  logItems,
}) {
  return (
    <main className="crm">
      <WorkspaceTopBar {...topBarProps} />

      <header className="subpage-top panel">
        <h1>Communication Logs</h1>
        <p className="muted-text">Track call, email, meeting, and chat updates by lead.</p>
      </header>

      <section className="panel">
        <div className="inline-context-row">
          <label>
            Lead
            <select value={selectedLeadId || ''} onChange={(event) => onChangeLeadContext(event.target.value)}>
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

export default LogsPage
