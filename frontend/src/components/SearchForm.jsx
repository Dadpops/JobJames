import { useState, useRef, useEffect } from 'react'
import InfoTooltip from './InfoTooltip'
import './SearchForm.css'

const SOURCES = ['indeed', 'greenhouse', 'lever', 'linkedin', 'glassdoor', 'wellfound', 'ziprecruiter', 'remoteok', 'weworkremotely']

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

// Props:
//   onSearch(criteria)       — run a search
//   loading                  — search in progress
//   resultCount              — show result count row when non-null
//   hideStale / onToggleStale
//   onSaveSearch(criteria)   — save as new search (or first-time save)
//   loadedCriteria           — when set, populate form fields (from sidebar/settings click)
//   activeSavedSearch        — { id, name } | null — show editing bar
//   onClearActive()          — X clears the active saved search state + resets form
//   onUpdateSearch(criteria) — overwrite active saved search criteria
export default function SearchForm({
  onSearch, loading, resultCount,
  hideStale, onToggleStale,
  onSaveSearch,
  loadedCriteria,
  activeSavedSearch,
  onClearActive,
  onUpdateSearch,
}) {
  const [form, setForm]               = useState(DEFAULT)
  const [suggestions, setSuggestions] = useState([])
  const [activeSuggestion, setActive] = useState(-1)
  const [showSalary, setShowSalary]   = useState(false)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [saveName, setSaveName]       = useState('')
  const [updateState, setUpdateState] = useState('idle') // idle | saving | saved
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

  // Populate form when a saved search is loaded from the sidebar or settings
  useEffect(() => {
    if (!loadedCriteria) return
    setForm({
      title: loadedCriteria.title || '',
      location: loadedCriteria.location || '',
      remote: !!loadedCriteria.remote,
      salary_min: loadedCriteria.salary_min != null ? String(loadedCriteria.salary_min) : '',
      salary_max: loadedCriteria.salary_max != null ? String(loadedCriteria.salary_max) : '',
      sources: loadedCriteria.sources?.length ? loadedCriteria.sources : [...SOURCES],
      date_posted: loadedCriteria.date_posted || 'any',
      experience_level: loadedCriteria.experience_level || 'any',
      job_type: loadedCriteria.job_type || 'any',
    })
    // Auto-reveal salary inputs if the loaded search has salary criteria
    if (loadedCriteria.salary_min != null || loadedCriteria.salary_max != null) {
      setShowSalary(true)
    }
    setShowSaveForm(false)
    setSaveName('')
  }, [loadedCriteria])

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
    onSearch(getCurrentCriteria())
  }

  // Extract the current form values as a plain criteria object
  function getCurrentCriteria() {
    return {
      title: form.title.trim(),
      location: form.location.trim() || null,
      remote: form.remote,
      salary_min: form.salary_min ? parseInt(form.salary_min, 10) : null,
      salary_max: form.salary_max ? parseInt(form.salary_max, 10) : null,
      sources: form.sources,
      date_posted: form.date_posted,
      experience_level: form.experience_level,
      job_type: form.job_type,
    }
  }

  // Save as new search — uses a div (not nested form) to avoid submitting the outer form
  function commitSaveSearch() {
    if (!saveName.trim() || !onSaveSearch) return
    onSaveSearch({ name: saveName.trim(), ...getCurrentCriteria() })
    setSaveName('')
    setShowSaveForm(false)
  }

  // Overwrite the active saved search with current form criteria
  async function handleUpdate() {
    if (!onUpdateSearch) return
    setUpdateState('saving')
    try {
      await onUpdateSearch(getCurrentCriteria())
      setUpdateState('saved')
      setTimeout(() => setUpdateState('idle'), 2000)
    } catch {
      setUpdateState('idle')
    }
  }

  // Clear active state + reset form to blank
  function handleClearActive() {
    if (onClearActive) onClearActive()
    setForm({ ...DEFAULT })
    setShowSalary(false)
    setShowSaveForm(false)
    setSaveName('')
  }

  const salaryLabel = form.salary_min || form.salary_max
    ? `$${form.salary_min || '0'}–${form.salary_max || '∞'}`
    : 'Salary'
  const salaryActive = !!(form.salary_min || form.salary_max)

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      {/* ── Editing indicator — shown when a saved search is active ── */}
      {activeSavedSearch && (
        <div className="active-search-bar">
          <span className="active-search-label">
            editing: <strong>{activeSavedSearch.name}</strong>
          </span>
          <button
            type="button"
            className="active-search-clear"
            onClick={handleClearActive}
            title="Clear active search and reset form"
          >
            ✕
          </button>
        </div>
      )}

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
        <button
          type="button"
          className={`filter-chip${form.remote ? ' filter-chip-active' : ''}`}
          onClick={() => set('remote', !form.remote)}
        >
          Remote
        </button>

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

        <button
          type="button"
          className={`filter-chip${form.date_posted !== 'any' ? ' filter-chip-active' : ''}`}
          onClick={() => set('date_posted', cycleChip(DATE_OPTIONS, form.date_posted))}
        >
          {DATE_LABELS[form.date_posted]}
        </button>

        <button
          type="button"
          className={`filter-chip${form.experience_level !== 'any' ? ' filter-chip-active' : ''}`}
          onClick={() => set('experience_level', cycleChip(EXP_OPTIONS, form.experience_level))}
        >
          {EXP_LABELS[form.experience_level]}
        </button>

        <button
          type="button"
          className={`filter-chip${form.job_type !== 'any' ? ' filter-chip-active' : ''}`}
          onClick={() => set('job_type', cycleChip(TYPE_OPTIONS, form.job_type))}
        >
          {TYPE_LABELS[form.job_type]}
        </button>

        {onToggleStale && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            <button
              type="button"
              className={`filter-stale-toggle${hideStale ? ' filter-stale-toggle-active' : ''}`}
              onClick={onToggleStale}
            >
              {hideStale ? 'Stale hidden' : 'Hide stale'}
            </button>
            <InfoTooltip text="Hides jobs posted more than 30 days ago. Stale jobs may still be actively hiring." />
          </span>
        )}
      </div>

      {/* ── Save / Update / result count row ──────────────────── */}
      {(resultCount != null || activeSavedSearch) && (
        <div className="save-search-row">
          {resultCount != null && (
            <span className="results-count">{resultCount} result{resultCount !== 1 ? 's' : ''}</span>
          )}

          {activeSavedSearch ? (
            /* Editing mode: Update + Save as new */
            <div className="save-search-actions">
              <button
                type="button"
                className={`btn-act btn-update-search${updateState === 'saved' ? ' btn-update-saved' : ''}`}
                onClick={handleUpdate}
                disabled={updateState === 'saving'}
              >
                {updateState === 'saving' ? 'Saving…' : updateState === 'saved' ? '✓ Updated' : `Update "${activeSavedSearch.name}"`}
              </button>

              {showSaveForm ? (
                // Save-as-new name form — div not form to avoid triggering outer submit
                <div className="save-search-form">
                  <input
                    type="text"
                    className="save-search-input"
                    placeholder="New search name…"
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.stopPropagation(); commitSaveSearch() }
                      if (e.key === 'Escape') setShowSaveForm(false)
                    }}
                    autoFocus
                  />
                  <button type="button" className="btn-act save-search-confirm" onClick={commitSaveSearch}>Save as new</button>
                  <button type="button" className="save-search-cancel" onClick={() => { setShowSaveForm(false); setSaveName('') }}>✕</button>
                </div>
              ) : (
                <button type="button" className="save-search-btn" onClick={() => { setSaveName(''); setShowSaveForm(true) }}>
                  Save as new
                </button>
              )}
            </div>
          ) : (
            /* Default mode: Save search */
            onSaveSearch && (
              showSaveForm ? (
                // div not form — avoid nested-form HTML issue that triggers outer search submit
                <div className="save-search-form">
                  <input
                    type="text"
                    className="save-search-input"
                    placeholder="Search name…"
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.stopPropagation(); commitSaveSearch() }
                      if (e.key === 'Escape') setShowSaveForm(false)
                    }}
                    autoFocus
                  />
                  <button type="button" className="btn-act save-search-confirm" onClick={commitSaveSearch}>Save</button>
                  <button type="button" className="save-search-cancel" onClick={() => setShowSaveForm(false)}>✕</button>
                </div>
              ) : (
                <button type="button" className="save-search-btn" onClick={() => setShowSaveForm(true)}>
                  Save search
                </button>
              )
            )
          )}
        </div>
      )}
    </form>
  )
}
