import { useEffect, useState, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getSavedSearches, getSavedJobs, getTrackerEntries, updateSavedSearch } from '../api/client'
import './Sidebar.css'

const PIPELINE_COLORS = {
  Found: '#6e6af0', Reviewing: '#c4843a', Applied: '#6db85c',
  Interviewing: '#a09cf7', Offer: '#6db85c', Rejected: '#e05c6a',
}

const PIPELINE_STATUSES = ['Found', 'Reviewing', 'Applied', 'Interviewing', 'Offer', 'Rejected']

function SearchItem({ search, onRun, onRename }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(search.name)

  function commitRename() {
    const name = draft.trim()
    if (name && name !== search.name) onRename(search.id, name)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="sidebar-search-item">
        <input
          autoFocus
          className="sidebar-rename-input"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') { setEditing(false); setDraft(search.name) }
          }}
        />
      </div>
    )
  }

  return (
    <div className="sidebar-search-item">
      <button className="sidebar-item sidebar-item-search sidebar-search-run" onClick={() => onRun(search)}>
        {search.name}
      </button>
      <button
        className="sidebar-rename-btn"
        onClick={() => { setDraft(search.name); setEditing(true) }}
        title="Rename"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M7 1.5l1.5 1.5L3 8.5H1.5V7L7 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}

export default function Sidebar({ isOpen, onToggle }) {
  const location = useLocation()
  const navigate = useNavigate()

  const [searches, setSearches]   = useState([])
  const [pipeline, setPipeline]   = useState([])
  const [savedCount, setSavedCount] = useState(0)

  const refresh = useCallback(() => {
    getSavedSearches().then(setSearches).catch(() => {})
    getSavedJobs().then(jobs => setSavedCount(jobs.length)).catch(() => {})
    getTrackerEntries().then(entries => {
      const counts = {}
      PIPELINE_STATUSES.forEach(s => { counts[s] = 0 })
      entries.filter(e => e.status !== 'Dismissed').forEach(e => {
        if (counts[e.status] !== undefined) counts[e.status]++
      })
      setPipeline(PIPELINE_STATUSES.map(s => [s, counts[s]]).filter(([, c]) => c > 0))
    }).catch(() => {})
  }, [])

  useEffect(() => { refresh() }, [location.pathname, refresh])

  useEffect(() => {
    window.addEventListener('jobjames:search-saved', refresh)
    window.addEventListener('jobjames:job-saved', refresh)
    return () => {
      window.removeEventListener('jobjames:search-saved', refresh)
      window.removeEventListener('jobjames:job-saved', refresh)
    }
  }, [refresh])

  function runSearch(search) {
    navigate('/', {
      state: {
        autoSearch: search.criteria_json,
        activeSavedSearch: { id: search.id, name: search.name },
      },
    })
  }

  function goToTracker(status) {
    navigate('/tracker', { state: { filterStatus: status } })
  }

  async function handleRename(id, name) {
    try {
      await updateSavedSearch(id, { name })
      setSearches(prev => prev.map(s => s.id === id ? { ...s, name } : s))
    } catch {
      // silent
    }
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
          <div className="sidebar-section">
            <div className="sidebar-section-label">Views</div>
            <Link to="/saved" className={`sidebar-item sidebar-item-count ${location.pathname === '/saved' ? 'sidebar-item-active' : ''}`}>
              <span>Saved Jobs</span>
              {savedCount > 0 && <span className="sidebar-badge">{savedCount}</span>}
            </Link>
            <Link to="/dismissed" className={`sidebar-item ${location.pathname === '/dismissed' ? 'sidebar-item-active' : ''}`}>
              Dismissed
            </Link>
          </div>

          {searches.length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Saved Searches</div>
              {searches.map(s => (
                <SearchItem key={s.id} search={s} onRun={runSearch} onRename={handleRename} />
              ))}
            </div>
          )}

          {pipeline.length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Pipeline</div>
              {pipeline.map(([status, count]) => (
                <button
                  key={status}
                  className="sidebar-pipeline-row sidebar-pipeline-btn"
                  onClick={() => goToTracker(status)}
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
