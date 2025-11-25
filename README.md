# Earned+Owned AI Mapper

Dual-mode content analysis tool that evaluates press releases and owned content across traditional SEO and Generative Engine Optimization (GEO) frameworks.

## Structure

- `frontend/` — Static, mobile-first web app (vanilla HTML/CSS/JS with ES modules).
- `backend/` — Minimal Node.js proxy that fetches remote URLs to bypass browser CORS limits and feed the analyzer.
- `docs/` — Product requirements document (PRD v3.0).

## Getting Started

1. **Frontend**
   ```bash
   cd frontend
   python3 -m http.server 4173
   # or use any static file server and open http://localhost:4173/index.html
   ```
   The UI supports URL, HTML, and plain-text inputs, dual scoring (SEO/GEO), benchmark comparisons, content type weighting, recommendations, and HTML report export.

2. **Backend**
   ```bash
   cd backend
   npm install   # install backend dependencies
   npm start
   ```
   The backend exposes `POST /api/analyze` (expects `{ "url": "https://example.com" }`) and `GET /health`. It returns the fetched HTML so the frontend can perform a full analysis on URLs without CORS restrictions, plus a `result.performance` payload containing lightweight speed metrics (response time, HTML size, number of redirects/requests, largest image size, and a 0–100 performance score).

> **Note:** Node.js 18+ is required for the backend runtime. If Node isn’t available (`node` command missing), install it before running the proxy.

> **Performance Snapshot:** URL analyses automatically run a lightweight performance check (axios fetch timing + image HEAD probes). Tune timeouts by setting `PERFORMANCE_TIMEOUT_MS` and `PERFORMANCE_HEAD_TIMEOUT_MS` if needed.

## Key Features

- Three input methods with tailored accuracy indicators (URL, HTML, Text) and automatic HTML parsing.
- Real analysis engine:
  - Flesch-Kincaid readability, information density, entity detection.
  - Schema detection (JSON-LD + microdata).
  - Conversational/Q&A/voice-search heuristics.
- Dual scoring (SEO pillars + GEO pillars) with content type-specific weighting and industry benchmarks.
- Performance snapshot: Response time, HTML weight, number of requests, largest image size, and an overall performance score (0–100) with graded badges.
- Dynamic recommendation engine (SEO, GEO, combined) plus content-type playbooks.
- Exportable HTML report capturing dual scores, pillars, recommendations, and snapshot data.

## Testing

- Frontend: load `frontend/index.html` in any modern browser. Use Test input (paste text) to validate algorithms without the backend.
- Backend: `curl -X POST http://localhost:3001/api/analyze -d '{"url":"https://example.com"}' -H "Content-Type: application/json"`.

If any command fails because Node is missing or network access is restricted, install Node.js 18+ and rerun from the repo root. Let me know if you need enhancements or deployment automation.***
