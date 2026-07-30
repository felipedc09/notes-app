# notes-app

A single-user notes application. Django REST API + Next.js client, served from a single origin so the
session cookie stays first-party.

Notes are created instantly, autosaved as you type, authored in Markdown, tinted by category, and
filtered from a fixed sidebar of three categories seeded per account.

> **Desktop only.** The UI targets a fixed 1280×832 viewport. There are no responsive breakpoints —
> this is deliberate (NFR-01), not an omission.

---

## Table of contents

- [Stack](#stack)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running locally](#running-locally)
- [Environment variables](#environment-variables)
- [Tests](#tests)
- [API reference](#api-reference)
- [Publishing to production](#publishing-to-production)
- [Project documentation](#project-documentation)
- [Troubleshooting](#troubleshooting)

---

## Stack

| Layer | Choice | Version |
|---|---|---|
| Backend | Django + Django REST Framework | 6.0.7 / 3.17.1 |
| Frontend | Next.js (App Router) + React | 16.2.12 / 19.2.4 |
| Styling | Tailwind CSS | v4 |
| Data fetching | TanStack Query | v5 |
| Markdown | react-markdown + remark-gfm | 10.x / 4.x |
| Database | SQLite (dev/test) → PostgreSQL (prod), via one `DATABASE_URL` | — |
| Auth | Django server-side sessions, httpOnly cookie | — |
| Tests | pytest + pytest-django, Vitest + Testing Library + msw, Playwright | — |

---

## Repository layout

```
.
├── backend/                  Django project
│   ├── config/               settings, urls, wsgi
│   ├── apps/
│   │   ├── accounts/         signup, login, logout, me
│   │   ├── categories/       Category model, seeding service, counts API
│   │   └── notes/            Note model, CRUD API
│   ├── manage.py
│   ├── pytest.ini
│   └── requirements.txt
├── frontend/                 Next.js App Router client
│   ├── src/
│   │   ├── app/              routes: /, /login, /signup
│   │   ├── components/       atoms / molecules / organisms
│   │   ├── features/         auth, categories, notes hooks
│   │   ├── lib/              api-client, date-format, markdown
│   │   └── styles/           design tokens
│   ├── e2e/                  Playwright specs
│   └── package.json
├── infra/
│   └── nginx.conf            production single-origin reverse proxy
├── openspec/                 spec-driven development artifacts
└── REQUIREMENTS.md           the client specification (v5)
```

---

## Prerequisites

- **Python** 3.12 or newer
- **Node.js** 22 or newer (npm 10+)
- No global Django install needed — it lives in a project virtualenv.

---

## Setup

Clone, then set up each side once.

### 1. Backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
.venv/bin/python manage.py migrate
```

Then open `backend/.env` and set the two values local development needs:

```ini
COOKIE_SECURE=False
CSRF_TRUSTED_ORIGINS=http://localhost:3000
```

Both matter — see [Troubleshooting](#troubleshooting) for why. `.env` is gitignored; production uses
real environment variables instead.

Optionally create an admin user for `/admin/`:

```bash
.venv/bin/python manage.py createsuperuser
```

### 2. Frontend

```bash
cd frontend
npm install
```

For the end-to-end suite, also install the browser:

```bash
npx playwright install chromium
```

---

## Running locally

Both servers must run at once. Use two terminals.

**Terminal 1 — Django on :8000**

```bash
cd backend
.venv/bin/python manage.py runserver
```

**Terminal 2 — Next.js on :3000**

```bash
cd frontend
npm run dev
```

Open **http://localhost:3000** and sign up. You'll land on the dashboard with three categories —
Random Thoughts, School, Personal — seeded for your account.

### How same-origin works

The browser only ever talks to `localhost:3000`. `next.config.ts` rewrites `/api/*` to
`127.0.0.1:8000`, so the session cookie is first-party and no CORS is involved. That rewrite is
guarded by `NODE_ENV === "development"` and never runs in production, where nginx does the equivalent
routing instead.

**Always use `http://localhost:3000`.** Hitting the Django port directly bypasses the proxy and the
client's API calls will fail.

### Available frontend scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with the API proxy |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit + component tests |
| `npm run test:e2e` | Playwright end-to-end tests |

---

## Environment variables

All are read by `backend/config/settings.py`. Defaults are development-friendly; production must set
them explicitly.

| Variable | Default | Notes |
|---|---|---|
| `DJANGO_SECRET_KEY` | insecure dev placeholder | **Must** be set to a real secret in production |
| `DJANGO_DEBUG` | `True` | Set `False` in production |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1,testserver` | Comma-separated; add your domain |
| `DATABASE_URL` | local SQLite file | e.g. `postgres://user:pass@host:5432/notes` |
| `COOKIE_SECURE` | `True` | Set `False` for local plain-HTTP dev; leave `True` in production |
| `CSRF_TRUSTED_ORIGINS` | empty | `http://localhost:3000` in dev, `https://your-domain` in prod |

Under `pytest`, `COOKIE_SECURE` is forced to `True` regardless of `.env`, so the test suite always
asserts production-safe cookie flags.

---

## Tests

Run everything:

```bash
# Backend
cd backend
.venv/bin/python -m pytest -q
.venv/bin/python manage.py check
.venv/bin/python manage.py makemigrations --check --dry-run

# Frontend
cd frontend
npm run test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Current state: **40 backend**, **27 frontend unit/component**, **4 Playwright end-to-end**.

The e2e suite starts both dev servers itself and drives a real Chromium at 1280×832.

`manage.py check` reports one non-fatal `urls.W002` warning. It comes from mounting the notes detail
route so the collection endpoint stays exactly `/api/notes` with no trailing slash. Exit code is 0.

---

## API reference

All endpoints are session-authenticated and scoped to the requesting user. Unsafe methods require an
`X-CSRFToken` header, which the client reads from the `csrftoken` cookie on every request.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/signup` | Create an account, log in, seed the three categories |
| `POST` | `/api/auth/login` | Log in |
| `POST` | `/api/auth/logout` | Log out (204) |
| `GET` | `/api/auth/me` | Current user; also guarantees a `csrftoken` cookie |
| `GET` | `/api/categories` | Categories with server-side `noteCount`, in one query |
| `GET` | `/api/notes` | All notes, newest-edited first, optional `?category=<id>` |
| `POST` | `/api/notes` | Create a note |
| `GET` | `/api/notes/{id}` | Retrieve a note |
| `PATCH` | `/api/notes/{id}` | Partial update — `PUT` is not supported |
| `DELETE` | `/api/notes/{id}` | Discard an **empty** note only (see below) |

Notes are **not paginated** — the full list is returned.

### Two behaviors worth knowing

**Notes are created on first content, not on open.** Clicking "New Note" opens an in-memory draft
with no network request. The first keystroke triggers a debounced `POST`; later keystrokes `PATCH`. A
single in-flight lock ensures the `POST` resolves before any `PATCH`, so fast typing can't create
duplicates.

**`DELETE` is an empty-guard, not general deletion.** It returns `204` only when the note's title and
content are both blank; otherwise `409`. Its sole purpose is discarding a note that was opened and
closed without content. Deleting real notes is intentionally not implemented.

---

## Publishing to production

The production shape is one public hostname in front of two local processes, so the session cookie
stays first-party. `infra/nginx.conf` is the reference config: `/api/`, `/admin/` and
`/django-static/` go to Django on `:8000`, everything else to the Next.js server on `:3000`.

### 1. Add a WSGI server

`infra/nginx.conf` proxies to gunicorn, but gunicorn is **not** in `requirements.txt` yet — it's the
one thing you must add before deploying:

```bash
echo "gunicorn==23.0.0" >> backend/requirements.txt
```

### 2. Configure the backend

```bash
export DJANGO_SECRET_KEY="$(openssl rand -base64 48)"
export DJANGO_DEBUG=False
export ALLOWED_HOSTS="your-domain.com"
export DATABASE_URL="postgres://user:pass@host:5432/notes"
export COOKIE_SECURE=True
export CSRF_TRUSTED_ORIGINS="https://your-domain.com"
```

Add a PostgreSQL driver (`psycopg[binary]`) to `requirements.txt` if you use Postgres.

### 3. Migrate and collect static files

```bash
cd backend
.venv/bin/python manage.py migrate
.venv/bin/python manage.py collectstatic --noinput
```

Static files land in `backend/staticfiles/`, served under `/django-static/`.

If you're deploying over existing accounts, backfill their categories:

```bash
.venv/bin/python manage.py seed_categories
```

It's idempotent — safe to run repeatedly.

### 4. Start both processes

```bash
# Django
cd backend
.venv/bin/gunicorn config.wsgi:application --bind 127.0.0.1:8000

# Next.js
cd frontend
npm ci && npm run build
npm run start          # binds :3000
```

Run both under a process manager (systemd, supervisor, Docker) so they survive restarts.

### 5. Put nginx in front

Copy `infra/nginx.conf`, replace `notes-app.example.com` with your hostname, point
`ssl_certificate` / `ssl_certificate_key` at your certificate, then reload:

```bash
nginx -t && systemctl reload nginx
```

### Production checklist

- [ ] `DJANGO_DEBUG=False` and a real `DJANGO_SECRET_KEY`
- [ ] `ALLOWED_HOSTS` contains your domain
- [ ] `COOKIE_SECURE=True` — the session cookie requires HTTPS
- [ ] `CSRF_TRUSTED_ORIGINS` is your `https://` origin
- [ ] TLS terminated at nginx; port 80 redirects to 443
- [ ] `DATABASE_URL` points at PostgreSQL, with backups
- [ ] `collectstatic` has run
- [ ] Both processes supervised
- [ ] Frontend and backend served from the **same** hostname — split origins break the cookie

---

## Project documentation

This project was built spec-first. The reasoning behind it is committed, not lost:

| Document | Contents |
|---|---|
| [`REQUIREMENTS.md`](REQUIREMENTS.md) | The client specification: 27 functional and 8 non-functional requirements, data model, out-of-scope list |
| [`openspec/changes/notes-app-mvp/proposal.md`](openspec/changes/notes-app-mvp/proposal.md) | Scope and slice plan |
| [`openspec/changes/notes-app-mvp/decisions.md`](openspec/changes/notes-app-mvp/decisions.md) | The six open questions and how each was resolved |
| [`openspec/changes/notes-app-mvp/design.md`](openspec/changes/notes-app-mvp/design.md) | Technical design and rationale |
| [`openspec/changes/notes-app-mvp/tasks.md`](openspec/changes/notes-app-mvp/tasks.md) | 59 tasks with a requirement coverage table |
| [`openspec/changes/notes-app-mvp/verify-report.md`](openspec/changes/notes-app-mvp/verify-report.md) | Requirement-by-requirement verification verdict |
| [`AGENT_WORK_SUMMARY.md`](AGENT_WORK_SUMMARY.md) | How this project was built, start to finish |

---

## Troubleshooting

**Every write returns 403 with a CSRF error.**
`CSRF_TRUSTED_ORIGINS` is missing `http://localhost:3000`. The dev proxy forwards to Django with
`Host: 127.0.0.1:8000`, so Django's same-origin check never sees the browser's real origin. Signup and
login still work, because anonymous session requests are CSRF-exempt — which is why this only shows up
once you're logged in.

**Login works but you're immediately bounced back to `/login`.**
`COOKIE_SECURE` is `True` over plain HTTP, so the browser refuses to store the session cookie. Set
`COOKIE_SECURE=False` in `backend/.env` for local development.

**Frontend loads but every API call fails.**
You're probably on `127.0.0.1:3000` or hitting `:8000` directly. Use `http://localhost:3000`.

**`npm run test:e2e` fails to launch a browser.**
Run `npx playwright install chromium`. Skip `--with-deps` unless you can grant sudo.

**A new note doesn't appear in the sidebar counts.**
Counts are computed server-side. Reload; if it persists, the mutation didn't invalidate the
`categories` query.

**Backend tests fail on a cookie assertion.**
Confirm you're running through `pytest`, which forces `COOKIE_SECURE=True`. Running the assertions
outside pytest picks up your dev `.env` instead.
