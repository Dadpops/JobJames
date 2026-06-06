import { useState, useEffect } from 'react'
import JobCard from '../components/JobCard'
import { SkeletonJobList } from '../components/Skeleton'
import EmptyState, { SavedEmptyIcon } from '../components/EmptyState'
import { getSavedJobs, updateJobStatus, emailSavedJobs } from '../api/client'
import './SavedPage.css'

export default function SavedPage() {
  const [jobs, setJobs]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [expandedJobId, setExpanded] = useState(null)

  const [emailTo, setEmailTo] = useState('')
  const [emailState, setEmailState] = useState('idle') // idle | sending | sent | error
  const [emailError, setEmailError] = useState('')

  useEffect(() => {
    getSavedJobs()
      .then(setJobs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleStatusChange(jobId, status) {
    try {
      const updated = await updateJobStatus(jobId, status)
      if (status !== 'saved') {
        setJobs(prev => prev.filter(j => j.id !== jobId))
      } else {
        setJobs(prev => prev.map(j => j.id === updated.id ? updated : j))
      }
    } catch (e) {
      console.error('Status update failed', e)
    }
  }

  async function handleEmail(e) {
    e.preventDefault()
    setEmailState('sending')
    setEmailError('')
    try {
      await emailSavedJobs(emailTo)
      setEmailState('sent')
    } catch (err) {
      setEmailError(err.message)
      setEmailState('error')
    }
  }

  return (
    <div className="saved-page">
      <div className="saved-header">
        <div className="saved-title-row">
          <h2 className="saved-title">Saved Jobs</h2>
          {!loading && (
            <span className="saved-subtitle">
              {jobs.length} listing{jobs.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Email panel */}
        <form className="email-panel" onSubmit={handleEmail}>
          <input
            type="email"
            className="email-input"
            placeholder="your@email.com"
            value={emailTo}
            onChange={e => { setEmailTo(e.target.value); setEmailState('idle') }}
            required
          />
          <button
            type="submit"
            className="btn-email"
            disabled={emailState === 'sending' || jobs.length === 0}
          >
            {emailState === 'sending' ? 'Sending…' : emailState === 'sent' ? 'Sent!' : 'Email all saved'}
          </button>
          {emailState === 'error' && (
            <span className="email-error">{emailError}</span>
          )}
          {emailState === 'sent' && (
            <span className="email-success">Email sent to {emailTo}</span>
          )}
        </form>
      </div>

      {loading && <SkeletonJobList count={4} />}
      {error && <p className="saved-status saved-status--error">{error}</p>}

      {!loading && jobs.length === 0 && !error && (
        <EmptyState
          icon={<SavedEmptyIcon />}
          title="No saved jobs yet"
          body="Search for jobs and star any listing to save it here."
        />
      )}

      {jobs.length > 0 && (
        <div className="job-list">
          {jobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onStatusChange={handleStatusChange}
              isExpanded={expandedJobId === job.id}
              onExpand={id => setExpanded(prev => prev === id ? null : id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
