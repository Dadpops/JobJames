import { Fragment, useEffect, useState } from 'react'
import {
  getTrackerEntries, addTrackerEntry, updateTrackerEntry, deleteTrackerEntry,
  reorderTrackerEntries,
} from '../api/client'
import './TrackerPage.css'

const STATUSES = ['Found', 'Reviewing', 'Applied', 'Interviewing', 'Offer', 'Rejected', 'Dismissed']

const STATUS_CLASS = {
  Found: 'status-found', Reviewing: 'status-reviewing', Applied: 'status-applied',
  Interviewing: 'status-interviewing', Offer: 'status-offer', Rejected: 'status-rejected',
  Dismissed: 'status-dismissed',
}

function isOverdue(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date(new Date().toDateString())
}

function InlineText({ value, onSave, placeholder }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  function commit() { setEditing(false); if (draft !== (value || '')) onSave(draft || null) }
  if (!editing) return (
    <span className="inline-text" onClick={() => { setDraft(value || ''); setEditing(true) }} title="Click to edit">
      {value || <span className="placeholder">{placeholder}</span>}
    </span>
  )
  return (
    <input autoFocus className="inline-input" value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }} />
  )
}

function InlineNumber({ value, onSave, placeholder }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  function commit() {
    setEditing(false)
    const v = draft === '' ? null : parseInt(draft, 10)
    if (v !== value) onSave(v)
  }
  if (!editing) return (
    <span className="inline-text" onClick={() => { setDraft(value ?? ''); setEditing(true) }} title="Click to edit">
      {value != null ? `$${Number(value).toLocaleString()}` : <span className="placeholder">{placeholder}</span>}
    </span>
  )
  return (
    <input autoFocus type="number" className="inline-input" value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }} />
  )
}

function InlineDate({ value, onSave, overdueBg }) {
  const overdue = isOverdue(value)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  function commit() { setEditing(false); if (draft !== (value || '')) onSave(draft || null) }
  if (!editing) return (
    <span className={`inline-text ${overdue ? 'overdue' : ''}`}
      onClick={() => { setDraft(value || ''); setEditing(true) }}
      title={overdue ? 'Overdue' : 'Click to set date'}>
      {value ? <>{overdue && <span className="overdue-dot">●</span>}{value}</> : <span className="placeholder">Set date</span>}
    </span>
  )
  return (
    <input autoFocus type="date" className="inline-input" value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }} />
  )
}

function TagInput({ tags, onSave }) {
  const [input, setInput] = useState('')
  function addTag(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = input.trim().replace(/,+$/, '')
      if (tag && !tags.includes(tag)) onSave([...tags, tag])
      setInput('')
    }
  }
  function removeTag(t) { onSave(tags.filter(x => x !== t)) }
  return (
    <div className="tag-cell">
      {tags.map(t => (
        <span key={t} className="tag-chip">
          {t}
          <button className="tag-remove" onClick={() => removeTag(t)}>×</button>
        </span>
      ))}
      <input
        className="tag-input"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={addTag}
        placeholder={tags.length === 0 ? 'Add tag…' : ''}
      />
    </div>
  )
}

function DetailPanel({ entry, onUpdate }) {
  function upd(field) { return v => onUpdate(entry.id, { [field]: v }) }
  return (
    <tr className="detail-row">
      <td colSpan={8}>
        <div className="detail-panel">
          <div className="detail-section">
            <h4>Recruiter / Contact</h4>
            <div className="detail-grid">
              <div><label>Name</label><InlineText value={entry.recruiter_name} onSave={upd('recruiter_name')} placeholder="Name" /></div>
              <div><label>Email</label><InlineText value={entry.recruiter_email} onSave={upd('recruiter_email')} placeholder="email@co.com" /></div>
              <div><label>LinkedIn</label><InlineText value={entry.recruiter_linkedin} onSave={upd('recruiter_linkedin')} placeholder="linkedin.com/in/…" /></div>
              <div><label>Last contact</label><InlineDate value={entry.last_contact_date} onSave={upd('last_contact_date')} /></div>
            </div>
          </div>
          <div className="detail-section">
            <h4>Salary</h4>
            <div className="detail-grid">
              <div><label>Posted min</label><InlineNumber value={entry.salary_min} onSave={upd('salary_min')} placeholder="e.g. 80000" /></div>
              <div><label>Posted max</label><InlineNumber value={entry.salary_max} onSave={upd('salary_max')} placeholder="e.g. 150000" /></div>
              <div><label>My target</label><InlineNumber value={entry.target_salary} onSave={upd('target_salary')} placeholder="e.g. 130000" /></div>
            </div>
          </div>
          <div className="detail-section">
            <h4>Company</h4>
            <div className="detail-grid">
              <div><label>Size</label><InlineText value={entry.company_size} onSave={upd('company_size')} placeholder="e.g. 500–1000" /></div>
              <div><label>Industry</label><InlineText value={entry.company_industry} onSave={upd('company_industry')} placeholder="e.g. Fintech" /></div>
              <div className="detail-wide"><label>Research notes</label><InlineText value={entry.company_notes} onSave={upd('company_notes')} placeholder="Add notes…" /></div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}

function AddModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ title: '', company: '', location: '', url: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.company.trim()) { setError('Title and company are required.'); return }
    setSaving(true)
    try {
      const entry = await addTrackerEntry({ title: form.title.trim(), company: form.company.trim(), location: form.location.trim() || undefined, url: form.url.trim() || undefined })
      onAdd(entry)
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">Add Job to Tracker</h2>
        <form onSubmit={submit} className="modal-form">
          <label>Job Title *<input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Software Engineer" autoFocus /></label>
          <label>Company *<input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="e.g. Acme Corp" /></label>
          <label>Location<input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. New York, NY" /></label>
          <label>Job URL<input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://…" /></label>
          {error && <p className="modal-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Adding…' : 'Add to Tracker'}</button>
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
  const [expanded, setExpanded] = useState(new Set())
  const [filterTag, setFilterTag] = useState(null)
  const [filterStatus, setFilterStatus] = useState('active') // 'active' | status | null (all)

  useEffect(() => {
    getTrackerEntries().then(setEntries).finally(() => setLoading(false))
  }, [])

  const allTags = [...new Set(entries.flatMap(e => e.tags || []))]

  const visible = entries.filter(e => {
    if (filterTag && !(e.tags || []).includes(filterTag)) return false
    if (filterStatus === 'active') return e.status !== 'Dismissed'
    if (filterStatus) return e.status === filterStatus
    return true
  })

  const canReorder = !filterTag

  async function handleUpdate(id, fields) {
    try {
      const updated = await updateTrackerEntry(id, fields)
      setEntries(es => es.map(e => e.id === id ? updated : e))
    } catch {}
  }

  async function handleDelete(id) {
    try { await deleteTrackerEntry(id); setEntries(es => es.filter(e => e.id !== id)) } catch {}
  }

  function toggleExpand(id) {
    setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function moveEntry(visibleIdx, direction) {
    const swapVisibleIdx = visibleIdx + direction
    if (swapVisibleIdx < 0 || swapVisibleIdx >= visible.length) return
    const idxA = entries.findIndex(e => e.id === visible[visibleIdx].id)
    const idxB = entries.findIndex(e => e.id === visible[swapVisibleIdx].id)
    const next = [...entries]
    ;[next[idxA], next[idxB]] = [next[idxB], next[idxA]]
    setEntries(next)
    try {
      await reorderTrackerEntries(next.map((e, i) => ({ id: e.id, sort_order: i })))
    } catch {}
  }

  if (loading) return <p className="tracker-empty">Loading…</p>

  const activeCount = entries.filter(e => e.status !== 'Dismissed').length
  const dismissedCount = entries.filter(e => e.status === 'Dismissed').length

  return (
    <div className="tracker-page">
      <div className="tracker-header">
        <h1 className="tracker-title">Application Tracker</h1>
        <div className="tracker-header-actions">
          <a href="/api/tracker/export/csv" className="btn-export" download="tracker.csv">Export CSV</a>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add Job</button>
        </div>
      </div>

      <div className="tracker-filters">
        <div className="status-filter-row">
          <span className="tag-filter-label">Status:</span>
          <button
            className={`tag-filter-chip ${filterStatus === 'active' ? 'active' : ''}`}
            onClick={() => setFilterStatus('active')}
          >Active{activeCount > 0 ? ` (${activeCount})` : ''}</button>
          {STATUSES.filter(s => s !== 'Dismissed').map(s => (
            <button
              key={s}
              className={`tag-filter-chip status-chip-${STATUS_CLASS[s]} ${filterStatus === s ? 'active' : ''}`}
              onClick={() => setFilterStatus(filterStatus === s ? 'active' : s)}
            >{s}</button>
          ))}
          <button
            className={`tag-filter-chip ${filterStatus === null ? 'active' : ''}`}
            onClick={() => setFilterStatus(null)}
          >All</button>
          {dismissedCount > 0 && (
            <button
              className={`tag-filter-chip ${filterStatus === 'Dismissed' ? 'active' : ''}`}
              onClick={() => setFilterStatus(filterStatus === 'Dismissed' ? 'active' : 'Dismissed')}
            >Dismissed ({dismissedCount})</button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="tag-filter-row">
            <span className="tag-filter-label">Tag:</span>
            <button className={`tag-filter-chip ${!filterTag ? 'active' : ''}`} onClick={() => setFilterTag(null)}>All</button>
            {allTags.map(t => (
              <button key={t} className={`tag-filter-chip ${filterTag === t ? 'active' : ''}`} onClick={() => setFilterTag(t === filterTag ? null : t)}>{t}</button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="tracker-empty">
          {filterStatus === 'Dismissed'
            ? <p>No dismissed jobs.</p>
            : filterTag
              ? <p>No jobs tagged "{filterTag}".</p>
              : entries.length === 0
                ? <><p>No jobs in your tracker yet.</p><p>Use <strong>Save to Tracker</strong> on a search result, or add one manually.</p></>
                : <p>No jobs match the current filter.</p>}
        </div>
      ) : (
        <div className="tracker-table-wrap">
          <table className="tracker-table">
            <thead>
              <tr>
                <th className="col-controls"></th>
                <th>Job Title</th>
                <th>Company</th>
                <th>Status</th>
                <th>Deadline</th>
                <th>Tags</th>
                <th>Follow-up</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((entry, idx) => (
                <Fragment key={entry.id}>
                  <tr className={`${expanded.has(entry.id) ? 'row-expanded' : ''} ${entry.status === 'Dismissed' ? 'row-dismissed' : ''}`}>
                    <td className="cell-controls">
                      <button className="btn-expand" onClick={() => toggleExpand(entry.id)} title="Show details">
                        {expanded.has(entry.id) ? '▼' : '▶'}
                      </button>
                      {canReorder && (
                        <span className="reorder-btns">
                          <button
                            className="btn-reorder"
                            onClick={() => moveEntry(idx, -1)}
                            disabled={idx === 0}
                            title="Move up"
                          >▲</button>
                          <button
                            className="btn-reorder"
                            onClick={() => moveEntry(idx, 1)}
                            disabled={idx === visible.length - 1}
                            title="Move down"
                          >▼</button>
                        </span>
                      )}
                    </td>
                    <td>
                      {entry.url
                        ? <a href={entry.url} target="_blank" rel="noopener noreferrer" className="tracker-link">{entry.title}</a>
                        : entry.title}
                      {entry.location && <div className="tracker-location">{entry.location}</div>}
                    </td>
                    <td>{entry.company}</td>
                    <td>
                      <select
                        className={`status-select ${STATUS_CLASS[entry.status]}`}
                        value={entry.status}
                        onChange={e => handleUpdate(entry.id, { status: e.target.value })}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="date-cell">
                      <InlineDate value={entry.deadline} onSave={v => handleUpdate(entry.id, { deadline: v })} />
                    </td>
                    <td>
                      <TagInput tags={entry.tags || []} onSave={v => handleUpdate(entry.id, { tags: v })} />
                    </td>
                    <td className="date-cell">
                      <InlineDate value={entry.followup_date} onSave={v => handleUpdate(entry.id, { followup_date: v })} />
                    </td>
                    <td className="notes-cell">
                      <InlineText value={entry.notes} onSave={v => handleUpdate(entry.id, { notes: v })} placeholder="Add notes…" />
                    </td>
                    <td>
                      <button className="btn-delete" onClick={() => handleDelete(entry.id)} title="Remove">✕</button>
                    </td>
                  </tr>
                  {expanded.has(entry.id) && (
                    <DetailPanel entry={entry} onUpdate={handleUpdate} />
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddModal onAdd={e => { setEntries(es => [e, ...es]); setShowAdd(false) }} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
