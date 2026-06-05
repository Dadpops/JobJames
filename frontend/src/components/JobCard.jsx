import StatusBadge from './StatusBadge'
import './JobCard.css'

export default function JobCard({ job, onStatusChange }) {
  return (
    <article className="job-card">
      <div className="job-card-top">
        <div>
          <a className="job-title" href={job.url} target="_blank" rel="noopener noreferrer">
            {job.title}
          </a>
          <div className="job-meta">
            <span>{job.company}</span>
            {job.location && <span>{job.location}</span>}
            {job.remote && <span className="tag-remote">Remote</span>}
            <span className="tag-source">{job.source}</span>
          </div>
        </div>
        <div className="job-card-right">
          <span className="job-score" title="Relevance score">{job.score.toFixed(0)}</span>
          <StatusBadge status={job.status} />
        </div>
      </div>

      {job.description_snippet && (
        <p className="job-snippet">{job.description_snippet}</p>
      )}

      {(job.salary_min || job.salary_max) && (
        <p className="job-salary">
          {job.salary_min && `$${job.salary_min.toLocaleString()}`}
          {job.salary_min && job.salary_max && ' – '}
          {job.salary_max && `$${job.salary_max.toLocaleString()}`}
        </p>
      )}

      <div className="job-actions">
        <button
          className="btn-action btn-save"
          disabled={job.status === 'saved'}
          onClick={() => onStatusChange(job.id, 'saved')}
        >
          Save
        </button>
        <button
          className="btn-action btn-dismiss"
          disabled={job.status === 'dismissed'}
          onClick={() => onStatusChange(job.id, 'dismissed')}
        >
          Dismiss
        </button>
      </div>
    </article>
  )
}
