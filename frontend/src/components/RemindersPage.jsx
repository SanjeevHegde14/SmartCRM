import WorkspaceTopBar from './WorkspaceTopBar'

function RemindersPage({
  topBarProps,
  selectedLeadId,
  leads,
  onChangeLeadContext,
  selectedLead,
  reminderForm,
  setReminderForm,
  onCreateReminder,
  remindersBusy,
  remindersError,
  reminderItems,
  onToggleReminderDone,
}) {
  return (
    <main className="crm">
      <WorkspaceTopBar {...topBarProps} />

      <header className="subpage-top panel">
        <h1>Reminder Management</h1>
        <p className="muted-text">Create follow-up reminders per lead and mark tasks complete.</p>
      </header>

      <section className="panel">
        <div className="inline-context-row">
          <label>
            Lead
            <select value={selectedLeadId || ''} onChange={(event) => onChangeLeadContext(event.target.value)}>
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

export default RemindersPage
