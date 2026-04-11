import { useMemo } from 'react'
import './App.css'

function App() {
  const leads = [
    {
      id: 'LD-101',
      name: 'Aster Labs',
      contact: 'Nina Morales',
      stage: 'Qualified',
      value: 12000,
      lastTouch: '2026-04-09',
    },
    {
      id: 'LD-102',
      name: 'Northline Retail',
      contact: 'Chris Duran',
      stage: 'Proposal',
      value: 18000,
      lastTouch: '2026-04-10',
    },
    {
      id: 'LD-103',
      name: 'Riverbank Foods',
      contact: 'Meera Shah',
      stage: 'Negotiation',
      value: 25000,
      lastTouch: '2026-04-08',
    },
    {
      id: 'LD-104',
      name: 'Clarity Health',
      contact: 'Diego Park',
      stage: 'New',
      value: 7600,
      lastTouch: '2026-04-10',
    },
    {
      id: 'LD-105',
      name: 'TerraBuild',
      contact: 'Ivy Zhang',
      stage: 'Won',
      value: 32000,
      lastTouch: '2026-04-07',
    },
  ]

  const communicationLogs = [
    {
      lead: 'Aster Labs',
      channel: 'Email',
      owner: 'Arjun',
      note: 'Shared onboarding timeline and pricing sheet.',
      time: 'Apr 10, 9:45 AM',
    },
    {
      lead: 'Northline Retail',
      channel: 'Call',
      owner: 'Lina',
      note: 'Confirmed technical requirements with procurement.',
      time: 'Apr 10, 2:20 PM',
    },
    {
      lead: 'Riverbank Foods',
      channel: 'Meeting',
      owner: 'Arjun',
      note: 'Discussed pilot rollout in two regions.',
      time: 'Apr 11, 10:00 AM',
    },
  ]

  const reminders = [
    { task: 'Send revised proposal', lead: 'Northline Retail', due: 'Today, 5:00 PM' },
    { task: 'Book product demo', lead: 'Clarity Health', due: 'Tomorrow, 11:00 AM' },
    { task: 'Negotiation follow-up', lead: 'Riverbank Foods', due: 'Apr 14, 3:00 PM' },
  ]

  const pipeline = useMemo(() => {
    const byStage = leads.reduce((acc, lead) => {
      acc[lead.stage] = (acc[lead.stage] ?? 0) + 1
      return acc
    }, {})

    return [
      { label: 'New', value: byStage.New ?? 0 },
      { label: 'Qualified', value: byStage.Qualified ?? 0 },
      { label: 'Proposal', value: byStage.Proposal ?? 0 },
      { label: 'Negotiation', value: byStage.Negotiation ?? 0 },
      { label: 'Won', value: byStage.Won ?? 0 },
    ]
  }, [leads])

  const totalValue = useMemo(
    () => leads.reduce((sum, lead) => sum + lead.value, 0),
    [leads],
  )

  const wonValue = useMemo(
    () => leads.filter((lead) => lead.stage === 'Won').reduce((sum, lead) => sum + lead.value, 0),
    [leads],
  )

  const conversionRate = Math.round((pipeline.find((item) => item.label === 'Won').value / leads.length) * 100)

  const toMoney = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount)

  return (
    <main className="crm">
      <header className="hero">
        <p className="kicker">Smart CRM</p>
        <h1>Lead Tracking and Follow-Up Dashboard</h1>
        <p className="sub">
          Monitor your pipeline, track communications, and stay on top of reminders from one place.
        </p>
      </header>

      <section className="metrics">
        <article>
          <h2>Total Pipeline Value</h2>
          <p>{toMoney(totalValue)}</p>
        </article>
        <article>
          <h2>Won Revenue</h2>
          <p>{toMoney(wonValue)}</p>
        </article>
        <article>
          <h2>Conversion Rate</h2>
          <p>{conversionRate}%</p>
        </article>
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
                <th>Lead</th>
                <th>Contact</th>
                <th>Stage</th>
                <th>Value</th>
                <th>Last Touch</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <strong>{lead.name}</strong>
                    <small>{lead.id}</small>
                  </td>
                  <td>{lead.contact}</td>
                  <td>
                    <span className={`tag ${lead.stage.toLowerCase()}`}>{lead.stage}</span>
                  </td>
                  <td>{toMoney(lead.value)}</td>
                  <td>{lead.lastTouch}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="stack two-col">
        <article className="panel">
          <h2>Communication Log</h2>
          <ul className="log-list">
            {communicationLogs.map((entry) => (
              <li key={`${entry.lead}-${entry.time}`}>
                <div>
                  <strong>{entry.lead}</strong>
                  <span>{entry.channel}</span>
                </div>
                <p>{entry.note}</p>
                <small>
                  {entry.owner} - {entry.time}
                </small>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>Follow-Up Reminders</h2>
          <ul className="reminder-list">
            {reminders.map((item) => (
              <li key={`${item.lead}-${item.task}`}>
                <div>
                  <strong>{item.task}</strong>
                  <p>{item.lead}</p>
                </div>
                <time>{item.due}</time>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <footer className="panel footer">
        <h2>Conversion Report Snapshot</h2>
        <p>
          <strong>{pipeline.find((item) => item.label === 'Won').value}</strong> out of{' '}
          <strong>{leads.length}</strong> leads are closed-won this cycle.
        </p>
      </footer>
    </main>
  )
}

export default App
