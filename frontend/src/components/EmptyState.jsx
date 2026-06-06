import './EmptyState.css'

export default function EmptyState({ icon, title, body }) {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <span className="empty-icon" aria-hidden="true">{icon}</span>
      <h3 className="empty-title">{title}</h3>
      {body && <p className="empty-body">{body}</p>}
    </div>
  )
}

export function SearchEmptyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="21" cy="21" r="13" stroke="currentColor" strokeWidth="2"/>
      <path d="M31 31L41 41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 21H26M21 16V26" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

export function NoResultsIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="21" cy="21" r="13" stroke="currentColor" strokeWidth="2"/>
      <path d="M31 31L41 41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M16.5 16.5L25.5 25.5M25.5 16.5L16.5 25.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

export function SavedEmptyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <polygon points="24,6 29,18 43,19.5 33,29 36,43 24,36.5 12,43 15,29 5,19.5 19,18"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  )
}

export function DismissedEmptyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="2"/>
      <path d="M15 24H33" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function TrackerEmptyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="10" y="6" width="28" height="36" rx="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M17 16H31M17 24H31M17 32H24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}
