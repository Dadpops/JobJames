import { useEffect, useState, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getSavedSearches, getTrackerEntries, getSavedJobs } from '../api/client'
import InfoTooltip from './InfoTooltip'
import './Sidebar.css'

// Consumed by: App.jsx (always mounted)
const PIPELINE_COLORS = {
  Found: '#6e6af0', Reviewing: '#c4843a', Applied: '#6db85c',
  Interviewing: '#a09cf7', Offer: '#6db85c', Rejected: '#e05c6a', Dismissed: '#3a3a42',
}

const PIPELINE_STATUSES = ['Found', 'Reviewing', 'Applied', 'Interviewing', 'Offer', 'Rejected', 'Dismissed']

export default function Sidebar({ isOpen, onToggle }) {
  const [searches, setSearches]   = useState([])
  const [pipeline, setPipeline]   = useState([])
  const [savedCount, setSavedCount] = useState(0)
  const location  = useLocation()
  const navigate  = useNavigate()

  // Refresh all sidebar data — called on mount, location changes, and custom events
  const refresh = useCallback(() => {
    getSavedSearches().then(setSearches).catch(() => {})

    getTrackerEntries().then(entries => {
      const counts = {}
      PIPELINE_STATUSES.forEach(s => { counts[s] = 0 })
      entries.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1 })
      setPipeline(PIPELINE_STATUSES.map(s => [s, counts[s]]).filter(([, c]) => c > 0))
    }).catch(() => {})

    getSavedJobs().then(jobs => setSavedCount(jobs.length)).catch(() => {})
  }, [])

  // Refresh on every route change and on save events from the search/save flows
  useEffect(() => { refresh() }, [location.pathname, refresh])

  useEffect(() => {
    window.addEventListener('jobjames:search-saved', refresh)
    window.addEventListener('jobjames:job-saved', refresh)
    return () => {
      window.removeEventListener('jobjames:search-saved', refresh)
      window.removeEventListener('jobjames:job-saved', refresh)
    }
  }, [refresh])

  // Navigate to Tracker with a pre-set status filter via router state
  function goToTracker(status) {
    navigate('/tracker', { state: { filterStatus: status } })
  }

  // Execute a saved search by passing its criteria to the home page via router state
  function runSearch(search) {
    navigate('/', { state: { autoSearch: search.criteria_json } })
  }

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <button className="sidebar-toggle" onClick={onToggle} title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          {isOpen
            ? <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            : <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          }
        </svg>
      </button>

      {isOpen && (
        <div className="sidebar-content">
          {/* Views */}
          <div className="sidebar-section">
            <div className="sidebar-section-label">
              Views
            </div>
            <Link to="/saved" className={`sidebar-item sidebar-item-count ${location.pathname === '/saved' ? 'sidebar-item-active' : ''}`}>
              <span>Saved Jobs</span>
              {savedCount > 0 && <span className="sidebar-count">{savedCount}</span>}
            </Link>
            <Link to="/dismissed" className={`sidebar-item sidebar-item-count ${location.pathname === '/dismissed' ? 'sidebar-item-active' : ''}`}>
              <span>Dismissed</span>
              <InfoTooltip text="Jobs you've dismissed from search results. Click Undo on any card to restore it." />
            </Link>
          </div>

          {/* Saved Searches — clicking executes the search */}
          {searches.length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">
                Saved Searches
                <InfoTooltip text="Saved searches run your criteria instantly. Click any search to populate the results page. Manage schedules and email delivery in Settings." />
              </div>
              {searches.map(s => (
                <button
                  key={s.id}
                  className="sidebar-item sidebar-item-search sidebar-item-btn"
                  onClick={() => runSearch(s)}
                  title={`Run: ${s.name}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          {/* Pipeline — clicking opens Tracker filtered to that status */}
          {pipeline.length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">
                Pipeline
                <InfoTooltip text="Your application pipeline. Click a status to open the Tracker filtered to those jobs. Counts update each time you navigate." />
              </div>
              {pipeline.map(([status, count]) => (
                <button
                  key={status}
                  className="sidebar-pipeline-row sidebar-pipeline-btn"
                  onClick={() => goToTracker(status)}
                  title={`View ${status} in Tracker`}
                >
                  <span className="sidebar-pipeline-dot" style={{ background: PIPELINE_COLORS[status] || 'var(--text-faint)' }} />
                  <span className="sidebar-pipeline-label">{status}</span>
                  <span className="sidebar-pipeline-count">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
