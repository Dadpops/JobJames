import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getSavedSearches, getTrackerEntries } from '../api/client'
import './Sidebar.css'

const PIPELINE_COLORS = {
  Found: '#6e6af0', Reviewing: '#c4843a', Applied: '#6db85c',
  Interviewing: '#a09cf7', Offer: '#6db85c', Rejected: '#e05c6a',
}

export default function Sidebar({ isOpen, onToggle }) {
  const [searches, setSearches] = useState([])
  const [pipeline, setPipeline] = useState([])
  const location = useLocation()

  useEffect(() => {
    getSavedSearches().then(setSearches).catch(() => {})
    getTrackerEntries().then(entries => {
      const counts = {}
      entries.filter(e => e.status !== 'Dismissed').forEach(e => {
        counts[e.status] = (counts[e.status] || 0) + 1
      })
      setPipeline(Object.entries(counts))
    }).catch(() => {})
  }, [])

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
            <Link to="/saved" className={`sidebar-item ${location.pathname === '/saved' ? 'sidebar-item-active' : ''}`}>
              Saved Jobs
            </Link>
            <Link to="/dismissed" className={`sidebar-item ${location.pathname === '/dismissed' ? 'sidebar-item-active' : ''}`}>
              Dismissed
            </Link>
          </div>

          {searches.length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Saved Searches</div>
              {searches.map(s => (
                <Link key={s.id} to="/" className="sidebar-item sidebar-item-search">
                  {s.name}
                </Link>
              ))}
            </div>
          )}

          {pipeline.length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Pipeline</div>
              {pipeline.map(([status, count]) => (
                <div key={status} className="sidebar-pipeline-row">
                  <span className="sidebar-pipeline-dot" style={{ background: PIPELINE_COLORS[status] || 'var(--text-faint)' }} />
                  <span className="sidebar-pipeline-label">{status}</span>
                  <span className="sidebar-pipeline-count">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
