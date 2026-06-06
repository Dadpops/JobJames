import { useEffect, useState } from 'react'
import {
  getSettings, saveSettings,
  getSavedSearches, updateSavedSearch, deleteSavedSearch, runSavedSearch,
  API_BASE,
} from '../api/client'
import InfoTooltip from '../components/InfoTooltip'
import './SettingsPage.css'

const SCHEDULES = ['off', 'daily', 'twice_daily']
const SCHEDULE_LABELS = { off: 'Off', daily: 'Daily', twice_daily: 'Twice daily' }
const FREQ_OPTIONS = ['off', 'daily', 'weekly']

const SECTION_TOOLTIPS = {
  'Email Digest': 'Sends a scheduled summary of overdue follow-ups and new matches to your inbox.',
  'SMTP Configuration': 'Outgoing mail server settings used for all automated emails and digests.',
  'Saved Searches': 'Searches saved from the Search page. Set a schedule to run them automatically and email results.',
}

function Section({ title, children }) {
  return (
    <section className="settings-section">
      <h2 className="settings-section-title">
        {title}
        {SECTION_TOOLTIPS[title] && <InfoTooltip text={SECTION_TOOLTIPS[title]} />}
      </h2>
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
  const [cfg, setCfg]           = useState({})
  const [searches, setSearches] = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [testState, setTestState] = useState('idle')
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('jobjames_display_name') || '')
  const [nameDraft, setNameDraft]     = useState('')
  const [editingName, setEditingName] = useState(false)

  useEffect(() => {
    Promise.all([getSettings(), getSavedSearches()])
      .then(([s, ss]) => { setCfg(s); setSearches(ss) })
      .finally(() => setLoading(false))
  }, [])

  // Keep the searches list in sync when a search is saved or deleted from another page
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

  async function handleTestSmtp() {
    setTestState('sending')
    try {
      await saveSettings(cfg)
      const to = cfg.digest_to || prompt('Send test email to:')
      if (!to) { setTestState('idle'); return }
      const res = await fetch(`${API_BASE}/jobs/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      })
      setTestState(res.ok ? 'ok' : 'error')
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
    window.dispatchEvent(new CustomEvent('jobjames:search-saved'))
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
        </div>
      </Section>

      {/* ── Email Digest ── */}
      <Section title="Email Digest">
        <p className="settings-desc">
          The email digest sends you a summary of new job matches and overdue follow-ups on your chosen schedule.
          Configure your SMTP settings below to enable sending.
          <strong> Gmail users: use an App Password, not your account password.</strong>
        </p>
        <div className="settings-grid">
          <Field label="Recipient email" hint="Where the digest is sent">
            <input
              type="email"
              value={cfg.digest_to || ''}
              onChange={e => set('digest_to', e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Frequency" hint="How often to send">
            <select value={cfg.digest_frequency || 'off'} onChange={e => set('digest_frequency', e.target.value)}>
              {FREQ_OPTIONS.map(f => <option key={f} value={f}>{f === 'off' ? 'Off' : f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Send time" hint="24-hour format, e.g. 08:00">
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
        <p className="settings-desc">
          Configure your outgoing mail server so JobJames can send digests and job emails directly.
          If left blank, the Resend API is used instead.
          <strong> Gmail users:</strong> use <code>smtp.gmail.com</code>, port <code>587</code>, and an App Password (not your regular password).
        </p>
        <div className="settings-grid">
          <Field label="Host" hint="SMTP server address, e.g. smtp.gmail.com">
            <input value={cfg.smtp_host || ''} onChange={e => set('smtp_host', e.target.value)} placeholder="smtp.gmail.com" />
          </Field>
          <Field label="Port" hint="587 for TLS (recommended), 465 for SSL, 25 for plain">
            <input type="number" value={cfg.smtp_port || ''} onChange={e => set('smtp_port', e.target.value)} placeholder="587" />
          </Field>
          <Field label="Username" hint="Your email address or SMTP login">
            <input value={cfg.smtp_username || ''} onChange={e => set('smtp_username', e.target.value)} placeholder="you@gmail.com" />
          </Field>
          <Field label="Password" hint="Gmail: use an App Password from your Google account settings">
            <input type="password" value={cfg.smtp_password || ''} onChange={e => set('smtp_password', e.target.value)} placeholder="••••••••" />
          </Field>
          <Field label="From address" hint="Shown as the sender name and address">
            <input value={cfg.smtp_from || ''} onChange={e => set('smtp_from', e.target.value)} placeholder="JobJames <you@gmail.com>" />
          </Field>
          <Field label="TLS" hint="Encrypts the connection — required by most modern mail servers">
            <label className="settings-toggle">
              <input type="checkbox" checked={(cfg.smtp_tls || 'true') === 'true'}
                onChange={e => set('smtp_tls', e.target.checked ? 'true' : 'false')} />
              <span>Use TLS</span>
            </label>
          </Field>
        </div>
        <div className="smtp-test-row">
          <button
            type="button"
            className="btn-secondary btn-test"
            onClick={handleTestSmtp}
            disabled={testState === 'sending'}
          >
            {testState === 'sending' ? 'Sending…' : testState === 'ok' ? 'Sent!' : testState === 'error' ? 'Failed — check SMTP settings' : 'Send test email'}
          </button>
          <span className="smtp-test-hint">Saves settings first, then sends a test digest to the recipient email above.</span>
        </div>
      </Section>

      {/* ── Saved Searches ── */}
      <Section title="Saved Searches">
        <p className="settings-desc">
          Searches saved from the Search page. Set a schedule to run them automatically.
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
                  const criteria = (() => { try { const c = JSON.parse(s.criteria_json); return `${c.title}${c.location ? ` · ${c.location}` : ''}` } catch { return '—' } })()
                  return (
                    <tr key={s.id}>
                      <td className="search-name">{s.name}</td>
                      <td className="search-criteria">{criteria}</td>
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
                        <button className="btn-run" onClick={() => handleRunNow(s.id)} title="Run now">▶</button>
                        <button className="btn-del" onClick={() => handleDeleteSearch(s.id)} title="Delete">✕</button>
                      </td>
                    </tr>
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
