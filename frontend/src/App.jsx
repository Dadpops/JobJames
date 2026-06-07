import { useState, useEffect } from 'react'
import { NavLink, Routes, Route, Link, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SavedPage from './pages/SavedPage'
import DismissedPage from './pages/DismissedPage'
import TrackerPage from './pages/TrackerPage'
import SettingsPage from './pages/SettingsPage'
import Sidebar from './components/Sidebar'
import OnboardingScreen from './components/OnboardingScreen'
import './App.css'

function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="5"/>
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

function HamburgerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 7h18M3 12h18M3 17h18"/>
    </svg>
  )
}

// Set theme immediately on load (before React renders) to avoid flash
const _initTheme = localStorage.getItem('jobjames_theme') || 'dark'
document.documentElement.setAttribute('data-theme', _initTheme)

export default function App() {
  const location = useLocation()

  const [accessCode, setAccessCode] = useState(() => localStorage.getItem('jj_access_code'))
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('jobjames_display_name') || '')
  const [theme, setTheme] = useState(_initTheme)

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('jobjames_theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  useEffect(() => {
    function onNameChange() {
      setDisplayName(localStorage.getItem('jobjames_display_name') || '')
    }
    window.addEventListener('jobjames:name-changed', onNameChange)
    return () => window.removeEventListener('jobjames:name-changed', onNameChange)
  }, [])

  useEffect(() => {
    if (window.innerWidth <= 640) setSidebarOpen(false)
  }, [location.pathname])

  function handleOnboardingComplete(code, name) {
    setAccessCode(code)
    if (name) {
      setDisplayName(name)
      window.dispatchEvent(new CustomEvent('jobjames:name-changed', { detail: name }))
    }
  }

  if (!accessCode) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />
  }

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <header className="topbar" role="banner">
        <button
          className="topbar-hamburger"
          onClick={() => setSidebarOpen(v => !v)}
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={sidebarOpen}
        >
          <HamburgerIcon />
        </button>

        <span className="topbar-brand">
          JobJames{displayName && <span className="topbar-for"> for {displayName}</span>}
        </span>

        <nav className="topbar-tabs" aria-label="Main navigation">
          <NavLink to="/" end className={({ isActive }) => 'tab-pill' + (isActive ? ' active' : '')}>
            Search
          </NavLink>
          <NavLink to="/tracker" className={({ isActive }) => 'tab-pill' + (isActive ? ' active' : '')}>
            Tracker
          </NavLink>
        </nav>

        <div className="topbar-actions">
          <button
            className="topbar-theme-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <Link to="/settings" className="topbar-settings-btn" aria-label="Settings" title="Settings">
            <GearIcon />
          </Link>
        </div>
      </header>

      <div className="app-body">
        {sidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />
        <main className="app-main" id="main-content">
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
