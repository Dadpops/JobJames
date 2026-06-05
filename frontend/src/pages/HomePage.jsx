import { useState } from 'react'
import SearchForm from '../components/SearchForm'
import JobCard from '../components/JobCard'
import { searchJobs, updateJobStatus, createSavedSearch } from '../api/client'
import './HomePage.css'

export default function HomePage() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)
  const [lastCriteria, setLastCriteria] = useState(null)
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved
  const [showSaveName, setShowSaveName] = useState(false)
  const [saveName, setSaveName] = useState('')

  async function handleSearch(criteria) {
    setLoading(true)
    setError(null)
    setSaveState('idle')
    setShowSaveName(false)
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
  }

  async function handleSaveSearch(e) {
    e.preventDefault()
    if (!saveName.trim() || !lastCriteria) return
    setSaveState('saving')
    try {
      await createSavedSearch({
        name: saveName.trim(),
        criteria_json: JSON.stringify(lastCriteria),
        schedule: 'off',
      })
      setSaveState('saved')
      setShowSaveName(false)
      setSaveName('')
    } catch {
      setSaveState('idle')
    }
  }

  async function handleStatusChange(jobId, status) {
    try {
      const updated = await updateJobStatus(jobId, status)
      if (status === 'dismissed') {
        setJobs(prev => prev.filter(j => j.id !== jobId))
      } else {
        setJobs(prev => prev.map(j => (j.id === updated.id ? updated : j)))
      }
    } catch (err) {
      console.error('Status update failed', err)
    }
  }

  return (
    <div className="home">
      <div className="home-hero">
        <h1>Find your next role</h1>
        <p>Search across Indeed, Greenhouse, Lever, and LinkedIn in one shot.</p>
      </div>

      <SearchForm onSearch={handleSearch} loading={loading} />

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
          <div className="results-bar">
            <p className="results-count">{jobs.length} result{jobs.length !== 1 ? 's' : ''}</p>
            {saveState === 'saved' ? (
              <span className="save-search-confirm">Search saved! Manage schedules in Settings.</span>
            ) : showSaveName ? (
              <form className="save-search-form" onSubmit={handleSaveSearch}>
                <input
                  autoFocus
                  className="save-search-input"
                  placeholder="Search name…"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  required
                />
                <button type="submit" className="save-search-btn" disabled={saveState === 'saving'}>
                  {saveState === 'saving' ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="save-search-cancel" onClick={() => setShowSaveName(false)}>✕</button>
              </form>
            ) : (
              <button className="save-search-btn" onClick={() => setShowSaveName(true)}>
                Save this search
              </button>
            )}
          </div>
          <div className="job-list">
            {jobs.map(job => (
              <JobCard key={job.id} job={job} onStatusChange={handleStatusChange} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
