import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import SearchForm from '../components/SearchForm'
import JobCard from '../components/JobCard'
import StatCards from '../components/StatCards'
import ActivityFeed from '../components/ActivityFeed'
import { SkeletonJobList } from '../components/Skeleton'
import EmptyState, { SearchEmptyIcon, NoResultsIcon } from '../components/EmptyState'
import { searchJobs, updateJobStatus, createSavedSearch, updateSavedSearch, getTrackerEntries } from '../api/client'
import './HomePage.css'

const SHORTCUTS = [
  { key: 'j / ↓', desc: 'Next job' },
  { key: 'k / ↑', desc: 'Previous job' },
  { key: 'Enter / Space', desc: 'Expand / collapse job' },
  { key: 's', desc: 'Save / unsave focused job' },
  { key: 'd', desc: 'Dismiss focused job' },
  { key: '/', desc: 'Focus search input' },
  { key: '?', desc: 'Show this help' },
  { key: 'Esc', desc: 'Close overlay / collapse' },
]

function ShortcutsOverlay({ onClose }) {
  return (
    <div className="shortcuts-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="shortcuts-panel">
        <div className="shortcuts-header">
          <span className="shortcuts-title">Keyboard Shortcuts</span>
          <button className="shortcuts-close" onClick={onClose}>✕</button>
        </div>
        <ul className="shortcuts-list">
          {SHORTCUTS.map(({ key, desc }) => (
            <li key={key} className="shortcuts-item">
              <kbd className="shortcuts-kbd">{key}</kbd>
              <span className="shortcuts-desc">{desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

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
  const [focusedJobIdx, setFocusedJobIdx] = useState(-1)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [followupsDue, setFollowupsDue]   = useState(null)
  const [activityKey, setActivityKey]     = useState(0)
  const [recentlyDismissed, setRecentlyDismissed] = useState(() => new Set())
  const dismissTimers = useRef({})
  const searchInputRef = useRef(null)

  // Saved search editing state
  const [activeSavedSearch, setActiveSavedSearch] = useState(null) // { id, name } | null
  const [loadedCriteria, setLoadedCriteria]       = useState(null) // object | null

  useEffect(() => {
    getTrackerEntries()
      .then(entries => setFollowupsDue(countOverdueFollowups(entries)))
      .catch(() => setFollowupsDue(0))
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable
      if (e.key === 'Escape') { setShowShortcuts(false); return }
      if (e.key === '?') { setShowShortcuts(v => !v); return }
      if (inInput) return
      if (e.key === '/' || e.key === 'f') {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }
      setFocusedJobIdx(idx => {
        const list = document.querySelectorAll('[data-job-idx]')
        const count = list.length
        if (!count) return idx
        if (e.key === 'j' || e.key === 'ArrowDown') {
          e.preventDefault()
          const next = Math.min(idx + 1, count - 1)
          list[next]?.scrollIntoView({ block: 'nearest' })
          return next
        }
        if (e.key === 'k' || e.key === 'ArrowUp') {
          e.preventDefault()
          const next = Math.max(idx - 1, 0)
          list[next]?.scrollIntoView({ block: 'nearest' })
          return next
        }
        if ((e.key === 'Enter' || e.key === ' ') && idx >= 0) {
          e.preventDefault()
          list[idx]?.click()
          return idx
        }
        return idx
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleSearch = useCallback(async function(criteria) {
    setLoading(true)
    setError(null)
    setExpandedJobId(null)
    // Request notification permission on first search
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
    try {
      const results = await searchJobs(criteria)
      setJobs(results)
      setSearched(true)
      setLastCriteria(criteria)
      setActivityKey(k => k + 1)
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification('JobJames search complete', {
          body: `Found ${results.length} job${results.length !== 1 ? 's' : ''} for "${criteria.title}"`,
          icon: '/favicon.ico',
        })
      }
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
      setActivityKey(k => k + 1)
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
      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}
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
        searchInputRef={searchInputRef}
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
        <>
          <EmptyState
            icon={<SearchEmptyIcon />}
            title="Search for jobs"
            body="Fill in your criteria above and hit Search to find matching listings."
          />
          <ActivityFeed refreshKey={activityKey} />
        </>
      )}

      {!loading && jobs.length > 0 && (
        <div className="results">
          <StatCards jobs={jobs} followupsDue={followupsDue} />
          <ActivityFeed refreshKey={activityKey} />
          <div className="job-list">
            {displayJobs.map((job, idx) => (
              <div key={job.id} data-job-idx={idx}>
                <JobCard
                  job={job}
                  onStatusChange={handleStatusChange}
                  isExpanded={expandedJobId === job.id}
                  onExpand={handleExpand}
                  isFocused={focusedJobIdx === idx}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
