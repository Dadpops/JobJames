export const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const BASE = API_BASE

// ── Auth helpers ──────────────────────────────────────────────────────────────

function getAccessCode() {
  return localStorage.getItem('jj_access_code') || ''
}

function authHeaders(extra = {}) {
  const code = getAccessCode()
  const headers = { 'Content-Type': 'application/json', ...extra }
  if (code) headers['X-Access-Code'] = code
  return headers
}

function handleUnauthorized() {
  localStorage.removeItem('jj_access_code')
  localStorage.removeItem('jobjames_display_name')
  window.location.reload()
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  })
  if (res.status === 401) {
    handleUnauthorized()
    throw new Error('Unauthorized')
  }
  return res
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function register(displayName, email = '') {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName, email }),
  })
  if (!res.ok) throw new Error('Registration failed')
  return res.json()
}

export async function login(accessCode, displayName) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_code: accessCode, display_name: displayName }),
  })
  if (!res.ok) throw new Error('Invalid access code — check your code and try again')
  return res.json()
}

export async function deleteAccount() {
  const res = await apiFetch(`${BASE}/auth/account`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete account')
  return res.json()
}

export async function recoverCode(email) {
  const res = await fetch(`${BASE}/auth/recover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) throw new Error('Something went wrong — please try again')
  return res.json()
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export async function searchJobs(criteria) {
  const res = await apiFetch(`${BASE}/jobs/search`, {
    method: 'POST',
    body: JSON.stringify(criteria),
  })
  if (!res.ok) throw new Error(`Search failed: ${res.status}`)
  return res.json()
}

export async function getSavedJobs() {
  const res = await apiFetch(`${BASE}/jobs/saved`)
  if (!res.ok) throw new Error(`Failed to load saved jobs: ${res.status}`)
  return res.json()
}

export async function getDismissedJobs() {
  const res = await apiFetch(`${BASE}/jobs/dismissed`)
  if (!res.ok) throw new Error(`Failed to load dismissed jobs: ${res.status}`)
  return res.json()
}

export async function updateJobStatus(jobId, status) {
  const res = await apiFetch(`${BASE}/jobs/${jobId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error(`Status update failed: ${res.status}`)
  return res.json()
}

export async function emailJob(jobId, to) {
  const res = await apiFetch(`${BASE}/jobs/${jobId}/email`, {
    method: 'POST',
    body: JSON.stringify({ to }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Email failed: ${res.status}`)
  }
  return res.json()
}

export async function emailSavedJobs(to) {
  const res = await apiFetch(`${BASE}/jobs/email`, {
    method: 'POST',
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
  const res = await apiFetch(`${BASE}/settings`)
  if (!res.ok) throw new Error(`Failed to load settings: ${res.status}`)
  return res.json()
}

export async function saveSettings(data) {
  const res = await apiFetch(`${BASE}/settings`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to save settings: ${res.status}`)
  return res.json()
}

// ── Saved Searches ────────────────────────────────────────────────────────────

export async function getSavedSearches() {
  const res = await apiFetch(`${BASE}/searches`)
  if (!res.ok) throw new Error(`Failed to load searches: ${res.status}`)
  return res.json()
}

export async function createSavedSearch(data) {
  const res = await apiFetch(`${BASE}/searches`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to save search: ${res.status}`)
  return res.json()
}

export async function updateSavedSearch(id, data) {
  const res = await apiFetch(`${BASE}/searches/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to update search: ${res.status}`)
  return res.json()
}

export async function deleteSavedSearch(id) {
  const res = await apiFetch(`${BASE}/searches/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete search: ${res.status}`)
}

export async function runSavedSearch(id) {
  const res = await apiFetch(`${BASE}/searches/${id}/run`, { method: 'POST' })
  if (!res.ok) throw new Error(`Failed to run search: ${res.status}`)
  return res.json()
}

// ── Tracker ───────────────────────────────────────────────────────────────────

export async function getTrackerEntries() {
  const res = await apiFetch(`${BASE}/tracker`)
  if (!res.ok) throw new Error(`Failed to load tracker: ${res.status}`)
  return res.json()
}

export async function addTrackerEntry(data) {
  const res = await apiFetch(`${BASE}/tracker`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to add tracker entry: ${res.status}`)
  return res.json()
}

export async function addJobToTracker(jobId) {
  const res = await apiFetch(`${BASE}/tracker/from-job/${jobId}`, { method: 'POST' })
  if (!res.ok) throw new Error(`Failed to add job to tracker: ${res.status}`)
  return res.json()
}

export async function updateTrackerEntry(entryId, data) {
  const res = await apiFetch(`${BASE}/tracker/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to update tracker entry: ${res.status}`)
  return res.json()
}

export async function deleteTrackerEntry(entryId) {
  const res = await apiFetch(`${BASE}/tracker/${entryId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete tracker entry: ${res.status}`)
}

export async function reorderTrackerEntries(items) {
  const res = await apiFetch(`${BASE}/tracker/reorder`, {
    method: 'PATCH',
    body: JSON.stringify(items),
  })
  if (!res.ok) throw new Error(`Failed to reorder tracker: ${res.status}`)
}

export async function getActivity(limit = 30) {
  const res = await apiFetch(`${BASE}/activity?limit=${limit}`)
  if (!res.ok) throw new Error(`Failed to fetch activity: ${res.status}`)
  return res.json()
}
