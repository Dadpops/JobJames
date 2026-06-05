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

export async function emailJob(jobId, to) {
  const res = await fetch(`${BASE}/jobs/${jobId}/email`, {
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

export async function getTrackerEntries() {
  const res = await fetch(`${BASE}/tracker`)
  if (!res.ok) throw new Error(`Failed to load tracker: ${res.status}`)
  return res.json()
}

export async function addTrackerEntry(data) {
  const res = await fetch(`${BASE}/tracker`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to add tracker entry: ${res.status}`)
  return res.json()
}

export async function addJobToTracker(jobId) {
  const res = await fetch(`${BASE}/tracker/from-job/${jobId}`, { method: 'POST' })
  if (!res.ok) throw new Error(`Failed to add job to tracker: ${res.status}`)
  return res.json()
}

export async function updateTrackerEntry(entryId, data) {
  const res = await fetch(`${BASE}/tracker/${entryId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to update tracker entry: ${res.status}`)
  return res.json()
}

export async function deleteTrackerEntry(entryId) {
  const res = await fetch(`${BASE}/tracker/${entryId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete tracker entry: ${res.status}`)
}
