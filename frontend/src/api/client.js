const BASE = '/api'

export async function searchJobs(criteria) {
  const res = await fetch(`${BASE}/jobs/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(criteria),
  })
  if (!res.ok) throw new Error(`Search failed: ${res.status}`)
  return res.json()
}

export async function getSavedJobs() {
  const res = await fetch(`${BASE}/jobs/saved`)
  if (!res.ok) throw new Error(`Failed to load saved jobs: ${res.status}`)
  return res.json()
}

export async function updateJobStatus(jobId, status) {
  const res = await fetch(`${BASE}/jobs/${jobId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error(`Status update failed: ${res.status}`)
  return res.json()
}

export async function emailSavedJobs(to) {
  const res = await fetch(`${BASE}/jobs/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Email failed: ${res.status}`)
  }
  return res.json()
}
