import { useState } from 'react'
import { addJobToTracker, emailJob } from '../api/client'
import './JobCard.css'

const BREAKDOWN_LABELS = {
  title_match:      'Title match',
  remote_bonus:     'Remote match',
  remote_penalty:   'Remote penalty',
  salary_min_match: 'Salary min',
  salary_max_match: 'Salary max',
  location_match:   'Location match',
}

function getInitials(company) {
  const words = (company || '').trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return (company || '--').slice(0, 2).toUpperCase()
}

function getAge(postedAt) {
  if (!postedAt) return null
  const posted = new Date(postedAt)
  if (isNaN(posted)) return null
  const days = Math.floor((Date.now() - posted.getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

function isStale(postedAt) {
  if (!postedAt) return false
  const posted = new Date(postedAt)
  if (isNaN(posted)) return false
  return (Date.now() - posted.getTime()) > 30 * 86400000
}

function ScoreBadge({ score }) {
  const s = Math.round(score)
  let cls = 'score-gray'
  if (s >= 80) cls = 'score-green'
  else if (s >= 60) cls = 'score-amber'
  return <span className={`score-badge ${cls}`}>{s}</span>
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
  const age = getAge(job.posted_at)
  const initials = getInitials(job.company)
  const breakdown = job.score_breakdown || {}
  const hasBreakdown = Object.keys(breakdown).length > 0
  const extraSources = (job.sources || []).filter(s => s !== job.source)

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
    <article className={`job-card${stale ? ' job-card-stale' : ''}`}>
      <div className="job-card-main">
        {/* Logo */}
        <div className="job-logo" title={job.company}>{initials}</div>

        {/* Center */}
        <div className="job-center">
          <div className="job-title-row">
            <a className="job-title" href={job.url} target="_blank" rel="noopener noreferrer">
              {job.title}
            </a>
          </div>
          <div className="job-meta">
            <span>{job.company}</span>
            {job.location && <><span className="meta-sep">·</span><span>{job.location}</span></>}
            {job.salary_min > 0 && (
              <><span className="meta-sep">·</span>
              <span className="meta-salary">
                ${job.salary_min.toLocaleString()}
                {job.salary_max > 0 ? ` – $${job.salary_max.toLocaleString()}` : '+'}
              </span></>
            )}
            {age && <><span className="meta-sep">·</span><span>{age}</span></>}
          </div>
          <div className="job-tags">
            {job.remote && <span className="tag-chip tag-remote">Remote</span>}
            {stale && <span className="tag-chip tag-stale">Stale</span>}
            {job.status === 'saved' && <span className="tag-chip tag-saved">Saved</span>}
            {job.status === 'dismissed' && <span className="tag-chip tag-dismissed">Dismissed</span>}
          </div>
        </div>

        {/* Right */}
        <div className="job-right">
          <button
            className={`score-badge-btn${hasBreakdown ? ' score-clickable' : ''}`}
            onClick={() => hasBreakdown && setShowBreakdown(v => !v)}
            title={hasBreakdown ? 'Score breakdown' : 'Match score'}
          >
            <ScoreBadge score={job.score} />
          </button>
          <span className="source-pill">{job.source}</span>
          {extraSources.map(s => <span key={s} className="source-pill source-pill-extra">{s}</span>)}
          <button
            className={`btn-save-inline ${job.status === 'saved' ? 'saved' : ''}`}
            onClick={() => onStatusChange(job.id, job.status === 'saved' ? 'new' : 'saved')}
          >
            {job.status === 'saved' ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {showBreakdown && hasBreakdown && (
        <ul className="score-breakdown">
          {Object.entries(breakdown).map(([k, v]) => (
            <li key={k} className={v < 0 ? 'bd-neg' : 'bd-pos'}>
              <span>{BREAKDOWN_LABELS[k] || k}</span>
              <span>{v > 0 ? '+' : ''}{v}</span>
            </li>
          ))}
        </ul>
      )}

      {job.description_snippet && (
        <p className="job-snippet">{job.description_snippet}</p>
      )}

      <div className="job-actions">
        <a className="btn-act btn-apply" href={job.url} target="_blank" rel="noopener noreferrer">
          Apply
        </a>
        <button
          className="btn-act btn-dismiss"
          disabled={job.status === 'dismissed'}
          onClick={() => onStatusChange(job.id, 'dismissed')}
        >
          Dismiss
        </button>
        <button
          className={`btn-act btn-track${tracked ? ' tracked' : ''}`}
          disabled={tracked || tracking}
          onClick={handleTrack}
        >
          {tracked ? 'In Tracker' : 'Track'}
        </button>
        <button
          className="btn-act btn-email-toggle"
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
              <button type="submit" className="btn-act btn-email-send" disabled={emailState === 'sending'}>
                {emailState === 'sending' ? 'Sending…' : 'Send'}
              </button>
              <button type="button" className="btn-act" onClick={() => setShowEmail(false)}>✕</button>
            </>
          )}
          {emailState === 'error' && <span className="email-error">{emailError}</span>}
        </form>
      )}
    </article>
  )
}
