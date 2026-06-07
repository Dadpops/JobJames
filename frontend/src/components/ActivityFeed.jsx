import { useEffect, useState } from 'react'
import { getActivity } from '../api/client'
import './ActivityFeed.css'

const EVENT_ICONS = {
  search:         '🔍',
  job_saved:      '★',
  job_dismissed:  '✕',
  tracker_add:    '＋',
  tracker_update: '→',
  search_saved:   '📌',
}

const EVENT_LABELS = {
  search:         'search',
  job_saved:      'saved',
  job_dismissed:  'dismissed',
  tracker_add:    'tracked',
  tracker_update: 'updated',
  search_saved:   'pinned',
}

function timeAgo(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr.replace(' ', 'T') + 'Z')
  if (isNaN(d)) return ''
  const secs = Math.floor((Date.now() - d.getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

export default function ActivityFeed({ refreshKey }) {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(true)

  useEffect(() => {
    setLoading(true)
    getActivity(20)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [refreshKey])

  if (loading) return null
  if (!events.length) return null

  return (
    <div className="activity-feed">
      <button className="activity-header" onClick={() => setOpen(v => !v)}>
        <span className="activity-title">Recent Activity</span>
        <span className="activity-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul className="activity-list">
          {events.map(ev => (
            <li key={ev.id} className={`activity-item activity-${ev.event_type}`}>
              <span className="activity-icon">{EVENT_ICONS[ev.event_type] || '·'}</span>
              <span className="activity-desc">{ev.description}</span>
              <span className="activity-time">{timeAgo(ev.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
