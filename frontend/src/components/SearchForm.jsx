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

const DATE_OPTIONS = ['any', 'day', 'week', 'month']
const DATE_LABELS  = { any: 'Any time', day: '24h', week: 'This week', month: 'This month' }
const EXP_OPTIONS  = ['any', 'entry', 'mid', 'senior']
const EXP_LABELS   = { any: 'Any level', entry: 'Entry', mid: 'Mid', senior: 'Senior' }
const TYPE_OPTIONS = ['any', 'fulltime', 'parttime', 'contract', 'internship']
const TYPE_LABELS  = { any: 'Any type', fulltime: 'Full-time', parttime: 'Part-time', contract: 'Contract', internship: 'Internship' }

function cycleChip(options, current) {
  const idx = options.indexOf(current)
  return options[(idx + 1) % options.length]
}

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

export default function SearchForm({ onSearch, loading, resultCount, hideStale, onToggleStale, onSaveSearch }) {
  const [form, setForm]                   = useState(DEFAULT)
  const [suggestions, setSuggestions]     = useState([])
  const [activeSuggestion, setActive]     = useState(-1)
  const [showSalary, setShowSalary]       = useState(false)
  const [showSaveForm, setShowSaveForm]   = useState(false)
  const [saveName, setSaveName]           = useState('')
  const titleWrapRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (titleWrapRef.current && !titleWrapRef.current.contains(e.target)) {
        setSuggestions([])
        setActive(-1)
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
    if (value.trim().length < 1) { setSuggestions([]); return }
    const q = value.toLowerCase()
    setSuggestions(JOB_ROLES.filter(r => r.toLowerCase().includes(q)).slice(0, 8))
    setActive(-1)
  }

  function pickSuggestion(role) {
    set('title', role)
    setSuggestions([])
    setActive(-1)
  }

  function handleTitleKeyDown(e) {
    if (!suggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && activeSuggestion >= 0) { e.preventDefault(); pickSuggestion(suggestions[activeSuggestion]) }
    else if (e.key === 'Escape') { setSuggestions([]); setActive(-1) }
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

  function handleSaveSearch(e) {
    e.preventDefault()
    if (!saveName.trim() || !onSaveSearch) return
    onSaveSearch({
      name: saveName.trim(),
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
    setSaveName('')
    setShowSaveForm(false)
  }

  const salaryLabel = form.salary_min || form.salary_max
    ? `$${form.salary_min || '0'}–${form.salary_max || '∞'}`
    : 'Salary'
  const salaryActive = !!(form.salary_min || form.salary_max)

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      {/* ── Main row ──────────────────────────────────────────── */}
      <div className="search-main-row">
        <div className="search-input-wrap" ref={titleWrapRef}>
          <input
            type="text"
            className="search-input"
            placeholder="Job title or role…"
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
                  className={`suggestion-item${i === activeSuggestion ? ' suggestion-active' : ''}`}
                  onMouseDown={() => pickSuggestion(role)}
                >
                  {role}
                </li>
              ))}
            </ul>
          )}
        </div>

        <input
          type="text"
          className="search-input search-input-location"
          placeholder="Location (optional)"
          value={form.location}
          onChange={e => set('location', e.target.value)}
        />

        <button type="submit" className="btn-search" disabled={loading || !form.sources.length}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* ── Filter chips row ──────────────────────────────────── */}
      <div className="filter-chips-row">
        {/* Remote */}
        <button
          type="button"
          className={`filter-chip${form.remote ? ' filter-chip-active' : ''}`}
          onClick={() => set('remote', !form.remote)}
        >
          Remote
        </button>

        {/* Salary */}
        <button
          type="button"
          className={`filter-chip${salaryActive || showSalary ? ' filter-chip-active' : ''}`}
          onClick={() => setShowSalary(v => !v)}
        >
          {salaryLabel}
        </button>

        {showSalary && (
          <>
            <input
              type="number"
              className="search-input"
              style={{ width: 90, padding: '3px 8px', fontSize: 11, borderRadius: 20 }}
              placeholder="Min $"
              value={form.salary_min}
              onChange={e => set('salary_min', e.target.value)}
              min={0}
            />
            <input
              type="number"
              className="search-input"
              style={{ width: 90, padding: '3px 8px', fontSize: 11, borderRadius: 20 }}
              placeholder="Max $"
              value={form.salary_max}
              onChange={e => set('salary_max', e.target.value)}
              min={0}
            />
          </>
        )}

        <div className="filter-chip-divider" />

        {/* Sources */}
        {SOURCES.map(src => (
          <button
            key={src}
            type="button"
            className={`filter-chip filter-chip-src${form.sources.includes(src) ? ' filter-chip-active' : ' filter-chip-src-off'}`}
            onClick={() => toggleSource(src)}
          >
            {src.charAt(0).toUpperCase() + src.slice(1)}
          </button>
        ))}

        <div className="filter-chip-divider" />

        {/* Date posted */}
        <button
          type="button"
          className={`filter-chip${form.date_posted !== 'any' ? ' filter-chip-active' : ''}`}
          onClick={() => set('date_posted', cycleChip(DATE_OPTIONS, form.date_posted))}
        >
          {DATE_LABELS[form.date_posted]}
        </button>

        {/* Experience level */}
        <button
          type="button"
          className={`filter-chip${form.experience_level !== 'any' ? ' filter-chip-active' : ''}`}
          onClick={() => set('experience_level', cycleChip(EXP_OPTIONS, form.experience_level))}
        >
          {EXP_LABELS[form.experience_level]}
        </button>

        {/* Job type */}
        <button
          type="button"
          className={`filter-chip${form.job_type !== 'any' ? ' filter-chip-active' : ''}`}
          onClick={() => set('job_type', cycleChip(TYPE_OPTIONS, form.job_type))}
        >
          {TYPE_LABELS[form.job_type]}
        </button>

        {/* Stale toggle — far right */}
        {onToggleStale && (
          <button
            type="button"
            className={`filter-stale-toggle${hideStale ? ' filter-stale-toggle-active' : ''}`}
            onClick={onToggleStale}
          >
            {hideStale ? 'Stale hidden' : 'Hide stale'}
          </button>
        )}
      </div>

      {/* ── Save search / result count row ────────────────────── */}
      {resultCount != null && (
        <div className="save-search-row">
          <span className="results-count">{resultCount} result{resultCount !== 1 ? 's' : ''}</span>
          {onSaveSearch && (
            showSaveForm ? (
              <form className="save-search-form" onSubmit={handleSaveSearch}>
                <input
                  type="text"
                  className="save-search-input"
                  placeholder="Search name…"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  autoFocus
                  required
                />
                <button type="submit" className="btn-act save-search-confirm">Save</button>
                <button type="button" className="save-search-cancel" onClick={() => setShowSaveForm(false)}>✕</button>
              </form>
            ) : (
              <button type="button" className="save-search-btn" onClick={() => setShowSaveForm(true)}>
                Save search
              </button>
            )
          )}
        </div>
      )}
    </form>
  )
}
