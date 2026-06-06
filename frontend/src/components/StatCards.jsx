import './StatCards.css'

export default function StatCards({ jobs }) {
  const total   = jobs.length
  const remote  = jobs.filter(j => j.remote).length
  const saved   = jobs.filter(j => j.status === 'saved').length
  const avgScore = total > 0
    ? Math.round(jobs.reduce((s, j) => s + (j.score || 0), 0) / total)
    : 0

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
      <div className="stat-card">
        <span className={`stat-value ${avgScore >= 80 ? 'stat-value-green' : avgScore >= 60 ? 'stat-value-amber' : 'stat-value-faint'}`}>
          {avgScore}
        </span>
        <span className="stat-label">Avg Score</span>
      </div>
    </div>
  )
}
