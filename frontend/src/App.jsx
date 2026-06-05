import { NavLink, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SavedPage from './pages/SavedPage'
import TrackerPage from './pages/TrackerPage'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <span className="logo">JobJames</span>
        <nav className="app-nav">
          <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Search
          </NavLink>
          <NavLink to="/saved" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Saved
          </NavLink>
          <NavLink to="/tracker" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Tracker
          </NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/tracker" element={<TrackerPage />} />
        </Routes>
      </main>
    </div>
  )
}
