# JobJames

A job search aggregator that queries Indeed, Greenhouse, Lever, and LinkedIn in one shot, deduplicates results, scores them against your criteria, and presents a clean ranked dashboard.

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.11+ / FastAPI |
| Frontend | React 18 / Vite |
| HTTP client | httpx (async) |
| Parsing | BeautifulSoup4 |

## Project structure

```
JobJames/
├── backend/
│   └── app/
│       ├── main.py          # FastAPI app + CORS
│       ├── config.py        # Settings (pydantic-settings)
│       ├── api/             # Route handlers
│       ├── crawlers/        # Per-source scrapers
│       ├── models/          # Pydantic schemas
│       └── services/        # Deduplication & scoring
└── frontend/
    └── src/
        ├── api/             # Fetch wrappers
        ├── components/      # SearchForm, JobCard, StatusBadge
        └── pages/           # HomePage (search + results dashboard)
```

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # fill in credentials if needed
uvicorn app.main:app --reload
# API available at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# UI available at http://localhost:5173
```

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/jobs/search` | Run crawlers and return ranked results |
| `GET` | `/api/jobs/{id}` | Fetch a single listing |
| `PATCH` | `/api/jobs/{id}/status` | Tag as `saved` or `dismissed` |
| `GET` | `/health` | Health check |

### Search request body

```json
{
  "title": "Software Engineer",
  "location": "New York, NY",
  "remote": false,
  "salary_min": 100000,
  "salary_max": 180000,
  "sources": ["indeed", "greenhouse", "lever", "linkedin"]
}
```

## Crawler status

| Source | Status | Notes |
|---|---|---|
| Greenhouse | Working | Public board API — add company tokens to `GREENHOUSE_COMPANIES` |
| Lever | Working | Public posting API — add company slugs to `LEVER_COMPANIES` |
| Indeed | Placeholder | Requires rotating proxies or official API access |
| LinkedIn | Placeholder | Requires authenticated session or Jobs API |

## Phase 1 roadmap

- [x] Project scaffold
- [x] Search form (title, location, remote, salary range)
- [x] Greenhouse + Lever crawlers (public APIs)
- [x] Deduplication by (title, company)
- [x] Scoring against search criteria
- [x] Dashboard UI with ranked results
- [x] Save / Dismiss status tagging
- [ ] Populate `GREENHOUSE_COMPANIES` and `LEVER_COMPANIES` lists
- [ ] Indeed crawler implementation
- [ ] LinkedIn crawler implementation
- [ ] Persistent storage (SQLite or Postgres)
