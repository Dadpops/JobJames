import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import SearchForm from '../components/SearchForm'
import JobCard from '../components/JobCard'
import StatCards from '../components/StatCards'
import { searchJobs, updateJobStatus, createSavedSearch, getTrackerEntries, runSavedSearch } from '../api/client'
import './HomePage.css'

function isStaleJob(job) {
  if (!job.posted_at) return false
  const posted = new Date(job.posted_at)
  if (isNaN(posted)) return false
  return (Date.now() - posted.getTime()) > 30 * 86400000
}

function countOverdueFollowups(entries) {
  const today = new Date().toISOString().slice(0, 10)
  return entries.filter(e =>
    e.status !== 'Dismissed' &&
    e.followup_date &&
    e.followup_date < today
  ).length
}

// UNDO_DELAY: milliseconds a dismissed card stays visible with "Undo" button
const UNDO_DELAY = 5000

export default function HomePage() {
  const [jobs, setJobs]               = useState([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [searched, setSearched]       = useState(false)
  const [lastCriteria, setLast]       = useState(null)
  const [hideStale, setHideStale]     = useState(false)
  const [expandedJobId, setExpanded]  = useState(null)
  const [followupsDue, setFollowups]  = useState(null)
  // Set of job IDs currently in the undo-dismiss window (still visible but marked dismissed)
  const [recentlyDismissed, setRecentlyDismissed] = useState(() => new Set())
  const dismissTimers = useRef({})

  const location = useLocation()

  useEffect(() => {
    getTrackerEntries()
      .then(entries => setFollowups(countOverdueFollowups(entries)))
      .catch(() => setFollowups(0))
  }, [])

  // Auto-run a saved search when the sidebar passes criteria via router state
  useEffect(() => {
    const state = location.state
    if (!state?.autoSearch) return
    // Clear router state so navigating back doesn't re-run
    window.history.replaceState({}, '')
    try {
      const criteria = typeof state.autoSearch === 'string'
        ? JSON.parse(state.autoSearch)
        : state.autoSearch
      handleSearch(criteria)
    } catch {
      // malformed criteria — ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.autoSearch])

  async function handleSearch(criteria) {
    setLoading(true)
    setError(null)
    setExpanded(null)
    setRecentlyDismissed(new Set())
    try {
      const results = await searchJobs(criteria)
      setJobs(results)
      setSearched(true)
      setLast(criteria)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveSearch({ name, ...criteria }) {
    try {
      await createSavedSearch({
        name,
        criteria_json: JSON.stringify(criteria),
        schedule: 'off',
      })
      // Notify the sidebar so it refreshes its saved-search list immediately
      window.dispatchEvent(new CustomEvent('jobjames:search-saved'))
    } catch {
      // silent
    }
  }

  // Handles star (save/unsave) and dismiss/undo from JobCard
  async function handleStatusChange(jobId, status) {
    try {
      const updated = await updateJobStatus(jobId, status)

      if (status === 'dismissed') {
        // Update job status in state (keep it in the list for the undo window)
        setJobs(prev => prev.map(j => j.id === jobId ? updated : j))
        setRecentlyDismissed(prev => new Set([...prev, jobId]))
        if (expandedJobId === jobId) setExpanded(null)

        // After UNDO_DELAY, remove job from list if it is still dismissed
        const timer = setTimeout(() => {
          setJobs(prev => prev.filter(j => !(j.id === jobId && j.status === 'dismissed')))
          setRecentlyDismissed(prev => { const n = new Set(prev); n.delete(jobId); return n })
          delete dismissTimers.current[jobId]
        }, UNDO_DELAY)
        dismissTimers.current[jobId] = timer

      } else {
        // Save/unsave or undo-dismiss
        setJobs(prev => prev.map(j => j.id === updated.id ? updated : j))
        if (recentlyDismissed.has(jobId)) {
          // User undid the dismiss — cancel the removal timer
          clearTimeout(dismissTimers.current[jobId])
          delete dismissTimers.current[jobId]
          setRecentlyDismissed(prev => { const n = new Set(prev); n.delete(jobId); return n })
        }
        // Notify sidebar to refresh saved-job count
        window.dispatchEvent(new CustomEvent('jobjames:job-saved'))
      }
    } catch (err) {
      console.error('Status update failed', err)
    }
  }

  function handleExpand(jobId) {
    setExpanded(prev => (prev === jobId ? null : jobId))
  }

  // Show all jobs except dismissed ones that are past the undo window
  const displayJobs = (hideStale ? jobs.filter(j => !isStaleJob(j)) : jobs)
    .filter(j => j.status !== 'dismissed' || recentlyDismissed.has(j.id))

  return (
    <div className="home">
      <SearchForm
        onSearch={handleSearch}
        loading={loading}
        resultCount={searched && !loading ? displayJobs.length : null}
        hideStale={hideStale}
        onToggleStale={() => setHideStale(v => !v)}
        onSaveSearch={lastCriteria ? handleSaveSearch : null}
      />

      {error && <p className="home-error">{error}</p>}

      {loading && (
        <div className="search-loading">
          <span className="spinner" />
          <span>Searching across job boards…</span>
        </div>
      )}

      {searched && !loading && jobs.length === 0 && (
        <p className="home-empty">No results found. Try broadening your search.</p>
      )}

      {!loading && jobs.length > 0 && (
        <div className="results">
          <StatCards jobs={jobs} followupsDue={followupsDue} />
          <div className="job-list">
            {displayJobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onStatusChange={handleStatusChange}
                isExpanded={expandedJobId === job.id}
                onExpand={handleExpand}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
