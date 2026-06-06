// In development Vite proxies /api to localhost:8000 (vite.config.js).
// In production set VITE_API_URL to the backend Railway URL at build time.
export const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const BASE = API_BASE

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

export async function getDismissedJobs() {
  const res = await fetch(`${BASE}/jobs/dismissed`)
  if (!res.ok) throw new Error(`Failed to load dismissed jobs: ${res.status}`)
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

export async function getDismissedJobs() {
  const res = await fetch(`${BASE}/jobs/dismissed`)
  if (!res.ok) throw new Error(`Failed to load dismissed jobs: ${res.status}`)
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

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings() {
  const res = await fetch(`${BASE}/settings`)
  if (!res.ok) throw new Error(`Failed to load settings: ${res.status}`)
  return res.json()
}

export async function saveSettings(data) {
  const res = await fetch(`${BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to save settings: ${res.status}`)
  return res.json()
}

// ── Saved Searches ────────────────────────────────────────────────────────────

export async function getSavedSearches() {
  const res = await fetch(`${BASE}/searches`)
  if (!res.ok) throw new Error(`Failed to load searches: ${res.status}`)
  return res.json()
}

export async function createSavedSearch(data) {
  const res = await fetch(`${BASE}/searches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to save search: ${res.status}`)
  return res.json()
}

export async function updateSavedSearch(id, data) {
  const res = await fetch(`${BASE}/searches/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to update search: ${res.status}`)
  return res.json()
}

export async function deleteSavedSearch(id) {
  const res = await fetch(`${BASE}/searches/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete search: ${res.status}`)
}

export async function runSavedSearch(id) {
  const res = await fetch(`${BASE}/searches/${id}/run`, { method: 'POST' })
  if (!res.ok) throw new Error(`Failed to run search: ${res.status}`)
  return res.json()
}

// ── Tracker ───────────────────────────────────────────────────────────────────

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

export async function reorderTrackerEntries(items) {
  const res = await fetch(`${BASE}/tracker/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  })
  if (!res.ok) throw new Error(`Failed to reorder tracker: ${res.status}`)
}
