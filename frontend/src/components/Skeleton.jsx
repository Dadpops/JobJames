import './Skeleton.css'

function SkeletonBlock({ w, h = 12, r = 4, style }) {
  return <span className="skel" style={{ width: w, height: h, borderRadius: r, ...style }} />
}

export function SkeletonJobCard() {
  return (
    <div className="skel-job-card" aria-hidden="true">
      <div className="skel-job-main">
        <SkeletonBlock w={20} h={20} r={4} />
        <div className="skel-job-body">
          <SkeletonBlock w="52%" h={13} />
          <SkeletonBlock w="72%" h={10} />
          <SkeletonBlock w="38%" h={10} />
        </div>
        <SkeletonBlock w={54} h={24} r={5} />
      </div>
    </div>
  )
}

export function SkeletonJobList({ count = 5 }) {
  return Array.from({ length: count }, (_, i) => <SkeletonJobCard key={i} />)
}

export function SkeletonTableRow({ cols = 7 }) {
  const widths = ['55%', '28%', '60%', '70%', '30%', '45%', '20%']
  return (
    <tr className="skel-row" aria-hidden="true">
      {Array.from({ length: cols }, (_, i) => (
        <td key={i}><SkeletonBlock w={widths[i % widths.length]} h={11} /></td>
      ))}
    </tr>
  )
}

export function SkeletonTableRows({ count = 6, cols }) {
  return Array.from({ length: count }, (_, i) => <SkeletonTableRow key={i} cols={cols} />)
}
