# notes-app

A single-user notes application. Django REST API + Next.js client, served from a single origin so the
session cookie stays first-party.

Notes are created instantly, autosaved as you type, authored in Markdown, tinted by category, and
filtered from a fixed sidebar of three categories seeded per account.

> **Desktop only.** The UI targets a fixed 1280×832 viewport. There are no responsive breakpoints —
> this is deliberate (NFR-01), not an omission.

---

## Table of contents

- [Process summary](#process-summary)
- [Key design and technical decisions](#key-design-and-technical-decisions)
- [AI tools, and how they were used](#ai-tools-and-how-they-were-used)
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

## Process summary

This application was not produced in one pass from a prompt. It was built **spec-first**: a written
specification before any design, a design before any task list, a task list before any code. Each
stage produced a document that is committed to this repository, so the reasoning behind the code is
still readable.

The workflow is Spec-Driven Development (SDD), run through **gentle-ai**. Nine stages ran, each
handled by a separate agent with a fresh context and a narrow job, with a coordinating agent holding
the thread and validating each stage before starting the next.

| Stage | Produced |
|---|---|
| `init` | Project configuration and detected stack |
| `propose` | Scope, exclusions, slice plan |
| `spec` | Acceptance criteria per domain, as testable Given/When/Then scenarios |
| `design` | Technical decisions, each with rationale and rejected alternatives |
| `tasks` | 59 items for the MVP — 65 including the later Figma-conformance slice — each tagged with the requirements it satisfies |
| `apply` ×5 | Implementation, one reviewable slice at a time |
| `verify` | An independent audit against the specification |

**Scope was never invented.** The specification arrived with six unresolved questions — password
rules, the sign-up button label, pagination, date casing, timestamp formats, whether to show a zero
count. The agents did not quietly pick answers; they carried them as explicit blockers until a human
resolved all six. Those answers were recorded in
[`decisions.md`](openspec/changes/notes-app-mvp/decisions.md) and treated as binding.

The human decided scope, stack, product behavior and delivery shape. The agents decided everything
technical — data models, API shapes, component structure, library choices, test strategy.

**Delivery** was six chained pull requests, each stacked on the previous so a reviewer sees only that
slice: planning artifacts → scaffold + auth → categories → notes API → dashboard → editor. Four
further PRs followed for a CSRF fix, a behavior change, Figma conformance, and documentation. Every
commit uses conventional commit format and none carries AI attribution.

---

## Key design and technical decisions

Each of these was a real fork with a rejected alternative. Full rationale lives in
[`design.md`](openspec/changes/notes-app-mvp/design.md).

### Architecture

**Same-origin deployment.** One public hostname in front of both processes — nginx routes `/api` to
Django and everything else to Next.js; in development a Next rewrite does the same job. This keeps
the session cookie **first-party**, so no CORS, no cross-site cookie handling, and no third-party
cookie restrictions. *Rejected:* separate hostnames with CORS, which forces `SameSite=None` and makes
the cookie subject to browser privacy controls.

**Server-side sessions, not JWT.** An httpOnly cookie cannot be read by JavaScript, so an XSS bug
cannot exfiltrate the credential. Logout is real — the session is destroyed server-side. *Rejected:*
JWT in `localStorage`, which is readable by any script on the page and cannot be revoked before
expiry.

**Category counts are server-derived.** `noteCount` is annotated in one query rather than computed
client-side, so the sidebar cannot drift from the data.

### Decisions that prevented specific bugs

These three were caught at design time, before any code existed.

**Category seeding runs in a service, not a data migration.** Every new account needs three default
categories. A migration runs once over rows that already exist and would never see a future signup —
the bug would have appeared for the second user onward. It is a service called during account
creation instead.

**`last_edited` uses `default=timezone.now`, never `auto_now`.** The obvious Django idiom updates the
timestamp on *every* save, so merely recategorizing a note would silently jump it to the top of a
grid sorted by last edited. The bump rule lives in the serializer and fires only when title or
content actually changed.

**A single in-flight save lock.** All writes for a draft funnel through one promise chain, so the
creating `POST` always resolves — and the id is known — before any `PATCH` fires. Without it, fast
typing during the debounce window creates duplicate notes.

### Frontend

**Markdown renders through React elements, never `dangerouslySetInnerHTML`.** `react-markdown`
escapes embedded HTML structurally rather than sanitizing it after the fact, so a `<script>` tag in
note content cannot execute. `rehype-raw` is deliberately absent and documented as never-add — it
would reopen exactly that injection sink.

**The category dropdown is an ARIA listbox, not a native `<select>`.** A browser renders `<option>`
elements through the operating system, so the popup cannot receive any CSS. Matching the design meant
owning the popup as DOM — and owning the keyboard behavior a native select provides for free, which
is implemented and tested rather than assumed.

**Atomic design with a container/presentational split.** Components are atoms → molecules →
organisms; data fetching lives in `features/*` hooks, so presentational components stay
prop-driven and testable without a network.

**Design tokens as CSS custom properties.** Colors, radius, shadow and fonts are declared once in
`styles/tokens.css`. Body copy resolves through `--color-text`, so per-component color overrides were
*deleted* rather than reassigned when the palette changed.

### Backend

**A DEBUG-only loopback CSRF middleware.** Django compares CSRF origins as exact `scheme://host:port`
strings and supports no port wildcard, so `CSRF_TRUSTED_ORIGINS` cannot express "any localhost port"
— which editor port forwarding requires. The middleware relaxes only the origin comparison, only for
loopback hosts, only when `DEBUG` is on; the CSRF token is still fully verified. It is middleware
rather than a setting because DRF builds its own `CSRFCheck` per request and never consults the
configured middleware instance.

**`PATCH`, not `PUT`.** Autosave sends only what changed, so a partial update is the honest verb.

**`on_delete=PROTECT` on a note's category.** Categories have no delete affordance, and a protected
foreign key makes an orphaned note structurally impossible rather than merely unlikely.

### One requirement was deliberately reversed

FR-27 originally required that a note opened and closed while still empty must not persist. It was
later reversed by product decision: the note is created **on open** so its timestamp is real and
immediately visible, and an empty note is **kept**. The trade-off — every "New Note" click leaves a
note behind — was stated and accepted. Recorded in
[`AMENDMENTS.md`](openspec/changes/notes-app-mvp/AMENDMENTS.md); the original design section is
marked superseded in place rather than rewritten.

---

## AI tools, and how they were used

| Tool | Role |
|---|---|
| **gentle-ai** | The SDD framework itself — phase agents, artifact store, skills, persona |
| **Claude Code** (Opus) | Coordinating agent plus every phase sub-agent that wrote code |
| **Figma MCP server** | Read the design file directly for design-to-code conformance |
| **Playwright** | Drove a real browser so visual claims were observed, not asserted |
| **Context7 / Engram MCP** | Library documentation lookup and persistent project memory |

### How they were actually used

**Direction, not autopilot.** The human set scope, stack, product behavior and delivery shape. The
model proposed technical approaches with rejected alternatives, and implemented only after the
specification and design were written and reviewed.

**One agent per stage, with fresh context.** Each SDD phase ran as a separate sub-agent with a narrow
job. The coordinator validated each stage's output before starting the next — commits confirmed to
exist, test suites re-run independently, specific constraints grepped out of the source. An agent
reporting on its own work is not evidence.

**An independent audit.** A separate agent, explicitly told not to trust the implementers'
self-reports, read the source and re-ran every command. Verdict on the 35 requirements: **34 pass, 1
partial, 0 fail**. The single partial is a wording matter the implementing agent disclosed itself —
the spec says the timestamp updates "in real-time" and it updates via a half-second debounce.

**Design-to-code read from the source of truth.** Rather than eyeballing screenshots, the Figma MCP
server was queried for the actual component nodes; spacing, colors, weights and asset geometry were
taken from the file and cited by node id.

### Where AI got it wrong, and how that was caught

This matters more than the successes.

**A test that passed for the wrong reason.** Tests written for the CSRF middleware used
`force_authenticate`, which bypasses `SessionAuthentication` — and therefore the CSRF check under
test. They returned green whether or not the fix existed. The accompanying negative test exposed it;
they were rewritten to perform a real session login, and the fix was then removed to confirm the
suite actually reproduces the bug.

**A confident but incomplete diagnosis.** A "saving is broken" report was first traced to a missing
config value. That was real, but it was not the cause — the failure persisted. The actual cause was
found by measuring the **byte length of the 403 response body** and matching it against each CSRF
failure mode, which identified an untrusted origin 22 characters long.

**A regression introduced by an obvious-looking fix.** Removing a leading slash from a URL pattern to
silence a cosmetic warning re-routed the note detail endpoint to `/api/notes42`. Django's own
resolver was used to confirm it before reverting.

The pattern: every claim that mattered was verified against the running system, and when the
verification contradicted the claim, the claim was corrected rather than defended.

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
| `DELETE` | `/api/notes/{id}` | Empty-note guard — **no longer called by the UI** (see below) |

Notes are **not paginated** — the full list is returned.

### Two behaviors worth knowing

**Notes are created on open, and empty notes are kept.** Clicking "New Note" fires a `POST`
immediately, so the note has a real id and a server-derived Last Edited timestamp from the moment the
editor opens. Later keystrokes `PATCH`. A single in-flight lock ensures the `POST` resolves before
any `PATCH`, so fast typing can't create duplicates, and a guard ref means a StrictMode double-mount
cannot create a second note.

The practical consequence: **every "New Note" click leaves a note behind**, even one closed straight
away. That is intended (FR-27, v6) and reverses the earlier discard-empty behavior.

**`DELETE` is an empty-guard, and the UI no longer calls it.** It still returns `204` only when the
note's title and content are both blank, otherwise `409`, and it remains covered by tests — but since
empty notes now persist, nothing in the client invokes it. Deleting real notes is still intentionally
not implemented.

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
