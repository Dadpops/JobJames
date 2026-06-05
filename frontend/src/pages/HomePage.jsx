import { useState } from 'react'
import SearchForm from '../components/SearchForm'
import JobCard from '../components/JobCard'
import { searchJobs, updateJobStatus } from '../api/client'
import './HomePage.css'

export default function HomePage() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)

  async function handleSearch(criteria) {
    setLoading(true)
    setError(null)
    try {
      const results = await searchJobs(criteria)
      setJobs(results)
      setSearched(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(jobId, status) {
    try {
      const updated = await updateJobStatus(jobId, status)
      setJobs(prev => prev.map(j => (j.id === updated.id ? updated : j)))
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

      {searched && !loading && jobs.length === 0 && (
        <p className="home-empty">No results found. Try broadening your search.</p>
      )}

      {jobs.length > 0 && (
        <div className="results">
          <p className="results-count">{jobs.length} result{jobs.length !== 1 ? 's' : ''}</p>
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
