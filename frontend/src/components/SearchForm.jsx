import { useState } from 'react'
import './SearchForm.css'

const DEFAULT = {
  title: '',
  location: '',
  remote: false,
  salary_min: '',
  salary_max: '',
}

export default function SearchForm({ onSearch, loading }) {
  const [form, setForm] = useState(DEFAULT)

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSearch({
      title: form.title.trim(),
      location: form.location.trim() || null,
      remote: form.remote,
      salary_min: form.salary_min ? parseInt(form.salary_min, 10) : null,
      salary_max: form.salary_max ? parseInt(form.salary_max, 10) : null,
    })
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="search-row">
        <div className="field">
          <label>Job title</label>
          <input
            type="text"
            placeholder="e.g. Software Engineer"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Location</label>
          <input
            type="text"
            placeholder="e.g. New York, NY"
            value={form.location}
            onChange={e => set('location', e.target.value)}
          />
        </div>
      </div>
      <div className="search-row">
        <div className="field field-inline">
          <input
            id="remote"
            type="checkbox"
            checked={form.remote}
            onChange={e => set('remote', e.target.checked)}
          />
          <label htmlFor="remote">Remote only</label>
        </div>
        <div className="field">
          <label>Salary min ($)</label>
          <input
            type="number"
            placeholder="e.g. 80000"
            value={form.salary_min}
            onChange={e => set('salary_min', e.target.value)}
            min={0}
          />
        </div>
        <div className="field">
          <label>Salary max ($)</label>
          <input
            type="number"
            placeholder="e.g. 150000"
            value={form.salary_max}
            onChange={e => set('salary_max', e.target.value)}
            min={0}
          />
        </div>
      </div>
      <button type="submit" className="btn-search" disabled={loading}>
        {loading ? 'Searching…' : 'Search Jobs'}
      </button>
    </form>
  )
}
