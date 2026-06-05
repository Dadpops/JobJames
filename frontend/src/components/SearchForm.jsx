import { useState, useRef, useEffect } from 'react'
import './SearchForm.css'

const SOURCES = ['indeed', 'greenhouse', 'lever', 'linkedin']

const JOB_ROLES = [
  'Software Engineer', 'Senior Software Engineer', 'Staff Software Engineer',
  'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer',
  'iOS Engineer', 'Android Engineer', 'Mobile Engineer',
  'DevOps Engineer', 'Site Reliability Engineer', 'Platform Engineer',
  'Data Engineer', 'ML Engineer', 'Machine Learning Engineer',
  'AI Engineer', 'Embedded Engineer', 'Security Engineer',
  'Cloud Engineer', 'Infrastructure Engineer', 'QA Engineer',
  'Engineering Manager', 'Director of Engineering', 'VP of Engineering', 'CTO',
  'Product Manager', 'Senior Product Manager', 'Director of Product',
  'Technical Program Manager', 'Program Manager', 'Project Manager',
  'UX Designer', 'UI Designer', 'Product Designer', 'UX Researcher',
  'Data Scientist', 'Senior Data Scientist', 'Data Analyst', 'Business Analyst',
  'Analytics Engineer', 'Quantitative Analyst',
  'Solutions Engineer', 'Sales Engineer', 'Customer Success Manager',
  'Account Executive', 'Sales Manager', 'Account Manager',
  'Marketing Manager', 'Growth Manager', 'Content Marketing Manager',
  'Recruiter', 'Technical Recruiter', 'HR Manager',
  'Operations Manager', 'Chief of Staff', 'CFO', 'Financial Analyst',
]

const DEFAULT = {
  title: '',
  location: '',
  remote: false,
  salary_min: '',
  salary_max: '',
  sources: [...SOURCES],
  date_posted: 'any',
  experience_level: 'any',
  job_type: 'any',
}

export default function SearchForm({ onSearch, loading }) {
  const [form, setForm] = useState(DEFAULT)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const titleWrapRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (titleWrapRef.current && !titleWrapRef.current.contains(e.target)) {
        setSuggestions([])
        setActiveSuggestion(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleTitleChange(value) {
    set('title', value)
    if (value.trim().length < 1) {
      setSuggestions([])
      return
    }
    const q = value.toLowerCase()
    const matches = JOB_ROLES.filter(r => r.toLowerCase().includes(q)).slice(0, 8)
    setSuggestions(matches)
    setActiveSuggestion(-1)
  }

  function pickSuggestion(role) {
    set('title', role)
    setSuggestions([])
    setActiveSuggestion(-1)
  }

  function handleTitleKeyDown(e) {
    if (!suggestions.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveSuggestion(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveSuggestion(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeSuggestion >= 0) {
      e.preventDefault()
      pickSuggestion(suggestions[activeSuggestion])
    } else if (e.key === 'Escape') {
      setSuggestions([])
      setActiveSuggestion(-1)
    }
  }

  function toggleSource(src) {
    setForm(prev => {
      const next = prev.sources.includes(src)
        ? prev.sources.filter(s => s !== src)
        : [...prev.sources, src]
      return { ...prev, sources: next }
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.sources.length) return
    setSuggestions([])
    onSearch({
      title: form.title.trim(),
      location: form.location.trim() || null,
      remote: form.remote,
      salary_min: form.salary_min ? parseInt(form.salary_min, 10) : null,
      salary_max: form.salary_max ? parseInt(form.salary_max, 10) : null,
      sources: form.sources,
      date_posted: form.date_posted,
      experience_level: form.experience_level,
      job_type: form.job_type,
    })
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      {/* Row 1: title + location */}
      <div className="search-row">
        <div className="field field-grow" ref={titleWrapRef} style={{ position: 'relative' }}>
          <label>Job title</label>
          <input
            type="text"
            placeholder="e.g. Software Engineer"
            value={form.title}
            onChange={e => handleTitleChange(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            autoComplete="off"
            required
          />
          {suggestions.length > 0 && (
            <ul className="suggestions-list">
              {suggestions.map((role, i) => (
                <li
                  key={role}
                  className={`suggestion-item ${i === activeSuggestion ? 'suggestion-active' : ''}`}
                  onMouseDown={() => pickSuggestion(role)}
                >
                  {role}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="field field-grow">
          <label>Location</label>
          <input
            type="text"
            placeholder="e.g. New York, NY"
            value={form.location}
            onChange={e => set('location', e.target.value)}
          />
        </div>
      </div>

      {/* Row 2: salary + remote */}
      <div className="search-row">
        <div className="field field-inline">
          <input id="remote" type="checkbox" checked={form.remote}
            onChange={e => set('remote', e.target.checked)} />
          <label htmlFor="remote">Remote only</label>
        </div>
        <div className="field">
          <label>Salary min ($)</label>
          <input type="number" placeholder="e.g. 80000" value={form.salary_min}
            onChange={e => set('salary_min', e.target.value)} min={0} />
        </div>
        <div className="field">
          <label>Salary max ($)</label>
          <input type="number" placeholder="e.g. 150000" value={form.salary_max}
            onChange={e => set('salary_max', e.target.value)} min={0} />
        </div>
      </div>

      {/* Advanced toggle */}
      <button type="button" className="btn-toggle-advanced"
        onClick={() => setShowAdvanced(v => !v)}>
        {showAdvanced ? 'Hide filters' : 'More filters'}
        <span className="toggle-arrow">{showAdvanced ? '▲' : '▼'}</span>
      </button>

      {showAdvanced && (
        <div className="advanced-filters">
          {/* Sources */}
          <div className="filter-group">
            <span className="filter-group-label">Sources</span>
            <div className="source-checkboxes">
              {SOURCES.map(src => (
                <label key={src} className="source-check">
                  <input type="checkbox" checked={form.sources.includes(src)}
                    onChange={() => toggleSource(src)} />
                  {src.charAt(0).toUpperCase() + src.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div className="filter-row">
            {/* Date posted */}
            <div className="field">
              <label>Date posted</label>
              <select value={form.date_posted} onChange={e => set('date_posted', e.target.value)}>
                <option value="any">Any time</option>
                <option value="day">Past 24 hours</option>
                <option value="week">Past week</option>
                <option value="month">Past month</option>
              </select>
            </div>

            {/* Experience level */}
            <div className="field">
              <label>Experience level</label>
              <select value={form.experience_level} onChange={e => set('experience_level', e.target.value)}>
                <option value="any">Any level</option>
                <option value="entry">Entry level</option>
                <option value="mid">Mid level</option>
                <option value="senior">Senior level</option>
              </select>
            </div>

            {/* Job type */}
            <div className="field">
              <label>Job type</label>
              <select value={form.job_type} onChange={e => set('job_type', e.target.value)}>
                <option value="any">Any type</option>
                <option value="fulltime">Full-time</option>
                <option value="parttime">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <button type="submit" className="btn-search" disabled={loading || !form.sources.length}>
        {loading ? 'Searching…' : 'Search Jobs'}
      </button>
    </form>
  )
}
