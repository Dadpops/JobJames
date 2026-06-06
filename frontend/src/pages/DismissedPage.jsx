import { useState, useEffect } from 'react'
import JobCard from '../components/JobCard'
import { getDismissedJobs, updateJobStatus } from '../api/client'
import './DismissedPage.css'

export default function DismissedPage() {
  const [jobs, setJobs]              = useState([])
  const [loading, setLoading]        = useState(true)
  const [error, setError]            = useState(null)
  const [expandedJobId, setExpanded] = useState(null)

  useEffect(() => {
    getDismissedJobs()
      .then(setJobs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleStatusChange(jobId, status) {
    try {
      const updated = await updateJobStatus(jobId, status)
      if (status !== 'dismissed') {
        setJobs(prev => prev.filter(j => j.id !== jobId))
      } else {
        setJobs(prev => prev.map(j => j.id === updated.id ? updated : j))
      }
    } catch (e) {
      console.error('Status update failed', e)
    }
  }

  return (
    <div className="dismissed-page">
      <div className="dismissed-header">
        <h2 className="dismissed-title">Dismissed Jobs</h2>
        {!loading && (
          <span className="dismissed-count">{jobs.length} listing{jobs.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {loading && <p className="dismissed-status">Loading…</p>}
      {error && <p className="dismissed-status dismissed-status--error">{error}</p>}

      {!loading && jobs.length === 0 && !error && (
        <div className="dismissed-empty">
          <p>No dismissed jobs.</p>
        </div>
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
