import WorkspaceTopBar from './WorkspaceTopBar'
import { STAGE_OPTIONS } from '../constants'

function PipelinePage({
  topBarProps,
  workspaceView,
  setWorkspaceView,
  openReminders,
  openCommunicationLogs,
  aiInsights,
  toMoney,
  metrics,
  totalValue,
  pipeline,
  leads,
  stageDrafts,
  setStageDrafts,
  onUpdateLeadStage,
  updatingLeadId,
  stageUpdateError,
}) {
  return (
    <main className="crm">
      <WorkspaceTopBar {...topBarProps} />

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
                        {STAGE_OPTIONS.map((stage) => (
                          <option key={stage.value} value={stage.value}>
                            {stage.label}
                          </option>
                        ))}
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
    </main>
  )
}

export default PipelinePage
