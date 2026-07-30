# Design: notes-app MVP

Binding inputs: `REQUIREMENTS.md` v5, `proposal.md`, `decisions.md` (Q1–Q3, A1–A3 — closed, not reopened),
`specs/{auth,categories,notes,dashboard}/spec.md`. Greenfield repo: every path below is new.
Where a spec's "API Implications" section conflicts with a decision here, the deviation is called out explicitly.

## Technical Approach

Two deployables, one origin (NFR-02): a Django + DRF JSON API under `/api/*` and a Next.js App Router client.
The API is a pure data API — no server-rendered HTML, no server-formatted display strings. Auth is Django
server-side sessions with an httpOnly cookie plus the double-submit CSRF token (NFR-04). Category note counts
are ORM aggregates (NFR-05). All display formatting (relative dates, Markdown, category tinting) is client-side.
Desktop-only fixed 1280-wide shell (NFR-01); no breakpoints.

---

## 1. Repo layout and same-origin

```
notes-app/
├── REQUIREMENTS.md · openspec/
├── infra/nginx.conf                    # prod single-origin reverse proxy
├── backend/
│   ├── manage.py · requirements.txt · pytest.ini · .env.example
│   ├── config/{settings.py,urls.py,wsgi.py}
│   └── apps/
│       ├── accounts/{serializers,views,urls}.py · tests/
│       ├── categories/{models,constants,serializers,views,urls,services}.py · migrations/ · tests/
│       └── notes/{models,serializers,views,urls}.py · migrations/ · tests/
└── frontend/
    ├── package.json · next.config.ts · tsconfig.json · vitest.config.ts · playwright.config.ts
    └── src/
        ├── app/{layout.tsx,globals.css,page.tsx,login/page.tsx,signup/page.tsx}
        ├── components/{atoms,molecules,organisms}/
        ├── features/{auth,notes,categories}/
        ├── lib/{api-client.ts,date-format.ts,markdown.tsx}
        └── styles/tokens.css
```

**Dev**: browser talks only to `http://localhost:3000`. `next.config.ts` rewrites `/api/:path*` →
`http://127.0.0.1:8000/api/:path*`. Next's rewrite proxy forwards `Set-Cookie` and request cookies, so
`sessionid`/`csrftoken` are first-party on `localhost:3000`.
**Prod**: `infra/nginx.conf` on one hostname routes `/api/`, `/admin/`, `/django-static/` → gunicorn, everything
else → the Next Node server. `next.config.ts` rewrites are dev-only (guarded by `NODE_ENV`).

| Option | Tradeoff | Decision |
|---|---|---|
| Reverse proxy, one origin | Needs one infra file; keeps App Router SSR and Route Handlers | **Chosen** |
| Django serves a Next static export | No proxy, but forfeits SSR/App-Router server features and complicates asset hashing | Rejected |
| Separate origins + CORS | Third-party cookie + `SameSite=None` — explicitly excluded by NFR-02 | Rejected |

DB engine is unspecified by NFR-03: **SQLite in dev/test, PostgreSQL in prod** via one `DATABASE_URL`
(`dj-database-url`). ORM code is engine-agnostic; hermetic, fast tests during apply. Session store: DB
(`django.contrib.sessions.backends.db`) — Redis is unjustified at single-user scale.

## 2. Django models

`User` = `django.contrib.auth.models.User`, unmodified. Signup does
`User.objects.create_user(username=email, email=email, password=…)` — `username` is unique and Django's
username validator accepts email characters, so email uniqueness is enforced by the DB without a custom user
model. Rejected: `AbstractUser` with `USERNAME_FIELD="email"` (correct long-term, but the binding input fixes
`django.contrib.auth`; see risk R3).

```python
# apps/categories/models.py
class Category(models.Model):
    user  = models.ForeignKey(User, on_delete=models.CASCADE, related_name="categories")
    name  = models.CharField(max_length=64)
    color = models.CharField(max_length=7)          # "#ef9c66" (NFR-06)
    order = models.PositiveSmallIntegerField()      # fixed sidebar order (FR-18)
    class Meta:
        constraints = [UniqueConstraint(fields=["user", "name"], name="uniq_user_category")]
        ordering = ["order"]

# apps/notes/models.py
class Note(models.Model):
    user        = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notes")
    category    = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="notes")
    title       = models.CharField(max_length=255, blank=True)      # FR-27 allows empty
    content     = models.TextField(blank=True)                      # Markdown source (FR-11)
    created_at  = models.DateTimeField(auto_now_add=True)
    last_edited = models.DateTimeField(default=timezone.now)        # NOT auto_now — see below
    class Meta:
        ordering = ["-last_edited", "-id"]                          # FR-23 + stable tiebreak
        indexes  = [Index(fields=["user", "-last_edited"]),
                    Index(fields=["user", "category", "-last_edited"])]
```

**`last_edited` is not `auto_now`**: FR-13/FR-25 bump the timestamp when *title or content* changes.
`auto_now=True` would also bump it on a category-only change (FR-15), silently reordering the grid. The note
serializer's `update()` sets `last_edited = timezone.now()` only when an incoming `title`/`content` differs from
the stored value. No `deleted_at`, no soft-delete manager — WL-01 is out of scope.

### FR-07 seeding: explicit service call, not a signal, not a data migration

`apps/categories/constants.py` holds `DEFAULT_CATEGORIES` (name, color, order ×3).
`apps/categories/services.py::seed_default_categories(user)` uses `get_or_create` (idempotent) and is called by
the signup view inside `transaction.atomic()`.

| Option | Tradeoff | Decision |
|---|---|---|
| Explicit service call in the signup transaction | Atomic with account creation; directly unit-testable; no import-time side effects; no surprise firing in fixtures/`createsuperuser` | **Chosen** |
| `post_save` signal on `User` | Action at a distance; fires for every user creation path; harder to assert transactional atomicity | Rejected |
| Data migration | **Cannot work**: a migration runs once against existing rows and never sees future signups (FR-07 is per-new-user) | Rejected |

An idempotent `manage.py seed_categories` management command wraps the same service for backfill (e.g. a
superuser created before the flow existed).

## 3. API contract

**DRF, not plain Django views.** Nine endpoints need per-field validation, uniform 400 shapes, per-user
queryset scoping and CSRF-enforcing session auth. DRF's `SessionAuthentication` enforces CSRF on unsafe methods
for free; `generics.*` + `get_queryset()` filtered on `request.user` makes IDOR protection structural rather
than remembered. One dependency versus hand-rolling parsing, validation and error envelopes eight times.

Global: `DEFAULT_AUTHENTICATION_CLASSES=[SessionAuthentication]`, `DEFAULT_PERMISSION_CLASSES=[IsAuthenticated]`,
no pagination class (Q3). All timestamps ISO-8601 with offset, `USE_TZ=True` (UTC storage).

| Method + path | Request | Success | Errors |
|---|---|---|---|
| `POST /api/auth/signup` | `{"email","password"}` | `201 {"id","email"}` + `sessionid`; seeds 3 categories; logs in | `400 {"email":[…],"password":[…]}` (Django `AUTH_PASSWORD_VALIDATORS`, Q1) |
| `POST /api/auth/login` | `{"email","password"}` | `200 {"id","email"}` + rotated `sessionid` | `400 {"detail":"Invalid email or password."}` (never disclose which) |
| `POST /api/auth/logout` | — | `204` | `403` if anonymous |
| `GET /api/auth/me` | — | `200 {"id","email"}`, `@ensure_csrf_cookie` | `403 {"detail":…}` (DRF default for session auth; client treats 401 ∪ 403 as anonymous) |
| `GET /api/categories` | — | `200 [{"id","name","color","noteCount"}]`, ordered by `order` | `403` |
| `GET /api/notes` | `?category={id}` optional | `200 [Note…]`, `-lastEdited`, unpaginated | `403` |
| `POST /api/notes` | `{"title","content","categoryId"}` | `201 Note` | `400` invalid/foreign `categoryId` |
| `GET /api/notes/{id}` | — | `200 Note` | `404` if not owned |
| `PATCH /api/notes/{id}` | any of `title`,`content`,`categoryId` | `200 Note` | `400`, `404` |
| `DELETE /api/notes/{id}` | — | `204` **only if** `title` and `content` are both blank after strip | `409 {"detail":"Only an empty note can be discarded."}`, `404` |

`Note` = `{"id","title","content","categoryId","categoryName","categoryColor","createdAt","lastEdited"}`.
`categoryName`/`categoryColor` are denormalised into the response via `select_related("category")` so FR-16/FR-20
need no client-side join.

**Counts (NFR-05)**: `Category.objects.filter(user=…).annotate(note_count=Count("notes"))` — a single grouped
query for all three categories. This **supersedes** the categories spec's `GET /api/categories/{id}/count`,
which would be three round trips and an N+1. A3 (hide count at 0) is presentation: the API always returns an
integer, the sidebar hides it when `0`.
`PATCH` **supersedes** the notes spec's `PUT`: autosave sends only the changed field, and PUT semantics would
clobber the untouched one.

### FR-27: create fires on first content, not on open

> **SUPERSEDED (30 July 2026).** This section records the original design and the
> reasoning behind it; it no longer describes the running behavior. FR-27 was
> reversed by maintainer decision: the note is now created **on open**, and an
> empty note is **kept** on close. The "Rejected" option at the end of this
> section is, in effect, what was subsequently adopted — minus the unconditional
> `DELETE`, which was never added. See `../AMENDMENTS.md`.

The notes spec is explicit — *"no empty note record shall be created in the database"* — and WL-01 keeps
unconditional deletion out of scope. Therefore:

```
"New Note" click  →  client-side draft (no id, no request)   ← FR-09 "instantly" = editor opens instantly
first keystroke   →  debounce 500ms → POST /api/notes        ← FR-10 persisted, no manual save
later keystrokes  →  debounce 500ms → PATCH /api/notes/{id}
close (FR-17)     →  draft never persisted & both blank → discard in memory, zero requests
                  →  persisted & both blank              → DELETE (empty-guarded) → 204
                  →  otherwise                            → flush pending edit, close
```

A single in-flight-save lock in `useNoteDraft` guarantees the first POST resolves before any PATCH, so rapid
typing cannot create duplicate notes. The empty-guarded `DELETE` covers the "typed, then erased, then closed"
path without delivering WL-01: no unconditional delete, no UI delete affordance, no confirmation flow.
Rejected: create-on-open + unconditional `DELETE`, which violates the spec's "no empty record" clause and hands
the client the deletion capability it deferred.

## 4. Session auth and CSRF

```python
SESSION_COOKIE_HTTPONLY = True                  # default, asserted in tests
SESSION_COOKIE_SECURE   = env.bool("COOKIE_SECURE", True)   # False only for http dev
SESSION_COOKIE_SAMESITE = "Lax"                 # NFR-04
CSRF_COOKIE_HTTPONLY    = False                 # the client must read it
CSRF_COOKIE_SAMESITE, CSRF_COOKIE_SECURE = "Lax", env.bool("COOKIE_SECURE", True)
CSRF_TRUSTED_ORIGINS    = env.list("CSRF_TRUSTED_ORIGINS")  # prod https origin
AUTH_PASSWORD_VALIDATORS = [<Django defaults>]  # Q1: no email verification, no password reset
```

Flow: on boot the client calls `GET /api/auth/me`, whose `@ensure_csrf_cookie` guarantees a `csrftoken` cookie
even for a brand-new visitor. `lib/api-client.ts` sends `credentials: "same-origin"` and, for
POST/PATCH/DELETE, an `X-CSRFToken` header **read from `document.cookie` immediately before each request** —
Django rotates the CSRF token on login (`rotate_token`), so a cached token breaks the first post-login write.

Route protection: **no Next.js middleware.** A Django `sessionid` is opaque, so middleware could only check
cookie presence — false confidence. The authority is DRF `IsAuthenticated` server-side; client-side,
`features/auth/AuthGate.tsx` resolves `me` and redirects to `/login` on 401/403. Q2: on `200` from signup or
login the client does `router.replace("/")` → dashboard, filter `null` = "All Categories".

## 5. Frontend structure and tokens

`src/app/layout.tsx` loads `next/font/google` Inria_Serif (700) and Inter (400/700) as CSS variables (NFR-07)
and wraps children in the query client + `AuthGate`. Routes: `/` (dashboard, protected), `/login`, `/signup`.
The editor is an **overlay on `/`**, not a route — FR-17's close control simply unmounts it, and there is no
deep-link/SSR/hydration surface for note content.

Container/presentational split with atomic layering:
`atoms/` (Button, TextField, PasswordField·FR-03, ColorDot, IconButton) → `molecules/` (CategoryFilterItem,
NoteCardMeta, CategorySelect·FR-15) → `organisms/` (AuthCard, Sidebar·FR-18/19, NoteGrid, NoteCard·FR-20/21,
NoteEditor·FR-12/14/16/17, EmptyState·FR-08). Data lives in `features/*` hooks
(`useAuth`, `useCategories`, `useNotes`, `useNoteDraft`); organisms take props only.

**State**: `@tanstack/react-query`. Counts are server-derived (NFR-05), so every note create / edit / category
change must invalidate both `["notes"]` and `["categories"]` — one `invalidateQueries` pair versus hand-rolled
refetch plumbing. Rejected: bare `useState` + manual refetch (count drift is the likeliest silent bug).

**Tokens** (NFR-06) declared once in `globals.css` via Tailwind v4 `@theme` and mirrored in
`styles/tokens.css`: `--color-bg:#faf1e3`, `--color-accent:#957139`, `--color-heading:#88642a`,
`--color-cat-random:#ef9c66`, `--color-cat-school:#fcdc94`, `--color-cat-personal:#78aba8`,
`--radius-card:11px`, `--shadow-card:1px 1px 2px rgb(0 0 0 / .25)`. Category color is per-note and therefore
cannot be a static utility class; FR-16 uses one CSS class driven by a custom property, applied identically to
card and editor:

```css
.note-surface {                                   /* FR-16 */
  background: color-mix(in srgb, var(--cat) 50%, transparent);
  border: 3px solid var(--cat);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}
```
```tsx
<article className="note-surface" style={{ "--cat": note.categoryColor } as CSSProperties}>
```

NFR-01: the shell is `min-w-[1280px]` with a fixed-width sidebar and a fluid grid; no responsive breakpoints,
no mobile styles.

## 6. Markdown (FR-26)

**`react-markdown` + `remark-gfm`.** It renders to React elements and never touches
`dangerouslySetInnerHTML`, so raw HTML embedded in note content is escaped rather than executed **as long as
`rehype-raw` is not added** — sanitization is structural, not a bolted-on pass. `remark-gfm` supplies the task
lists/tables beyond the bullet lists the design shows. Rejected: `marked` + `DOMPurify` (correct but adds an
HTML-injection sink plus a sanitizer that must never be misconfigured); `markdown-it` (same sink).

Hard rules: never add `rehype-raw`; rely on react-markdown's default `urlTransform` to strip
`javascript:`/`data:` hrefs; links render with `rel="noopener noreferrer"`. The card uses
`disallowedElements` for headings/images/code-blocks with `unwrapDisallowed` so previews stay compact (FR-20),
and clamps the rendered preview with `-webkit-line-clamp` + `overflow:hidden` for the FR-21 ellipsis while the
title wraps unclamped. The editor is a plain `<textarea>` holding raw Markdown — no toolbar, no live preview
(FR-26, assumption 9).

## 7. Date formatting — client-side

`src/lib/date-format.ts` derives both strings from the ISO `lastEdited` in the payload:
`formatCardDate()` → `today` | `yesterday` | `July 21` (A1: lowercase, FR-22: no year) by comparing local
calendar days; `formatEditorTimestamp()` → `Last Edited: July 21, 2024 at 8:39pm` (FR-14, right-aligned),
assembled from `Intl.DateTimeFormat` parts because `Intl` yields `8:39 PM` — the day period must be lowercased
and its preceding space removed.

**Client, not server.** "today"/"yesterday" depend on the *viewer's* timezone and local midnight; a
server-formatted string is wrong for any user outside the server's zone and goes stale in a tab left open past
midnight. This **supersedes** the dashboard spec's "backend can provide formatted strings" — the API stays a
data API. Consequence: all date-bearing components are client components (the dashboard already is, behind
`AuthGate`), which also removes the SSR/client timezone hydration mismatch.

## 8. Testing strategy

| Layer | What to test | Approach |
|---|---|---|
| Unit (backend) | `seed_default_categories` creates exactly 3 with NFR-06 colors + is idempotent (FR-07); `last_edited` bumps on title/content but **not** on category-only change (FR-13/15/25); discard guard rejects a non-blank note (FR-27) | `pytest` + `pytest-django`, direct model/service calls |
| Integration (API) | signup→session cookie flags httpOnly/Secure/SameSite=Lax (NFR-04); unsafe method without `X-CSRFToken` → 403; login failure message never discloses which field; `GET /api/categories` counts in **one** query (NFR-05); notes ordering `-lastEdited` (FR-23); `?category=` filter (FR-19); another user's note id → 404 (IDOR) | DRF `APIClient(enforce_csrf_checks=True)` + `django_assert_num_queries` |
| Unit (frontend) | `formatCardDate` day boundaries, lowercase, no year (FR-22/A1); exact `formatEditorTimestamp` string (FR-14); markdown renderer escapes `<script>` and drops `javascript:` href | Vitest |
| Component | NoteCard 3px border + 50% fill from `--cat` (FR-16); title wraps, preview clamps (FR-21); sidebar hides count at 0, shows at ≥1 (A3); password toggle (FR-03); empty-state copy (FR-08); draft state machine: single POST under rapid typing, DELETE only when both fields blank (FR-27) | Vitest + React Testing Library, `msw` for the API |
| E2E | signup → lands on dashboard "All Categories" (Q2); New Note → type → reload → persists (FR-09/10); open note → clear both fields → close → gone (FR-27); category filter (FR-19) | Playwright at 1280×832 against dev servers |

Commands (exact):

```bash
# backend (venv at backend/.venv, requirements.txt — no extra tooling assumed)
cd backend && .venv/bin/python -m pytest -q
cd backend && .venv/bin/python manage.py check
cd backend && .venv/bin/python manage.py makemigrations --check --dry-run

# frontend (npm)
cd frontend && npm run test         # vitest run
cd frontend && npm run typecheck    # tsc --noEmit
cd frontend && npm run lint         # eslint
cd frontend && npm run build
cd frontend && npm run test:e2e     # playwright test
```

## Data flow

```
Browser (one origin)
  │  GET /api/auth/me  ──────────────► AuthGate + csrftoken cookie
  │  GET /api/categories ────────────► annotate(Count("notes"))  → Sidebar (NFR-05)
  │  GET /api/notes[?category] ──────► select_related("category"), -last_edited → NoteGrid
  │
  └─ New Note ─► draft(no id) ─keystroke+500ms─► POST /api/notes ─► id
                     │                                   │
                     └─ keystroke+500ms ─► PATCH /api/notes/{id} ─┘
                     └─ close & both blank ─► in-memory discard | DELETE (empty-guarded)
                                   │
                     invalidate ["notes"] + ["categories"] ◄── every mutation
```

## Threat Matrix

N/A — this design introduces no shell commands, subprocesses, VCS/PR automation, executable-file
classification, or process integration. The real trust boundaries here are HTTP session/CSRF, per-user object
ownership (IDOR), and Markdown XSS; each has a named RED test in §8 and must reach `tasks.md` unchanged.

## Migration / Rollout

No data migration — greenfield. Initial Django migrations for `categories` and `notes` only; the fixed
category set is seeded per user at signup (§2), never by a migration. Rollout is a single first deploy behind
the §1 reverse proxy; `COOKIE_SECURE` and `CSRF_TRUSTED_ORIGINS` are the only environment-sensitive settings.

## Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **Rework during apply**: implementing FR-09 as create-on-open would force an unconditional `DELETE` and a rewrite of `useNoteDraft`, its tests, and the notes viewset | High | §3 binds create-on-first-content + empty-guarded DELETE; FR-09 "instantly" is UI creation. Any apply slice that POSTs on button click is a design violation |
| R2 | Greenfield MVP is far over the 400-line review budget | High | `sdd-tasks` must slice into chained PRs (scaffold+auth / categories+seeding / notes API / dashboard+cards / editor+markdown+discard) and emit the guard lines |
| R3 | `username = email` on the stock `User`; moving to a custom user model later is a painful migration | Medium | Accepted per binding input. Email is only ever read through the serializer, so a future swap is contained to `apps/accounts` |
| R4 | Prod same-origin depends on infra (nginx) that does not exist yet; without it cookies become cross-site and NFR-04 breaks | Medium | `infra/nginx.conf` is a tracked deliverable; dev is covered by Next rewrites; deploy target must be confirmed before the first release |
| R5 | Autosave race: two keystroke batches before the first POST resolves would create duplicate notes | Medium | Single in-flight-save lock in `useNoteDraft`, asserted by a component test (§8) |
| R6 | CSRF token rotation on login invalidates a cached token → first post-login write 403s | Medium | `api-client` re-reads the cookie per unsafe request; covered by an integration test |
| R7 | No visual-regression coverage for NFR-06/07 tokens (colors, radius, shadow, fonts) | Low | Tokens are asserted as values in component tests; one manual check at 1280×832 before archive |
| R8 | `color-mix()` for the FR-16 50% fill needs a modern browser | Low | Desktop-only scope (NFR-01); supported in all current evergreen browsers |

## Open Questions

None blocking. Q1–Q3 and A1–A3 are closed by `decisions.md`; every remaining fork is decided above.
