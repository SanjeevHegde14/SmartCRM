import WorkspaceTopBar from './WorkspaceTopBar'

function ReportsPage({
  topBarProps,
  metrics,
  conversionRate,
  wonCount,
  averageDealSize,
  toMoney,
  aiInsights,
  lostCount,
  pipeline,
  leads,
  sourceBreakdown,
}) {
  return (
    <main className="crm">
      <WorkspaceTopBar {...topBarProps} />

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

export default ReportsPage
