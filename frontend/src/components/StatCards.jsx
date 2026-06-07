import InfoTooltip from './InfoTooltip'
import './StatCards.css'

function fmt(n) {
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`
  return `$${n}`
}

function median(arr) {
  if (!arr.length) return null
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? Math.round((s[mid - 1] + s[mid]) / 2) : s[mid]
}

function SalaryInsights({ jobs }) {
  const mids = jobs
    .filter(j => j.salary_min || j.salary_max)
    .map(j => {
      if (j.salary_min && j.salary_max) return (j.salary_min + j.salary_max) / 2
      return j.salary_min || j.salary_max
    })
  if (mids.length < 3) return null

  const min = Math.min(...mids)
  const max = Math.max(...mids)
  const med = median(mids)
  const range = max - min || 1
  const medPct = Math.round(((med - min) / range) * 100)

  return (
    <div className="salary-insights">
      <div className="salary-insights-header">
        <span className="salary-insights-label">Salary range</span>
        <span className="salary-insights-count">{mids.length} jobs with data</span>
      </div>
      <div className="salary-insights-bar">
        <div className="salary-bar-track">
          <div className="salary-bar-fill" />
          <div className="salary-bar-median" style={{ left: `${medPct}%` }} title={`Median: ${fmt(med)}`} />
        </div>
        <div className="salary-bar-labels">
          <span>{fmt(min)}</span>
          <span className="salary-med-label">{fmt(med)} median</span>
          <span>{fmt(max)}</span>
        </div>
      </div>
    </div>
  )
}

export default function StatCards({ jobs, followupsDue }) {
  const total  = jobs.length
  const remote = jobs.filter(j => j.remote).length
  const saved  = jobs.filter(j => j.status === 'saved').length
  const overdue = followupsDue > 0

  return (
    <div className="stat-cards-wrap">
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
          <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            Follow-ups Due{overdue ? ' ⚠' : ''}
            <InfoTooltip text="Tracker entries whose follow-up date has passed. Click the Tracker tab to review them." />
          </span>
        </div>
      </div>
      <SalaryInsights jobs={jobs} />
    </div>
  )
}
