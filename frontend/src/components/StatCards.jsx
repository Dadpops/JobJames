import './StatCards.css'

export default function StatCards({ jobs, followupsDue }) {
  const total  = jobs.length
  const remote = jobs.filter(j => j.remote).length
  const saved  = jobs.filter(j => j.status === 'saved').length
  const overdue = followupsDue > 0

  return (
    <div className="stat-cards">
      <div className="stat-card">
        <span className="stat-value">{total}</span>
        <span className="stat-label">Results</span>
      </div>
      <div className="stat-card">
        <span className="stat-value stat-value-accent">{remote}</span>
        <span className="stat-label">Remote</span>
      </div>
      <div className="stat-card">
        <span className="stat-value stat-value-green">{saved}</span>
        <span className="stat-label">Saved</span>
      </div>
      <div className={`stat-card${overdue ? ' stat-card-alert' : ''}`}>
        <span className={`stat-value${overdue ? ' stat-value-red' : ' stat-value-faint'}`}>
          {followupsDue ?? '—'}
        </span>
        <span className="stat-label">
          Follow-ups Due{overdue ? ' ⚠' : ''}
        </span>
      </div>
    </div>
  )
}
