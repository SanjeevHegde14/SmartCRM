import WorkspaceTopBar from './WorkspaceTopBar'
import { STAGE_OPTIONS } from '../constants'

function CreateLeadPage({ topBarProps, leadForm, setLeadForm, onCreateLead, busy }) {
  return (
    <main className="crm">
      <WorkspaceTopBar {...topBarProps} />

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
              {STAGE_OPTIONS.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
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

export default CreateLeadPage
