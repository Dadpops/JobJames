# JobJames Roadmap

Last updated: 2026-06-06

---

## Phase 1 — Scaffold & Core Crawlers ✅

**Branch:** `phase-1-scaffold` → `feature/indeed-crawler` → `feature/linkedin-crawler`
**PRs:** #1, #2, #3
**Status:** Merged

### Scope
- FastAPI backend with `/api/jobs/search`, `/api/jobs/{id}`, `/api/jobs/{id}/status`
- Pydantic models: `JobListing`, `SearchRequest`, `JobStatus`
- Working crawlers: Greenhouse (public board API), Lever (public postings API)
- Indeed crawler via `curl_cffi` + `window.mosaic` JSON blob extraction
- LinkedIn crawler via public guest jobs API (no auth)
- Deduplication by `(title, company)` fingerprint
- Relevance scoring weighted on title match, remote preference, salary overlap, location
- React 18 / Vite frontend: `SearchForm`, `JobCard` with Save/Dismiss, `StatusBadge`
- Dark theme via CSS variables
- Docker + docker-compose for local dev

---

## Phase 1b — Persistence, Saved Tab & Email ✅

**Branches:** `feature/persistence-saved-email-filters`, `feature/unsave-dismiss-ux`, `feature/resend-email`, `feature/loading-email-autocomplete`
**PRs:** #4, #5, #6, #8
**Status:** Merged

### Scope
- SQLite persistence via `aiosqlite` — saved/dismissed status survives re-searches (upsert preserves status)
- Saved tab at `/saved` showing all saved listings
- Email digest — HTML export of saved listings via SMTP; later swapped to Resend API
- Advanced search filters — per-source toggles, date posted, experience level, job type
- Unsave toggle and dismiss-from-view on search results page
- Loading spinner during search
- Per-job email action
- Job title autocomplete

---

## Phase 2 — Application Tracker ✅

**Branch:** `phase-2-tracker`
**PR:** #7
**Status:** Merged

### Scope
- Tracker tab at `/tracker` — application pipeline table
- 7 columns: Job Title, Company, Location, Status, Date Added, Follow-up Date, Notes
- Inline-editable status badge (Found / Reviewing / Applied / Interviewing / Offer / Rejected)
- Inline-editable notes and follow-up date; overdue dates highlighted red
- Quick-add modal for manual entries
- "Save to Tracker" button on every search result card
- SQLite `tracker` table; 5 CRUD endpoints at `/api/tracker`

---

## Phase 3 — Power Tools & UX ✅

**Branches:** `phase-3-power-tools`, `phase-3-ux-updates`
**PRs:** #9, #10, #11
**Status:** Merged

### Scope
- Settings page — email digest config (recipient, frequency, send time), SMTP config with test-send, saved searches table with per-search schedule selectors
- APScheduler — runs saved searches on cron and sends email digests; reschedules live on config change
- Tracker: deadline column, free-form tag system with filter bar, expandable row detail panel (recruiter contact, salary tracking, company research notes), CSV export
- Search: stale badge (>30 days), multi-source badges on deduplicated results, clickable score showing per-factor breakdown, one-click Apply button, inline Save this search flow
- Dismissed Jobs tab; salary display fix
- `/api/settings` (key/value store) and `/api/searches` (CRUD + immediate run) endpoints

---

## Phase 3b — Design Overhaul ✅

**Branches:** `phase-3b-design`, `phase-3c-card-updates`, `phase-3e-bug-fixes`, `phase-3g-saved-search-editing`, `phase-3c-design-polish`
**PRs:** #18, #19, #20, #21, #23
**Status:** Merged

### Scope
- Full dark UI redesign — sidebar nav, filter chips, refined color palette
- Star-to-save on job cards, card expansion, follow-ups stat
- Light mode, responsive layout, skeleton loaders, empty states, accessibility pass
- Saved search editing — load, update, rename, expand saved searches from Settings
- QA bug fixes pass

---

## Phase 3 Deploy — Railway / Production ✅

**Branch:** `phase-deploy-railway`
**PR:** #22
**Status:** Merged

### Scope
- Railway deployment config (`railway.toml`)
- Production `Dockerfile` for backend
- Score display removed from production UI

---

## Phase 4 — Extended Job Sources ✅

**Branch:** `phase-4-job-sources`
**PR:** #24
**Status:** Merged

### Scope
Five new crawlers added alongside the existing Indeed, LinkedIn, Greenhouse, and Lever:

| Source | Strategy |
|---|---|
| Glassdoor | `curl_cffi` + `__NEXT_DATA__` JSON extraction, JSON-LD fallback |
| Wellfound | `httpx` + `__NEXT_DATA__` extraction |
| ZipRecruiter | `httpx` + JSON-LD structured data, HTML card fallback |
| RemoteOK | Public JSON API (`remoteok.io/api`) with tag filtering |
| WeWorkRemotely | HTML search endpoint, RSS feed fallback |

All sources registered in `JobSource` enum, crawler registry, and `SearchForm` source selector.

---

## Phase 5 — AI & Intelligence 🔲

**Branch:** `phase-5-ai`
**Issue:** #17
**Status:** Planned

### Sub-features

#### 5a — Resume keyword matching
- Upload a resume (PDF/text) via the Settings page
- Score jobs against resume keywords in addition to search criteria
- Surface a "match %" per job card

#### 5b — Smart re-ranking
- Use Claude API to re-rank results based on full job description vs. user profile
- Run asynchronously post-search; update scores without blocking the UI

#### 5c — AI cover letter drafts
- "Draft cover letter" button per job card
- Claude-generated draft tailored to job description + user resume
- Displayed in a modal with copy-to-clipboard

#### 5d — Job fit explanation
- Plain-English "Why this job?" blurb per result
- Generated from job description + search intent

**Depends on:** Design polish for modal/UI surfaces (complete)
