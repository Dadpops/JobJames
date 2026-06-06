import { useState, useEffect } from 'react'
import { NavLink, Routes, Route, Link } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SavedPage from './pages/SavedPage'
import DismissedPage from './pages/DismissedPage'
import TrackerPage from './pages/TrackerPage'
import SettingsPage from './pages/SettingsPage'
import Sidebar from './components/Sidebar'
import './App.css'

function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('jobjames_display_name') || '')

  useEffect(() => {
    function onNameChange() {
      setDisplayName(localStorage.getItem('jobjames_display_name') || '')
    }
    window.addEventListener('jobjames:name-changed', onNameChange)
    return () => window.removeEventListener('jobjames:name-changed', onNameChange)
  }, [])

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar-brand">
          JobJames{displayName && <span className="topbar-for"> for {displayName}</span>}
        </span>
        <nav className="topbar-tabs">
          <NavLink to="/" end className={({ isActive }) => 'tab-pill' + (isActive ? ' active' : '')}>
            Search
          </NavLink>
          <NavLink to="/tracker" className={({ isActive }) => 'tab-pill' + (isActive ? ' active' : '')}>
            Tracker
          </NavLink>
        </nav>
        <Link to="/settings" className="topbar-settings-btn" title="Settings">
          <GearIcon />
        </Link>
      </header>

      <div className="app-body">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/dismissed" element={<DismissedPage />} />
            <Route path="/tracker" element={<TrackerPage />} />
            <Route path="/settings" element={<SettingsPage onNameChange={setDisplayName} />} />
            <Route path="*" element={<div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', fontSize: '13px' }}>Page not found.</div>} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
