# JobJames

A personal job search aggregator that queries Indeed, Greenhouse, Lever, and LinkedIn simultaneously, deduplicates and scores results, and provides a full application-tracking pipeline — all in a single self-hosted app.

## Features

### Search
- Search across Indeed, Greenhouse, Lever, and LinkedIn in one request
- Job title autocomplete with 50+ curated role suggestions
- Filters: location, remote-only, salary range, date posted, experience level, job type, sources
- Deduplication by (title, company) and relevance scoring with click-to-expand breakdown
- Save, Dismiss, or Track individual results; email any listing with one click
- Stale listing indicator (posted > 30 days ago)

### Saved Jobs
- Dedicated tab showing all saved listings
- Bulk email all saved jobs to any address (Resend API)

### Dismissed Jobs
- Dedicated tab showing all dismissed listings
- Restore dismissed jobs by saving or unsaving them

### Application Tracker
- Pipeline table for every job you're pursuing
- Columns: Job Title, Company, Location, Status, Date Added, Follow-up Date, Tags, Notes
- Status stages: Found → Reviewing → Applied → Interviewing → Offer → Rejected (colored badge, editable inline)
- Click-to-edit Notes and Follow-up Date per row; overdue dates highlighted red
- Drag-and-drop row reordering
- Quick-add modal for manually entered jobs
- "Save to Tracker" button on every search result card
- CSV export

### Saved Searches
- Save any search with a name and per-search notification email
- Re-run saved searches manually or on a schedule
- Scheduled digest emails (daily or weekly) via configurable send time

### Settings
- Configurable email digest: recipient, frequency (off/daily/weekly), send time
- SMTP configuration for self-hosted email (falls back to Resend API)

### Persistence
- SQLite backend — all jobs, statuses, tracker entries, and settings survive restarts

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.11+ / FastAPI |
| Database | SQLite via aiosqlite |
| HTTP client | httpx (async) + curl_cffi |
| Scheduling | APScheduler |
| Email | Resend API (or SMTP) |
| Frontend | React 18 / Vite |
| Routing | React Router v6 |

---

## Project structure

```
JobJames/
├── backend/
│   └── app/
│       ├── main.py              # FastAPI app + CORS + lifespan
│       ├── config.py            # Settings (pydantic-settings, .env)
│       ├── database.py          # SQLite schema + async CRUD helpers
│       ├── api/
│       │   ├── jobs.py          # Search, get, status endpoints
│       │   ├── email_route.py   # Bulk + per-job email via Resend
│       │   ├── tracker.py       # Tracker CRUD + reorder endpoints
│       │   ├── settings.py      # App settings endpoints
│       │   ├── saved_searches.py# Saved searches CRUD + run
│       │   └── router.py        # Mounts all routers
│       ├── crawlers/
│       │   ├── indeed.py        # curl_cffi + mosaic JSON extraction
│       │   ├── linkedin.py      # Guest jobs API
│       │   ├── greenhouse.py    # Public board API
│       │   └── lever.py         # Public posting API
│       ├── models/
│       │   ├── job.py           # JobListing, JobStatus, JobSource
│       │   ├── tracker.py       # TrackerEntry, TrackerStatus
│       │   └── search.py        # SearchRequest
│       └── services/
│           ├── deduplication.py
│           ├── scoring.py
│           └── scheduler.py     # APScheduler digest job
└── frontend/
    └── src/
        ├── api/client.js        # Fetch wrappers for all endpoints
        ├── components/
        │   ├── JobCard           # Card with Save/Dismiss/Track/Email actions
        │   ├── SearchForm        # Search form with autocomplete
        │   └── StatusBadge       # Colored status pill
        └── pages/
            ├── HomePage          # Search + results
            ├── SavedPage         # Saved listings + bulk email
            ├── DismissedPage     # Dismissed listings + restore
            ├── TrackerPage       # Application pipeline table
            └── SettingsPage      # App settings + saved searches
```

---

## Quick start

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # add RESEND_API_KEY if you want email
uvicorn app.main:app --reload
# API at http://localhost:8000
# Swagger UI at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# UI at http://localhost:5173
```

Vite proxies `/api/*` to `localhost:8000` so no CORS configuration is needed during development.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `RESEND_API_KEY` | No | Enables email features (bulk + per-job) |
| `EMAIL_FROM` | No | Sender address for Resend (default: `onboarding@resend.dev`) |
| `GREENHOUSE_COMPANIES` | No | Comma-separated company tokens for Greenhouse crawler |
| `LEVER_COMPANIES` | No | Comma-separated company slugs for Lever crawler |
| `CORS_ORIGINS` | No | Allowed origins (default: `http://localhost:5173`) |

---

## Deployment (Railway)

JobJames runs as two Railway services — one for the FastAPI backend and one for the React frontend.

### Prerequisites

- A [Railway](https://railway.app) account
- Your repo pushed to GitHub

### Step-by-step

**1. Create a new Railway project**

Go to [railway.app/new](https://railway.app/new) → "Deploy from GitHub repo" → select your `JobJames` fork.

**2. Add the Backend service**

- Click **+ New Service** → GitHub Repo → select `JobJames`
- Set the **Root Directory** to `backend/`
- Railway detects `railway.toml` and uses Nixpacks with `pip install -r requirements.txt`

Add these environment variables in the backend service settings:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `/data/jobjames.db` (with volume) or `jobjames.db` (ephemeral) |
| `ALLOWED_ORIGINS` | `["https://your-frontend.up.railway.app"]` |
| `RESEND_API_KEY` | Your Resend key (for email features) |
| `EMAIL_FROM` | `JobJames <noreply@yourdomain.com>` |
| `LINKEDIN_EMAIL` | _(optional)_ |
| `LINKEDIN_PASSWORD` | _(optional)_ |
| `GREENHOUSE_COMPANIES` | _(optional)_ comma-separated tokens |
| `LEVER_COMPANIES` | _(optional)_ comma-separated slugs |

> **Database persistence:** SQLite is ephemeral on Railway by default — data is lost on redeploy.
> To persist data, add a **Volume** in Railway: mount path `/data`, then set `DATABASE_URL=/data/jobjames.db`.
> A future Phase 5 migration will replace aiosqlite with SQLAlchemy + PostgreSQL for fully managed persistence.

**3. Add the Frontend service**

- Click **+ New Service** → GitHub Repo → select `JobJames`
- Set the **Root Directory** to `frontend/`
- Railway uses the `Dockerfile` (multi-stage Node → nginx build)

Add this environment variable (required — baked into the build):

| Variable | Value |
|---|---|
| `VITE_API_URL` | The backend Railway URL, e.g. `https://jobjames-backend.up.railway.app` |

**4. Generate a domain for the frontend**

In the frontend service → **Settings** → **Networking** → **Generate Domain**.
Copy the URL (e.g. `https://jobjames-frontend.up.railway.app`).

**5. Update backend CORS**

Back in the backend service, update `ALLOWED_ORIGINS` to include the frontend domain:
```
ALLOWED_ORIGINS=["https://jobjames-frontend.up.railway.app"]
```

**6. Deploy**

Both services deploy automatically on git push. Monitor logs in the Railway dashboard.

### Local production testing (Docker)

Test the production Docker images locally before deploying:

```bash
# Copy and fill in backend env vars
cp backend/.env.example backend/.env

# Build and start both services
docker-compose up --build

# Frontend at http://localhost  |  Backend API at http://localhost:8000/docs
```

---

## API reference

### Jobs

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/jobs/search` | Run all crawlers and return ranked results |
| `GET` | `/api/jobs/saved` | List all saved jobs |
| `GET` | `/api/jobs/dismissed` | List all dismissed jobs |
| `GET` | `/api/jobs/{id}` | Fetch a single listing |
| `PATCH` | `/api/jobs/{id}/status` | Set status: `new` / `saved` / `dismissed` |
| `POST` | `/api/jobs/{id}/email` | Email a single job listing |
| `POST` | `/api/jobs/email` | Email all saved jobs (bulk) |

### Tracker

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tracker` | List all tracker entries |
| `POST` | `/api/tracker` | Manually add a job to the tracker |
| `POST` | `/api/tracker/from-job/{job_id}` | Add a search result to the tracker |
| `PATCH` | `/api/tracker/{id}` | Update status, follow-up date, or notes |
| `PATCH` | `/api/tracker/reorder` | Persist drag-and-drop row order |
| `DELETE` | `/api/tracker/{id}` | Remove an entry |

### Settings

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/settings` | Get all app settings |
| `PUT` | `/api/settings` | Save app settings |

### Saved Searches

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/searches` | List saved searches |
| `POST` | `/api/searches` | Create a saved search |
| `PATCH` | `/api/searches/{id}` | Update a saved search |
| `DELETE` | `/api/searches/{id}` | Delete a saved search |
| `POST` | `/api/searches/{id}/run` | Manually run a saved search |

### Search request body

```json
{
  "title": "Software Engineer",
  "location": "New York, NY",
  "remote": false,
  "salary_min": 100000,
  "salary_max": 180000,
  "sources": ["indeed", "greenhouse", "lever", "linkedin"],
  "date_posted": "week",
  "experience_level": "senior",
  "job_type": "fulltime"
}
```

---

## Crawler status

| Source | Status | Notes |
|---|---|---|
| Indeed | Working | curl_cffi with browser impersonation + mosaic JSON extraction |
| LinkedIn | Working | Guest jobs API (unauthenticated) |
| Greenhouse | Working | Public board API — populate `GREENHOUSE_COMPANIES` in `.env` |
| Lever | Working | Public posting API — populate `LEVER_COMPANIES` in `.env` |

---

## Roadmap

### Phase 1 — Search & Discovery ✅
**Branch:** `main` (PRs #1–5)

- [x] Project scaffold (FastAPI + React + Vite)
- [x] Search form with filters (title, location, remote, salary, sources, date, level, type)
- [x] Job title autocomplete (50+ curated roles)
- [x] Indeed crawler (curl_cffi + mosaic JSON)
- [x] LinkedIn crawler (guest API)
- [x] Greenhouse + Lever crawlers (public APIs)
- [x] Deduplication by (title, company)
- [x] Relevance scoring and ranking with click-to-expand breakdown
- [x] Dashboard UI with ranked results
- [x] Save / Dismiss status tagging per listing
- [x] SQLite persistence
- [x] Saved Jobs tab
- [x] Email export via Resend (bulk + per-job)
- [x] Loading indicator during search

### Phase 2 — Application Tracker ✅
**Branch:** `phase-2-tracker` (PR #7)

- [x] Tracker tab with full pipeline table
- [x] Status stages: Found → Reviewing → Applied → Interviewing → Offer → Rejected
- [x] Inline-editable status, notes, and follow-up date
- [x] Overdue follow-up date indicator
- [x] Quick-add modal for manual entries
- [x] "Save to Tracker" from search results
- [x] CSV export

### Phase 3a — Power Tools ✅
**Branch:** `phase-3-power-tools` (PR #9)

- [x] Settings page (email digest: recipient, frequency, send time)
- [x] SMTP configuration option (falls back to Resend)
- [x] APScheduler integration for automated digests
- [x] Saved Searches (save, name, re-run, per-search notification email)
- [x] Tracker drag-and-drop row reordering
- [x] Tracker tags column

### Phase 3b — UX Updates ✅
**Branch:** `phase-3-ux-updates` (PR #10–11)

- [x] Dismissed Jobs tab (view, restore, or save from dismissed list)
- [x] Tracker sort order fix (oldest-first)
- [x] Salary display hardening (guard against crawler sentinel values)
- [x] Saved page unsave/dismiss immediately removes card
- [x] 404 fallback route

### Phase 3c — Design Polish 🔵
**Issue:** [#12](https://github.com/Dadpops/JobJames/issues/12)

- [ ] Responsive / mobile-friendly layout
- [ ] Light mode toggle
- [ ] Accessibility audit (ARIA, keyboard nav, focus rings)
- [ ] Skeleton loading states
- [ ] Empty state illustrations

### Phase 4 — More Job Sources 🔵

| Sub-phase | Board | Issue |
|---|---|---|
| 4a | Glassdoor | [#13](https://github.com/Dadpops/JobJames/issues/13) |
| 4b | Wellfound (AngelList) | [#14](https://github.com/Dadpops/JobJames/issues/14) |
| 4c | ZipRecruiter | [#15](https://github.com/Dadpops/JobJames/issues/15) |
| 4d | Remote.co + We Work Remotely | [#16](https://github.com/Dadpops/JobJames/issues/16) |

### Phase 5 — AI & Intelligence 🔵
**Issue:** [#17](https://github.com/Dadpops/JobJames/issues/17)

- [ ] Resume upload + keyword matching score per job
- [ ] LLM re-ranking (Claude API) against full job descriptions
- [ ] AI cover letter drafts per job card
- [ ] Plain-English "Why this job?" fit explanation
