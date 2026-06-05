import { useState } from 'react'
import StatusBadge from './StatusBadge'
import { addJobToTracker, emailJob } from '../api/client'
import './JobCard.css'

const BREAKDOWN_LABELS = {
  title_match:      'Title match',
  remote_bonus:     'Remote match',
  remote_penalty:   'Remote penalty',
  salary_min_match: 'Salary min match',
  salary_max_match: 'Salary max match',
  location_match:   'Location match',
}

function isStale(postedAt) {
  if (!postedAt) return false
  const posted = new Date(postedAt)
  if (isNaN(posted)) return false
  return (Date.now() - posted.getTime()) > 30 * 24 * 60 * 60 * 1000
}

export default function JobCard({ job, onStatusChange }) {
  const [tracked, setTracked] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [emailAddr, setEmailAddr] = useState('')
  const [emailState, setEmailState] = useState('idle')
  const [emailError, setEmailError] = useState('')
  const [showBreakdown, setShowBreakdown] = useState(false)

  const stale = isStale(job.posted_at)
  const extraSources = (job.sources || []).filter(s => s !== job.source)
  const breakdown = job.score_breakdown || {}
  const hasBreakdown = Object.keys(breakdown).length > 0

  async function handleTrack() {
    setTracking(true)
    try { await addJobToTracker(job.id); setTracked(true) }
    catch { setTracked(true) }
    finally { setTracking(false) }
  }

  async function handleSendEmail(e) {
    e.preventDefault()
    if (!emailAddr.trim()) return
    setEmailState('sending')
    setEmailError('')
    try {
      await emailJob(job.id, emailAddr.trim())
      setEmailState('sent')
      setTimeout(() => { setShowEmail(false); setEmailState('idle'); setEmailAddr('') }, 2000)
    } catch (err) {
      setEmailState('error')
      setEmailError(err.message)
    }
  }

  return (
    <article className="job-card">
      <div className="job-card-top">
        <div>
          <div className="job-title-row">
            <a className="job-title" href={job.url} target="_blank" rel="noopener noreferrer">
              {job.title}
            </a>
            {stale && <span className="tag-stale" title="Posted more than 30 days ago">Stale</span>}
          </div>
          <div className="job-meta">
            <span>{job.company}</span>
            {job.location && <span>{job.location}</span>}
            {job.remote && <span className="tag-remote">Remote</span>}
            <span className="tag-source">{job.source}</span>
            {extraSources.map(s => (
              <span key={s} className="tag-source tag-source-extra">{s}</span>
            ))}
          </div>
        </div>
        <div className="job-card-right">
          <button
            className={`job-score ${hasBreakdown ? 'job-score-clickable' : ''}`}
            title={hasBreakdown ? 'Click to see score breakdown' : 'Relevance score'}
            onClick={() => hasBreakdown && setShowBreakdown(v => !v)}
          >
            {job.score.toFixed(0)}
            {hasBreakdown && <span className="breakdown-arrow">{showBreakdown ? '▲' : '▼'}</span>}
          </button>
          <StatusBadge status={job.status} />
        </div>
      </div>

      {showBreakdown && hasBreakdown && (
        <ul className="score-breakdown">
          {Object.entries(breakdown).map(([k, v]) => (
            <li key={k} className={v < 0 ? 'breakdown-neg' : 'breakdown-pos'}>
              <span>{BREAKDOWN_LABELS[k] || k}</span>
              <span>{v > 0 ? '+' : ''}{v}</span>
            </li>
          ))}
        </ul>
      )}

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
        <a className="btn-action btn-apply" href={job.url} target="_blank" rel="noopener noreferrer">
          Apply
        </a>
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
        <button
          className="btn-action btn-email"
          onClick={() => { setShowEmail(v => !v); setEmailState('idle'); setEmailError('') }}
        >
          Email
        </button>
      </div>

      {showEmail && (
        <form className="email-popover" onSubmit={handleSendEmail}>
          {emailState === 'sent' ? (
            <span className="email-sent">Sent!</span>
          ) : (
            <>
              <input
                type="email"
                className="email-input"
                placeholder="you@example.com"
                value={emailAddr}
                onChange={e => setEmailAddr(e.target.value)}
                autoFocus
                required
              />
              <button type="submit" className="btn-action btn-email-send" disabled={emailState === 'sending'}>
                {emailState === 'sending' ? 'Sending…' : 'Send'}
              </button>
              <button type="button" className="btn-action btn-email-cancel" onClick={() => setShowEmail(false)}>
                ✕
              </button>
            </>
          )}
          {emailState === 'error' && <span className="email-error">{emailError}</span>}
        </form>
      )}
    </article>
  )
}
