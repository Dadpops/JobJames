import { useState } from 'react'
import './InfoTooltip.css'

// Renders a small info icon that shows a tooltip on hover.
// Usage: <InfoTooltip text="Explain the feature here." />
export default function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false)

  return (
    <span
      className="info-tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <svg
        className="info-icon"
        width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        aria-label="Info"
        tabIndex={0}
      >
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
      {visible && (
        <span className="info-tooltip" role="tooltip">{text}</span>
      )}
    </span>
  )
}
