# JobJames

A personal job search aggregator that queries Indeed, Greenhouse, Lever, and LinkedIn simultaneously, deduplicates and scores results, and provides a full application-tracking pipeline — all in a single self-hosted app.

## Features

### Search
- Search across Indeed, Greenhouse, Lever, and LinkedIn in one request
- Job title autocomplete with 50+ curated role suggestions
- Filters: location, remote-only, salary range, date posted, experience level, job type, sources
- Deduplication by (title, company) and relevance scoring
- Save or Dismiss individual results; email any listing with one click

### Saved Jobs
- Dedicated tab showing all saved listings
- Bulk email all saved jobs to any address (Resend API)

### Application Tracker
- Pipeline table for every job you're pursuing
- Columns: Job Title, Company, Location, Status, Date Added, Follow-up Date, Notes
- Status stages: Found → Reviewing → Applied → Interviewing → Offer → Rejected (colored badge, editable inline)
- Click-to-edit Notes and Follow-up Date per row; overdue dates highlighted red
- Quick-add modal for manually entered jobs
- "Save to Tracker" button on every search result card

### Persistence
- SQLite backend — all jobs, statuses, and tracker entries survive restarts

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.11+ / FastAPI |
| Database | SQLite via aiosqlite |
| HTTP client | httpx (async) + curl_cffi |
| Email | Resend API |
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
│       │   ├── tracker.py       # Tracker CRUD endpoints
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
│           └── scoring.py
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
            └── TrackerPage       # Application pipeline table
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

## API reference

### Jobs

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/jobs/search` | Run all crawlers and return ranked results |
| `GET` | `/api/jobs/saved` | List all saved jobs |
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
| `DELETE` | `/api/tracker/{id}` | Remove an entry |

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
- [x] Project scaffold (FastAPI + React + Vite)
- [x] Search form with filters (title, location, remote, salary, sources, date, level, type)
- [x] Job title autocomplete (50+ curated roles)
- [x] Indeed crawler (curl_cffi + mosaic JSON)
- [x] LinkedIn crawler (guest API)
- [x] Greenhouse + Lever crawlers (public APIs)
- [x] Deduplication by (title, company)
- [x] Relevance scoring and ranking
- [x] Dashboard UI with ranked results
- [x] Save / Dismiss status tagging per listing
- [x] SQLite persistence
- [x] Saved Jobs tab
- [x] Email export via Resend (bulk + per-job)
- [x] Loading indicator during search

### Phase 2 — Application Tracker ✅
- [x] Tracker tab with full pipeline table
- [x] Status stages: Found → Reviewing → Applied → Interviewing → Offer → Rejected
- [x] Inline-editable status, notes, and follow-up date
- [x] Overdue follow-up date indicator
- [x] Quick-add modal for manual entries
- [x] "Save to Tracker" from search results

### Phase 3 — Ideas
- [ ] More job boards (Glassdoor, Wellfound, ZipRecruiter)
- [ ] Resume keyword matching for smarter scoring
- [ ] Scheduled searches with email digest
- [ ] Notes and interview prep per tracker entry
