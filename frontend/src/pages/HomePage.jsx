import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import SearchForm from '../components/SearchForm'
import JobCard from '../components/JobCard'
import StatCards from '../components/StatCards'
import { SkeletonJobList } from '../components/Skeleton'
import EmptyState, { SearchEmptyIcon, NoResultsIcon } from '../components/EmptyState'
import { searchJobs, updateJobStatus, createSavedSearch, updateSavedSearch, getTrackerEntries } from '../api/client'
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

export default function HomePage() {
  const location = useLocation()

  const [jobs, setJobs]                   = useState([])
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState(null)
  const [searched, setSearched]           = useState(false)
  const [lastCriteria, setLastCriteria]   = useState(null)
  const [hideStale, setHideStale]         = useState(false)
  const [expandedJobId, setExpandedJobId] = useState(null)
  const [followupsDue, setFollowupsDue]   = useState(null)
  const [recentlyDismissed, setRecentlyDismissed] = useState(() => new Set())
  const dismissTimers = useRef({})

  // Saved search editing state
  const [activeSavedSearch, setActiveSavedSearch] = useState(null) // { id, name } | null
  const [loadedCriteria, setLoadedCriteria]       = useState(null) // object | null

  useEffect(() => {
    getTrackerEntries()
      .then(entries => setFollowupsDue(countOverdueFollowups(entries)))
      .catch(() => setFollowupsDue(0))
  }, [])

  const handleSearch = useCallback(async function(criteria) {
    setLoading(true)
    setError(null)
    setExpandedJobId(null)
    try {
      const results = await searchJobs(criteria)
      setJobs(results)
      setSearched(true)
      setLastCriteria(criteria)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-run saved search navigated from sidebar or settings
  useEffect(() => {
    const state = location.state
    if (!state?.autoSearch) return
    window.history.replaceState({}, '')
    try {
      const criteria = JSON.parse(state.autoSearch)
      setLoadedCriteria(criteria)
      if (state.activeSavedSearch) setActiveSavedSearch(state.activeSavedSearch)
      handleSearch(criteria)
    } catch {
      // malformed criteria_json — ignore
    }
  }, [location.state?.autoSearch, handleSearch])

  async function handleSaveSearch({ name, ...criteria }) {
    try {
      const created = await createSavedSearch({
        name,
        criteria_json: JSON.stringify(criteria),
        schedule: 'off',
      })
      setActiveSavedSearch({ id: created.id, name: created.name })
      window.dispatchEvent(new CustomEvent('jobjames:search-saved'))
    } catch {
      // silent
    }
  }

  async function handleUpdateSavedSearch(criteria) {
    if (!activeSavedSearch) return
    await updateSavedSearch(activeSavedSearch.id, {
      criteria_json: JSON.stringify(criteria),
    })
    window.dispatchEvent(new CustomEvent('jobjames:search-saved'))
  }

  function handleClearActive() {
    setActiveSavedSearch(null)
    setLoadedCriteria(null)
  }

  async function handleStatusChange(jobId, status) {
    try {
      const updated = await updateJobStatus(jobId, status)
      if (status === 'dismissed') {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'dismissed' } : j))
        setRecentlyDismissed(prev => new Set([...prev, jobId]))
        const timer = setTimeout(() => {
          setJobs(prev => prev.filter(j => !(j.id === jobId && j.status === 'dismissed')))
          setRecentlyDismissed(prev => { const n = new Set(prev); n.delete(jobId); return n })
          delete dismissTimers.current[jobId]
        }, 5000)
        dismissTimers.current[jobId] = timer
        if (expandedJobId === jobId) setExpandedJobId(null)
      } else {
        setJobs(prev => prev.map(j => j.id === updated.id ? updated : j))
        if (recentlyDismissed.has(jobId)) {
          clearTimeout(dismissTimers.current[jobId])
          delete dismissTimers.current[jobId]
          setRecentlyDismissed(prev => { const n = new Set(prev); n.delete(jobId); return n })
        }
        window.dispatchEvent(new CustomEvent('jobjames:job-saved'))
      }
    } catch (err) {
      console.error('Status update failed', err)
    }
  }

  function handleExpand(jobId) {
    setExpandedJobId(prev => (prev === jobId ? null : jobId))
  }

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
        onSaveSearch={searched ? handleSaveSearch : null}
        loadedCriteria={loadedCriteria}
        activeSavedSearch={activeSavedSearch}
        onClearActive={handleClearActive}
        onUpdateSearch={activeSavedSearch ? handleUpdateSavedSearch : null}
      />

      {error && <p className="home-error">{error}</p>}

      {loading && <SkeletonJobList count={6} />}

      {!loading && searched && jobs.length === 0 && !error && (
        <EmptyState
          icon={<NoResultsIcon />}
          title="No results found"
          body="Try different keywords, a broader location, or remove some filters."
        />
      )}

      {!loading && !searched && (
        <EmptyState
          icon={<SearchEmptyIcon />}
          title="Search for jobs"
          body="Fill in your criteria above and hit Search to find matching listings."
        />
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
