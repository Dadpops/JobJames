import './StatusBadge.css'

const LABELS = { new: 'New', saved: 'Saved', dismissed: 'Dismissed' }

export default function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{LABELS[status]}</span>
}
