import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getSettings, saveSettings,
  getSavedSearches, updateSavedSearch, deleteSavedSearch, runSavedSearch,
  deleteAccount,
} from '../api/client'
import './SettingsPage.css'

const SCHEDULES = ['off', 'daily', 'twice_daily']
const SCHEDULE_LABELS = { off: 'Off', daily: 'Daily', twice_daily: 'Twice daily' }
const FREQ_OPTIONS = ['off', 'daily', 'weekly']

const CRITERIA_LABELS = {
  date_posted:      { any: null, day: '24h', week: 'This week', month: 'This month' },
  experience_level: { any: null, entry: 'Entry', mid: 'Mid', senior: 'Senior' },
  job_type:         { any: null, fulltime: 'Full-time', parttime: 'Part-time', contract: 'Contract', internship: 'Internship' },
}

function parseCriteria(criteria_json) {
  try { return JSON.parse(criteria_json) } catch { return null }
}

function CriteriaSummary({ criteria }) {
  if (!criteria) return <span className="search-criteria">—</span>
  const parts = [criteria.title]
  if (criteria.location) parts.push(criteria.location)
  return <span className="search-criteria">{parts.join(' · ')}</span>
}

function CriteriaDetail({ criteria }) {
  if (!criteria) return null
  const rows = []
  if (criteria.title) rows.push(['Keywords', criteria.title])
  if (criteria.location) rows.push(['Location', criteria.location])
  if (criteria.remote) rows.push(['Remote', 'Yes'])
  if (criteria.salary_min || criteria.salary_max) {
    const min = criteria.salary_min ? `$${(criteria.salary_min / 1000).toFixed(0)}k` : '—'
    const max = criteria.salary_max ? `$${(criteria.salary_max / 1000).toFixed(0)}k` : '—'
    rows.push(['Salary', `${min} – ${max}`])
  }
  if (criteria.sources?.length) rows.push(['Sources', criteria.sources.join(', ')])
  const date = CRITERIA_LABELS.date_posted[criteria.date_posted]
  if (date) rows.push(['Posted', date])
  const exp = CRITERIA_LABELS.experience_level[criteria.experience_level]
  if (exp) rows.push(['Level', exp])
  const type = CRITERIA_LABELS.job_type[criteria.job_type]
  if (type) rows.push(['Type', type])

  return (
    <div className="criteria-detail">
      {rows.map(([label, val]) => (
        <div key={label} className="criteria-detail-row">
          <span className="criteria-detail-label">{label}</span>
          <span className="criteria-detail-val">{val}</span>
        </div>
      ))}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="settings-section">
      <h2 className="settings-section-title">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className="settings-field">
      <label className="settings-label">{label}{hint && <span className="settings-hint">{hint}</span>}</label>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()

  const [cfg, setCfg]           = useState({})
  const [searches, setSearches] = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [testState, setTestState] = useState('idle')
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('jobjames_display_name') || '')
  const [nameDraft, setNameDraft]     = useState('')
  const [editingName, setEditingName] = useState(false)
  const [expandedSearchId, setExpandedSearchId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const accessCode = localStorage.getItem('jj_access_code') || ''

  useEffect(() => {
    Promise.all([getSettings(), getSavedSearches()])
      .then(([s, ss]) => { setCfg(s); setSearches(ss) })
      .finally(() => setLoading(false))
  }, [])

  // Sync when a search is saved from the home page while settings is open
  useEffect(() => {
    function onSearchSaved() {
      getSavedSearches().then(setSearches).catch(() => {})
    }
    window.addEventListener('jobjames:search-saved', onSearchSaved)
    return () => window.removeEventListener('jobjames:search-saved', onSearchSaved)
  }, [])

  function set(key, value) {
    setCfg(c => ({ ...c, [key]: value }))
  }

  function startEditName() {
    setNameDraft(displayName)
    setEditingName(true)
  }

  function commitName() {
    const val = nameDraft.trim()
    setDisplayName(val)
    localStorage.setItem('jobjames_display_name', val)
    window.dispatchEvent(new CustomEvent('jobjames:name-changed', { detail: val }))
    setEditingName(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await saveSettings(cfg)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  function handleSignOut() {
    localStorage.removeItem('jj_access_code')
    localStorage.removeItem('jobjames_display_name')
    window.location.reload()
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      await deleteAccount()
    } catch {
      // proceed with local sign-out even if API call fails
    }
    localStorage.removeItem('jj_access_code')
    localStorage.removeItem('jobjames_display_name')
    window.location.reload()
  }

  async function handleTestSmtp() {
    setTestState('sending')
    try {
      await saveSettings(cfg)
      const to = cfg.digest_to || prompt('Send test email to:')
      if (!to) { setTestState('idle'); return }
      const { emailSavedJobs } = await import('../api/client')
      await emailSavedJobs(to)
      setTestState('ok')
    } catch {
      setTestState('error')
    }
    setTimeout(() => setTestState('idle'), 3000)
  }

  async function handleSearchUpdate(id, fields) {
    const updated = await updateSavedSearch(id, fields)
    setSearches(ss => ss.map(s => s.id === id ? updated : s))
  }

  async function handleRunNow(id) {
    await runSavedSearch(id)
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    setSearches(ss => ss.map(s => s.id === id ? { ...s, last_run: now } : s))
  }

  async function handleDeleteSearch(id) {
    await deleteSavedSearch(id)
    setSearches(ss => ss.filter(s => s.id !== id))
    if (expandedSearchId === id) setExpandedSearchId(null)
  }

  function handleEditSearch(search) {
    navigate('/', {
      state: {
        autoSearch: search.criteria_json,
        activeSavedSearch: { id: search.id, name: search.name },
      },
    })
  }

  function SearchNameCell({ search }) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(search.name)
    function commit() {
      setEditing(false)
      const val = draft.trim()
      if (val && val !== search.name) handleSearchUpdate(search.id, { name: val })
    }
    if (!editing) return (
      <span
        className="search-inline search-name-inline"
        onClick={() => { setDraft(search.name); setEditing(true) }}
        title="Click to rename"
      >
        {search.name}
        <span className="search-name-edit-hint">rename</span>
      </span>
    )
    return (
      <input
        autoFocus type="text" className="search-inline-input"
        value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      />
    )
  }

  function SearchEmailCell({ search }) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(search.recipient_email || '')
    function commit() {
      setEditing(false)
      const val = draft.trim() || null
      if (val !== (search.recipient_email || null)) handleSearchUpdate(search.id, { recipient_email: val })
    }
    if (!editing) return (
      <span className="search-inline" onClick={() => { setDraft(search.recipient_email || ''); setEditing(true) }} title="Click to set email">
        {search.recipient_email || <span className="search-placeholder">—</span>}
      </span>
    )
    return (
      <input
        autoFocus type="email" className="search-inline-input"
        value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      />
    )
  }

  function SearchLimitCell({ search }) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(search.result_limit ?? 10)
    function commit() {
      setEditing(false)
      const val = parseInt(draft, 10) || 10
      if (val !== search.result_limit) handleSearchUpdate(search.id, { result_limit: val })
    }
    if (!editing) return (
      <span className="search-inline" onClick={() => { setDraft(search.result_limit ?? 10); setEditing(true) }} title="Click to edit">
        {search.result_limit ?? 10}
      </span>
    )
    return (
      <input
        autoFocus type="number" min="1" max="50" className="search-inline-input search-limit-input"
        value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      />
    )
  }

  if (loading) return <p className="settings-status">Loading…</p>

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <div className="settings-save-row">
          {saved && <span className="settings-saved">Saved</span>}
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* ── Profile ── */}
      <Section title="Profile">
        <div className="settings-grid">
          <Field label="Display name">
            {editingName ? (
              <div className="name-edit-row">
                <input
                  autoFocus
                  type="text"
                  value={nameDraft}
                  onChange={e => setNameDraft(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(false) }}
                  placeholder="Your name"
                />
              </div>
            ) : (
              <div className="name-display-row" onClick={startEditName} title="Click to edit">
                <span className="name-value">{displayName || <span className="settings-placeholder">Click to set your name</span>}</span>
                <span className="name-edit-hint">Edit</span>
              </div>
            )}
          </Field>
          <Field label="Access code" hint=" — share this to use your account on another device">
            <div className="access-code-row">
              <code className="access-code-display">{accessCode}</code>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSignOut}
                title="Clear this account from this browser and return to the sign-in screen"
              >
                Sign out
              </button>
            </div>
          </Field>
        </div>
      </Section>

      {/* ── Email Digest ── */}
      <Section title="Email Digest">
        <div className="settings-grid">
          <Field label="Recipient email">
            <input
              type="email"
              value={cfg.digest_to || ''}
              onChange={e => set('digest_to', e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Frequency">
            <select value={cfg.digest_frequency || 'off'} onChange={e => set('digest_frequency', e.target.value)}>
              {FREQ_OPTIONS.map(f => <option key={f} value={f}>{f === 'off' ? 'Off' : f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Send time" hint="24-hour, e.g. 08:00">
            <input
              type="time"
              value={cfg.digest_time || '08:00'}
              onChange={e => set('digest_time', e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* ── SMTP ── */}
      <Section title="SMTP Configuration">
        <p className="settings-desc">Configure SMTP to send emails directly. If left blank, Resend API is used instead.</p>
        <div className="settings-grid">
          <Field label="Host">
            <input value={cfg.smtp_host || ''} onChange={e => set('smtp_host', e.target.value)} placeholder="smtp.gmail.com" />
          </Field>
          <Field label="Port">
            <input type="number" value={cfg.smtp_port || ''} onChange={e => set('smtp_port', e.target.value)} placeholder="587" />
          </Field>
          <Field label="Username">
            <input value={cfg.smtp_username || ''} onChange={e => set('smtp_username', e.target.value)} placeholder="you@gmail.com" />
          </Field>
          <Field label="Password">
            <input type="password" value={cfg.smtp_password || ''} onChange={e => set('smtp_password', e.target.value)} placeholder="••••••••" />
          </Field>
          <Field label="From address">
            <input value={cfg.smtp_from || ''} onChange={e => set('smtp_from', e.target.value)} placeholder="JobJames <you@gmail.com>" />
          </Field>
          <Field label="TLS">
            <label className="settings-toggle">
              <input type="checkbox" checked={(cfg.smtp_tls || 'true') === 'true'}
                onChange={e => set('smtp_tls', e.target.checked ? 'true' : 'false')} />
              <span>Use TLS</span>
            </label>
          </Field>
        </div>
        <button
          type="button"
          className="btn-secondary btn-test"
          onClick={handleTestSmtp}
          disabled={testState === 'sending'}
        >
          {testState === 'sending' ? 'Sending…' : testState === 'ok' ? 'Sent!' : testState === 'error' ? 'Failed' : 'Send test email'}
        </button>
      </Section>

      {/* ── Danger Zone ── */}
      <Section title="Danger Zone">
        <div className="danger-zone">
          <p className="danger-zone-desc">
            Permanently delete your account and all associated data — jobs, tracker entries, saved searches, and settings. This cannot be undone.
          </p>
          {!confirmDelete ? (
            <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)}>
              Delete account
            </button>
          ) : (
            <div className="danger-confirm">
              <p className="danger-confirm-text">Are you sure? All your data will be permanently deleted and cannot be recovered.</p>
              <div className="danger-confirm-actions">
                <button type="button" className="btn-secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  Cancel
                </button>
                <button type="button" className="btn-danger-solid" onClick={handleDeleteAccount} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Yes, delete my account'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── Saved Searches ── */}
      <Section title="Saved Searches">
        <p className="settings-desc">
          Searches saved from the Search page. Click a name to rename it, click Expand to see full criteria, or click Edit to load it back into the search form.
        </p>
        {searches.length === 0 ? (
          <p className="settings-empty">No saved searches yet. Run a search and click <strong>Save search</strong>.</p>
        ) : (
          <div className="searches-table-wrap">
            <table className="searches-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Criteria</th>
                  <th>Schedule</th>
                  <th>Email results to</th>
                  <th>Limit</th>
                  <th>Last run</th>
                  <th>On</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {searches.map(s => {
                  const criteria = parseCriteria(s.criteria_json)
                  const isExpanded = expandedSearchId === s.id
                  return (
                    <>
                      <tr key={s.id} className={isExpanded ? 'search-row-expanded' : ''}>
                        <td className="search-name"><SearchNameCell search={s} /></td>
                        <td className="search-criteria-cell">
                          <button
                            className="criteria-expand-btn"
                            onClick={() => setExpandedSearchId(isExpanded ? null : s.id)}
                            title={isExpanded ? 'Collapse' : 'Expand criteria'}
                          >
                            <CriteriaSummary criteria={criteria} />
                            <span className="criteria-expand-arrow">{isExpanded ? '▲' : '▼'}</span>
                          </button>
                        </td>
                        <td>
                          <select
                            className="schedule-select"
                            value={s.schedule}
                            onChange={e => handleSearchUpdate(s.id, { schedule: e.target.value })}
                          >
                            {SCHEDULES.map(v => <option key={v} value={v}>{SCHEDULE_LABELS[v]}</option>)}
                          </select>
                        </td>
                        <td className="search-email-cell"><SearchEmailCell search={s} /></td>
                        <td className="search-limit-cell"><SearchLimitCell search={s} /></td>
                        <td className="search-last-run">{s.last_run ? s.last_run.slice(0, 16) : '—'}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={s.is_enabled}
                            onChange={e => handleSearchUpdate(s.id, { is_enabled: e.target.checked })}
                            className="search-toggle"
                          />
                        </td>
                        <td className="search-actions">
                          <button className="btn-edit-search" onClick={() => handleEditSearch(s)} title="Edit in search form">Edit</button>
                          <button className="btn-run" onClick={() => handleRunNow(s.id)} title="Run now">▶</button>
                          <button className="btn-del" onClick={() => handleDeleteSearch(s.id)} title="Delete">✕</button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${s.id}-detail`} className="search-row-detail">
                          <td colSpan={8}>
                            <CriteriaDetail criteria={criteria} />
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}
