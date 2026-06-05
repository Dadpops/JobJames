import { useState } from 'react'
import StatusBadge from './StatusBadge'
import { addJobToTracker } from '../api/client'
import './JobCard.css'

export default function JobCard({ job, onStatusChange }) {
  const [tracked, setTracked] = useState(false)
  const [tracking, setTracking] = useState(false)

  async function handleTrack() {
    setTracking(true)
    try {
      await addJobToTracker(job.id)
      setTracked(true)
    } catch {
      // silently fail — job may already be in tracker
      setTracked(true)
    } finally {
      setTracking(false)
    }
  }

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
          className={`btn-action ${job.status === 'saved' ? 'btn-unsave' : 'btn-save'}`}
          onClick={() => onStatusChange(job.id, job.status === 'saved' ? 'new' : 'saved')}
        >
          {job.status === 'saved' ? 'Unsave' : 'Save'}
        </button>
        <button
          className="btn-action btn-dismiss"
          disabled={job.status === 'dismissed'}
          onClick={() => onStatusChange(job.id, 'dismissed')}
        >
          Dismiss
        </button>
        <button
          className={`btn-action btn-track ${tracked ? 'btn-tracked' : ''}`}
          disabled={tracked || tracking}
          onClick={handleTrack}
        >
          {tracked ? 'In Tracker' : 'Save to Tracker'}
        </button>
      </div>
    </article>
  )
}
