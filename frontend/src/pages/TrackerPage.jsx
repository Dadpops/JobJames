import { useEffect, useState, useRef } from 'react'
import {
  getTrackerEntries,
  addTrackerEntry,
  updateTrackerEntry,
  deleteTrackerEntry,
} from '../api/client'
import './TrackerPage.css'

const STATUSES = ['Found', 'Reviewing', 'Applied', 'Interviewing', 'Offer', 'Rejected']

const STATUS_CLASS = {
  Found: 'status-found',
  Reviewing: 'status-reviewing',
  Applied: 'status-applied',
  Interviewing: 'status-interviewing',
  Offer: 'status-offer',
  Rejected: 'status-rejected',
}

function isOverdue(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date(new Date().toDateString())
}

function InlineText({ value, onSave, placeholder }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const ref = useRef(null)

  function commit() {
    setEditing(false)
    if (draft !== (value || '')) onSave(draft)
  }

  if (!editing) {
    return (
      <span
        className="inline-text"
        onClick={() => { setDraft(value || ''); setEditing(true) }}
        title="Click to edit"
      >
        {value || <span className="placeholder">{placeholder}</span>}
      </span>
    )
  }

  return (
    <input
      ref={ref}
      autoFocus
      className="inline-input"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
    />
  )
}

function InlineDate({ value, onSave }) {
  const overdue = isOverdue(value)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')

  function commit() {
    setEditing(false)
    if (draft !== (value || '')) onSave(draft || null)
  }

  if (!editing) {
    return (
      <span
        className={`inline-text ${overdue ? 'overdue' : ''}`}
        onClick={() => { setDraft(value || ''); setEditing(true) }}
        title={overdue ? 'Overdue — click to edit' : 'Click to set follow-up date'}
      >
        {value
          ? <>{overdue && <span className="overdue-dot" title="Overdue">●</span>}{value}</>
          : <span className="placeholder">Set date</span>}
      </span>
    )
  }

  return (
    <input
      autoFocus
      type="date"
      className="inline-input"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
    />
  )
}

function AddModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ title: '', company: '', location: '', url: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.company.trim()) {
      setError('Title and company are required.')
      return
    }
    setSaving(true)
    try {
      const entry = await addTrackerEntry({
        title: form.title.trim(),
        company: form.company.trim(),
        location: form.location.trim() || undefined,
        url: form.url.trim() || undefined,
      })
      onAdd(entry)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">Add Job to Tracker</h2>
        <form onSubmit={submit} className="modal-form">
          <label>
            Job Title *
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Software Engineer" autoFocus />
          </label>
          <label>
            Company *
            <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="e.g. Acme Corp" />
          </label>
          <label>
            Location
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. New York, NY" />
          </label>
          <label>
            Job URL
            <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://…" />
          </label>
          {error && <p className="modal-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Adding…' : 'Add to Tracker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TrackerPage() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    getTrackerEntries()
      .then(setEntries)
      .finally(() => setLoading(false))
  }, [])

  async function handleStatusChange(id, status) {
    try {
      const updated = await updateTrackerEntry(id, { status })
      setEntries(es => es.map(e => e.id === id ? updated : e))
    } catch {}
  }

  async function handleFieldSave(id, field, value) {
    try {
      const updated = await updateTrackerEntry(id, { [field]: value })
      setEntries(es => es.map(e => e.id === id ? updated : e))
    } catch {}
  }

  async function handleDelete(id) {
    try {
      await deleteTrackerEntry(id)
      setEntries(es => es.filter(e => e.id !== id))
    } catch {}
  }

  function handleAdd(entry) {
    setEntries(es => [entry, ...es])
    setShowAdd(false)
  }

  if (loading) return <p className="tracker-empty">Loading…</p>

  return (
    <div className="tracker-page">
      <div className="tracker-header">
        <h1 className="tracker-title">Application Tracker</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add Job</button>
      </div>

      {entries.length === 0 ? (
        <div className="tracker-empty">
          <p>No jobs in your tracker yet.</p>
          <p>Use <strong>Save to Tracker</strong> on a search result, or add one manually.</p>
        </div>
      ) : (
        <div className="tracker-table-wrap">
          <table className="tracker-table">
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Company</th>
                <th>Location</th>
                <th>Status</th>
                <th>Date Added</th>
                <th>Follow-up</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id}>
                  <td>
                    {entry.url
                      ? <a href={entry.url} target="_blank" rel="noopener noreferrer" className="tracker-link">{entry.title}</a>
                      : entry.title}
                  </td>
                  <td>{entry.company}</td>
                  <td className="location-cell">
                    {entry.location || <span className="cell-muted">—</span>}
                  </td>
                  <td>
                    <select
                      className={`status-select ${STATUS_CLASS[entry.status]}`}
                      value={entry.status}
                      onChange={e => handleStatusChange(entry.id, e.target.value)}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="date-cell">{entry.date_added}</td>
                  <td className="date-cell">
                    <InlineDate
                      value={entry.followup_date}
                      onSave={v => handleFieldSave(entry.id, 'followup_date', v)}
                    />
                  </td>
                  <td className="notes-cell">
                    <InlineText
                      value={entry.notes}
                      onSave={v => handleFieldSave(entry.id, 'notes', v)}
                      placeholder="Add notes…"
                    />
                  </td>
                  <td>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(entry.id)}
                      title="Remove from tracker"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
