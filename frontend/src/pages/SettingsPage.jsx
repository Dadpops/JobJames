import { useEffect, useState } from 'react'
import {
  getSettings, saveSettings,
  getSavedSearches, updateSavedSearch, deleteSavedSearch, runSavedSearch,
} from '../api/client'
import './SettingsPage.css'

const SCHEDULES = ['off', 'daily', 'twice_daily']
const SCHEDULE_LABELS = { off: 'Off', daily: 'Daily', twice_daily: 'Twice daily' }
const FREQ_OPTIONS = ['off', 'daily', 'weekly']

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
  const [cfg, setCfg] = useState({})
  const [searches, setSearches] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testState, setTestState] = useState('idle')

  useEffect(() => {
    Promise.all([getSettings(), getSavedSearches()])
      .then(([s, ss]) => { setCfg(s); setSearches(ss) })
      .finally(() => setLoading(false))
  }, [])

  function set(key, value) {
    setCfg(c => ({ ...c, [key]: value }))
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
      const res = await fetch('/api/jobs/email', {
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

  async function handleSearchSchedule(id, schedule) {
    const updated = await updateSavedSearch(id, { schedule })
    setSearches(ss => ss.map(s => s.id === id ? updated : s))
  }

  async function handleSearchToggle(id, enabled) {
    const updated = await updateSavedSearch(id, { is_enabled: enabled })
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
  }

  if (loading) return <p className="settings-status">Loading…</p>

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <div className="settings-save-row">
          {saved && <span className="settings-saved">Saved!</span>}
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>

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

      {/* ── Saved Searches ── */}
      <Section title="Saved Searches">
        <p className="settings-desc">
          Searches saved from the Search page. Set a schedule to run them automatically.
        </p>
        {searches.length === 0 ? (
          <p className="settings-empty">No saved searches yet. Run a search and click <strong>Save this search</strong>.</p>
        ) : (
          <div className="searches-table-wrap">
            <table className="searches-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Criteria</th>
                  <th>Schedule</th>
                  <th>Last run</th>
                  <th>Enabled</th>
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
                          onChange={e => handleSearchSchedule(s.id, e.target.value)}
                        >
                          {SCHEDULES.map(v => <option key={v} value={v}>{SCHEDULE_LABELS[v]}</option>)}
                        </select>
                      </td>
                      <td className="search-last-run">{s.last_run ? s.last_run.slice(0, 16) : '—'}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={s.is_enabled}
                          onChange={e => handleSearchToggle(s.id, e.target.checked)}
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
