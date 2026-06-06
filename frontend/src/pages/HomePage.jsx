import { useState } from 'react'
import SearchForm from '../components/SearchForm'
import JobCard from '../components/JobCard'
import StatCards from '../components/StatCards'
import { searchJobs, updateJobStatus, createSavedSearch } from '../api/client'
import './HomePage.css'

function isStaleJob(job) {
  if (!job.posted_at) return false
  const posted = new Date(job.posted_at)
  if (isNaN(posted)) return false
  return (Date.now() - posted.getTime()) > 30 * 86400000
}

export default function HomePage() {
  const [jobs, setJobs]           = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [searched, setSearched]   = useState(false)
  const [lastCriteria, setLast]   = useState(null)
  const [hideStale, setHideStale] = useState(false)

  async function handleSearch(criteria) {
    setLoading(true)
    setError(null)
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
    } catch {
      // silent — SearchForm manages its own UI
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

  const displayJobs = hideStale ? jobs.filter(j => !isStaleJob(j)) : jobs

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
          <StatCards jobs={jobs} />
          <div className="job-list">
            {displayJobs.map(job => (
              <JobCard key={job.id} job={job} onStatusChange={handleStatusChange} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
