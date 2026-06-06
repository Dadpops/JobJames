import { useState } from 'react'
import { addJobToTracker, updateTrackerEntry, emailJob } from '../api/client'
import './JobCard.css'

// Consumed by: HomePage, SavedPage, DismissedPage
const TRACKER_STATUSES = ['Found', 'Reviewing', 'Applied', 'Interviewing', 'Offer', 'Rejected']

function StarIcon({ filled }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24"
      fill={filled ? '#f0c040' : 'none'}
      stroke={filled ? '#f0c040' : 'currentColor'}
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

function ChevronUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  )
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

function isStaleDate(postedAt) {
  if (!postedAt) return false
  const posted = new Date(postedAt)
  if (isNaN(posted)) return false
  return (Date.now() - posted.getTime()) > 30 * 86400000
}

export default function JobCard({ job, onStatusChange, isExpanded = false, onExpand = () => {} }) {
  const [trackStatus, setTrackStatus]   = useState('Found')
  const [trackNotes, setTrackNotes]     = useState('')
  const [tracked, setTracked]           = useState(false)
  const [tracking, setTracking]         = useState(false)
  const [showEmail, setShowEmail]       = useState(false)
  const [emailAddr, setEmailAddr]       = useState('')
  const [emailState, setEmailState]     = useState('idle')
  const [emailError, setEmailError]     = useState('')

  const stale        = isStaleDate(job.posted_at)
  const age          = getAge(job.posted_at)
  const extraSources = (job.sources || []).filter(s => s !== job.source)
  const isDismissed  = job.status === 'dismissed'

  const hasSalary = job.salary_min > 0
  const salaryText = hasSalary
    ? `$${job.salary_min.toLocaleString()}${job.salary_max > 0 ? ` – $${job.salary_max.toLocaleString()}` : '+'}`
    : null

  function handleCardClick(e) {
    if (e.target.closest('button, a, input, select, textarea')) return
    onExpand(job.id)
  }

  function handleStar(e) {
    e.stopPropagation()
    onStatusChange(job.id, job.status === 'saved' ? 'new' : 'saved')
  }

  function handleDismiss(e) {
    e.stopPropagation()
    onStatusChange(job.id, 'dismissed')
  }

  // Undo dismiss — restores the job back to 'new'; parent removes it from the dismissed view
  function handleUndo(e) {
    e.stopPropagation()
    onStatusChange(job.id, 'new')
  }

  async function handleTrack(e) {
    e.stopPropagation()
    if (tracked || tracking) return
    setTracking(true)
    try {
      const entry = await addJobToTracker(job.id)
      if (trackStatus !== 'Found' || trackNotes.trim()) {
        await updateTrackerEntry(entry.id, {
          ...(trackStatus !== 'Found' ? { status: trackStatus } : {}),
          ...(trackNotes.trim() ? { notes: trackNotes.trim() } : {}),
        })
      }
      setTracked(true)
    } catch {
      setTracked(true)
    } finally {
      setTracking(false)
    }
  }

  async function handleSendEmail(e) {
    e.preventDefault()
    e.stopPropagation()
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
    <article
      className={`job-card${stale ? ' job-card-stale' : ''}${isExpanded ? ' job-card-open' : ''}${isDismissed ? ' job-card-dismissed' : ''}`}
      onClick={handleCardClick}
    >
      {/* ── Collapsed header ──────────────────────────────────── */}
      <div className="job-card-main">
        {/* Star — disabled while in dismissed state */}
        <button
          className={`btn-star${job.status === 'saved' ? ' star-saved' : ''}`}
          onClick={handleStar}
          disabled={isDismissed}
          title={job.status === 'saved' ? 'Unsave' : 'Save'}
        >
          <StarIcon filled={job.status === 'saved'} />
        </button>

        {/* Center */}
        <div className="job-center">
          <span className="job-title">{job.title}</span>

          <div className="job-meta">
            <span className="meta-company">{job.company}</span>
            {job.location && <><span className="meta-sep">·</span><span>{job.location}</span></>}
            {job.remote && <><span className="meta-sep">·</span><span className="tag-chip tag-remote tag-chip-inline">Remote</span></>}
            <span className="meta-sep">·</span>
            {hasSalary
              ? <span className="meta-salary">{salaryText}</span>
              : <span className="meta-no-salary">Salary not listed</span>
            }
            {age && <><span className="meta-sep">·</span><span className="meta-age">{age}</span></>}
            <span className="meta-sep">·</span>
            <span className="source-pill">{job.source}</span>
            {extraSources.map(s => <span key={s} className="source-pill source-pill-extra">{s}</span>)}
          </div>

          <div className="job-tags">
            {stale && <span className="tag-chip tag-stale">Stale</span>}
            {job.status === 'saved' && <span className="tag-chip tag-saved">Saved</span>}
            {isDismissed && <span className="tag-chip tag-dismissed">Dismissed</span>}
          </div>

          {job.description_snippet && (
            <p className="job-snippet">{job.description_snippet}</p>
          )}
        </div>

        {/* Right — dismiss or undo */}
        <div className="job-right">
          {isDismissed ? (
            <button className="btn-act btn-undo-dismiss" onClick={handleUndo}>
              Undo
            </button>
          ) : (
            <button className="btn-act btn-dismiss-quick" onClick={handleDismiss}>
              Dismiss
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded content ──────────────────────────────────── */}
      {!isDismissed && (
        <div className={`job-expanded${isExpanded ? ' job-expanded-open' : ''}`}>
          <div className="job-expanded-inner">
            <div className="expanded-divider" />

            {/* Full description */}
            {job.description_snippet && (
              <div className="expanded-section">
                <p className="expanded-description">{job.description_snippet}</p>
              </div>
            )}

            {/* Detail grid */}
            <div className="expanded-details">
              {job.company  && <div className="detail-pair"><span className="detail-label">Company</span><span className="detail-val">{job.company}</span></div>}
              {job.location && <div className="detail-pair"><span className="detail-label">Location</span><span className="detail-val">{job.location}{job.remote ? ' (Remote)' : ''}</span></div>}
              <div className="detail-pair">
                <span className="detail-label">Salary</span>
                <span className={`detail-val${hasSalary ? ' detail-salary' : ' detail-muted'}`}>
                  {hasSalary ? salaryText : 'Not listed'}
                </span>
              </div>
              {age && <div className="detail-pair"><span className="detail-label">Posted</span><span className="detail-val">{age}</span></div>}
              <div className="detail-pair"><span className="detail-label">Source</span><span className="detail-val" style={{textTransform:'capitalize'}}>{[job.source, ...extraSources].join(', ')}</span></div>
            </div>

            {/* Actions */}
            <div className="expanded-actions">
              <a className="btn-act btn-apply" href={job.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                Apply ↗
              </a>
              <button
                className={`btn-act btn-star-act${job.status === 'saved' ? ' saved' : ''}`}
                onClick={handleStar}
              >
                <StarIcon filled={job.status === 'saved'} />
                {job.status === 'saved' ? 'Saved' : 'Save'}
              </button>
              <button
                className="btn-act btn-email-toggle"
                onClick={e => { e.stopPropagation(); setShowEmail(v => !v); setEmailState('idle'); setEmailError('') }}
              >
                Email
              </button>
            </div>

            {/* Email popover */}
            {showEmail && (
              <form className="email-popover" onSubmit={handleSendEmail} onClick={e => e.stopPropagation()}>
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

            {/* Tracker section */}
            <div className="expanded-tracker" onClick={e => e.stopPropagation()}>
              <span className="expanded-tracker-label">Add to Tracker</span>
              <select
                className="tracker-status-select"
                value={trackStatus}
                onChange={e => setTrackStatus(e.target.value)}
                disabled={tracked}
              >
                {TRACKER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <textarea
                className="tracker-notes-input"
                placeholder="Notes (optional)…"
                value={trackNotes}
                onChange={e => setTrackNotes(e.target.value)}
                rows={2}
                disabled={tracked}
              />
              <button
                className={`btn-act btn-track-expanded${tracked ? ' tracked' : ''}`}
                onClick={handleTrack}
                disabled={tracked || tracking}
              >
                {tracked ? '✓ In Tracker' : tracking ? 'Adding…' : '+ Add to Tracker'}
              </button>
            </div>

            {/* Collapse chevron */}
            <button className="btn-collapse" onClick={e => { e.stopPropagation(); onExpand(job.id) }}>
              <ChevronUpIcon />
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
