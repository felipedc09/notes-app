# Tasks: Notes App MVP

Binding inputs: `design.md`, `decisions.md`, `specs/{auth,categories,notes,dashboard}/spec.md`, `REQUIREMENTS.md` v5.
Greenfield repo — every task creates a new path under `backend/` or `frontend/` per `design.md` §1.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~2,250 total (see per-slice below) |
| 400-line budget risk | High (overall); per-slice below |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 (user-selected, 5 slices) |
| Delivery strategy | chained PRs (user-selected 5-slice split) |
| Chain strategy | pending — stacked-to-main vs feature-branch-chain not yet confirmed |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Per-slice forecast (`additions + deletions`, authored code only):

| Slice | Scope | Est. lines | Risk |
|---|---|---|---|
| 1 | Scaffold + auth | ~750 | High — exceeds budget; unavoidable for a greenfield two-app scaffold (R2) |
| 2 | Categories + FR-07 seeding | ~200 | Low–Medium |
| 3 | Notes API | ~380 | Medium |
| 4 | Dashboard UI | ~480 | Medium–High — exceeds budget |
| 5 | Editor + markdown + FR-27 discard | ~440 | Medium–High — exceeds budget |

Slices 1, 4, and 5 are expected to exceed 400 lines even after chaining; flagged explicitly rather than silently absorbed. If any slice measures over budget at apply time, re-split that slice further before requesting review.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Repo scaffold + session/CSRF auth (signup/login/logout/me) | PR 1 | `cd backend && .venv/bin/python -m pytest apps/accounts -q` | `npm run test:e2e -- --grep "signup"` (dev servers up) | Revert `apps/accounts/`, `src/app/{login,signup}`, `AuthGate.tsx` — no downstream code depends on it yet |
| 2 | Category model + FR-07 seeding + counts API | PR 2 | `cd backend && .venv/bin/python -m pytest apps/categories -q` | `manage.py seed_categories` against dev DB | Revert `apps/categories/`; accounts view's seeding call reverts to a 1-line removal |
| 3 | Notes API (CRUD, ordering, empty-guarded DELETE) | PR 3 | `cd backend && .venv/bin/python -m pytest apps/notes -q` | `django_assert_num_queries` integration suite against SQLite test DB | Revert `apps/notes/`; no frontend consumes it until PR 4 |
| 4 | Dashboard (sidebar, cards, filtering, empty state) | PR 4 | `cd frontend && npm run test -- src/components src/features/categories` | `npm run test:e2e -- --grep "category filter"` (dev servers up) | Revert `src/app/page.tsx` additions + dashboard organisms |
| 5 | Editor (markdown, draft lifecycle, FR-27 discard) | PR 5 | `cd frontend && npm run test -- src/features/notes` | `npm run test:e2e -- --grep "New Note|discard"` (dev servers up) | Revert `NoteEditor.tsx`, `useNoteDraft.ts`; dashboard grid still renders read-only from PR 4 |

---

## Slice 1: Scaffold + Auth (PR 1)

### Backend
- [ ] 1.1 Init `backend/` Django project (`manage.py`, `config/{settings,urls,wsgi}.py`, `requirements.txt`, `pytest.ini`, `.env.example`); wire `DATABASE_URL` via `dj-database-url` (SQLite dev/test, Postgres prod) (NFR-03)
- [ ] 1.2 `apps/accounts/{serializers,views,urls}.py` — signup/login/logout/me endpoints scaffold (FR-01–FR-05)
- [ ] 1.3 Session/CSRF settings in `config/settings.py`: `SESSION_COOKIE_HTTPONLY/SECURE`, `SAMESITE=Lax`, `CSRF_COOKIE_HTTPONLY=False`, `CSRF_TRUSTED_ORIGINS`, `AUTH_PASSWORD_VALIDATORS`, DRF `SessionAuthentication` + `IsAuthenticated` defaults (NFR-04)
- [ ] 1.4 Signup view: `User.objects.create_user(username=email, email=email, password=…)` inside `transaction.atomic()`, logs the user in on success (FR-04)
- [ ] 1.5 Login view: authenticate by email/password, generic `400 {"detail":"Invalid email or password."}` that never discloses which field (FR-05)
- [ ] 1.6 Logout view (204) and `GET /api/auth/me` with `@ensure_csrf_cookie` (FR-05)
- [ ] 1.7 `infra/nginx.conf` — prod reverse proxy: `/api/`, `/admin/`, `/django-static/` → gunicorn, rest → Next Node server (NFR-02)

### Frontend
- [ ] 1.8 Scaffold `frontend/` Next.js App Router app (`package.json`, `next.config.ts` with `NODE_ENV`-guarded dev rewrite `/api/:path*` → `127.0.0.1:8000`, `tsconfig.json`) (NFR-02)
- [ ] 1.9 `src/app/layout.tsx` loading Inria_Serif(700)/Inter(400,700) as CSS vars; `globals.css` Tailwind v4 `@theme` tokens; `styles/tokens.css` mirror (NFR-06, NFR-07)
- [ ] 1.10 Atoms: `Button`, `TextField`, `PasswordField` (eye-icon mask/visible toggle) (FR-03)
- [ ] 1.11 `organisms/AuthCard.tsx` + `src/app/signup/page.tsx` — "Yay, New Friend!", email+password, "Sign Up" button, link "We're already friends!" → `/login` (FR-01, FR-06)
- [ ] 1.12 `src/app/login/page.tsx` — "Yay, You're Back!", "Login" button, link "Oops! I've never been here before" → `/signup` (FR-02, FR-06)
- [ ] 1.13 `lib/api-client.ts` — `credentials:"same-origin"`, `X-CSRFToken` re-read from `document.cookie` on every unsafe request (NFR-04)
- [ ] 1.14 `features/auth/useAuth.ts` + `AuthGate.tsx` — resolve `GET /api/auth/me` on boot, redirect `/login` on 401/403, `router.replace("/")` on signup/login 200 (Q2) (FR-04, FR-05)

### Tests
- [ ] 1.15 Backend integration (`APIClient(enforce_csrf_checks=True)`): signup sets `sessionid` with httpOnly/Secure/SameSite=Lax; unsafe method without `X-CSRFToken` → 403; login failure message never discloses which field (NFR-04, FR-05)
- [ ] 1.16 Frontend component: password-field eye icon toggles masked/visible (FR-03)
- Run: `cd backend && .venv/bin/python -m pytest -q`; `cd frontend && npm run test`

## Slice 2: Categories + FR-07 Seeding (PR 2)

- [ ] 2.1 `apps/categories/models.py` — `Category(user FK, name, color, order)`, `UniqueConstraint(user,name)`, `ordering=["order"]` (FR-07, NFR-06)
- [ ] 2.2 `apps/categories/constants.py::DEFAULT_CATEGORIES` — Random Thoughts `#ef9c66`, School `#fcdc94`, Personal `#78aba8`, order 0–2 (FR-07, NFR-06)
- [ ] 2.3 `apps/categories/services.py::seed_default_categories(user)` — `get_or_create`, idempotent (FR-07)
- [ ] 2.4 Call `seed_default_categories` from the signup view's `transaction.atomic()` block (1.4) (FR-07)
- [ ] 2.5 `manage.py seed_categories` idempotent backfill management command (FR-07)
- [ ] 2.6 `apps/categories/{serializers,views}.py` — `GET /api/categories` → `[{id,name,color,noteCount}]`, ordered by `order`, via `Category.objects.filter(user=…).annotate(note_count=Count("notes"))` in one query (NFR-05)
- [ ] 2.7 `apps/categories/urls.py` wiring + migrations

### Tests
- [ ] 2.8 Backend unit: `seed_default_categories` creates exactly 3 with NFR-06 colors, idempotent on repeat call (FR-07)
- [ ] 2.9 Backend integration: `GET /api/categories` counts computed in exactly one query (`django_assert_num_queries`); categories don't leak between users (NFR-05)
- Run: `cd backend && .venv/bin/python -m pytest -q`

## Slice 3: Notes API (PR 3)

- [ ] 3.1 `apps/notes/models.py` — `Note(user FK, category FK PROTECT, title blank=True, content blank=True, created_at auto_now_add, last_edited default=timezone.now — NOT auto_now)`, `ordering=["-last_edited","-id"]`, indexes (FR-11, FR-13)
- [ ] 3.2 `apps/notes/serializers.py` — `NoteSerializer` with `categoryName`/`categoryColor` denormalized via `select_related("category")` (FR-11, FR-16)
- [ ] 3.3 Serializer `update()`: set `last_edited = timezone.now()` only when incoming `title`/`content` differs from stored value; never on a category-only change (FR-13, FR-25)
- [ ] 3.4 `apps/notes/views.py` — `ListCreateAPIView` for `GET/POST /api/notes`: queryset scoped to `request.user`, `?category=` filter, `-lastEdited` order, unpaginated (FR-09, FR-10, FR-19, FR-23)
- [ ] 3.5 `RetrieveUpdateDestroyAPIView` for `GET/PATCH/DELETE /api/notes/{id}` — PATCH (not PUT) is partial; `get_queryset()` scoped to owner → 404 for another user's note id (FR-15, FR-24)
- [ ] 3.6 DELETE guard: 204 only if `title` and `content` are both blank after `.strip()`; else `409 {"detail":"Only an empty note can be discarded."}` (FR-27)
- [ ] 3.7 `apps/notes/urls.py` wiring + migrations

### Tests
- [ ] 3.8 Backend unit: `last_edited` bumps on title/content change but NOT on category-only change (FR-13, FR-15, FR-25); discard guard rejects a non-blank note with 409 (FR-27)
- [ ] 3.9 Backend integration: notes ordering `-lastEdited` with stable tiebreak (FR-23, FR-11); `?category=` filter (FR-19); another user's note id → 404 IDOR (FR-24); invalid/foreign `categoryId` → 400 (FR-11)
- Run: `cd backend && .venv/bin/python -m pytest -q`

## Slice 4: Dashboard UI (PR 4)

- [ ] 4.1 Atoms: `ColorDot.tsx`, `IconButton.tsx`
- [ ] 4.2 `molecules/CategoryFilterItem.tsx` — color dot + name, count in parens hidden at 0 (A3) (FR-18)
- [ ] 4.3 `features/categories/useCategories.ts` — react-query `["categories"]`
- [ ] 4.4 `organisms/Sidebar.tsx` — "All Categories" first, then 3 categories, active-item highlight, `?category=` filter state (FR-18, FR-19)
- [ ] 4.5 `features/notes/useNotes.ts` — react-query `["notes"]` with `?category` param, invalidated on every note/category mutation
- [ ] 4.6 `lib/date-format.ts::formatCardDate()` — `today`/`yesterday` (lowercase) vs `Month D` via local calendar-day comparison (FR-22, A1, NFR-08)
- [ ] 4.7 `lib/markdown.tsx` — `react-markdown` + `remark-gfm` wrapper, no `rehype-raw`, default `urlTransform`, links `rel="noopener noreferrer"` (FR-26)
- [ ] 4.8 `molecules/NoteCardMeta.tsx` + `organisms/NoteCard.tsx` — date/category/title/preview, `.note-surface` CSS (3px border + 50% `color-mix` fill) (FR-16, FR-20); title wraps unclamped, preview `disallowedElements`+`unwrapDisallowed`+`-webkit-line-clamp` ellipsis (FR-21, FR-26)
- [ ] 4.9 `organisms/NoteGrid.tsx` — grid of `NoteCard`, ordered as returned by the API (FR-23)
- [ ] 4.10 `organisms/EmptyState.tsx` — "I'm just here waiting for your charming notes…" + illustration, shown at zero notes (FR-08)
- [ ] 4.11 `src/app/page.tsx` — dashboard shell wiring Sidebar+NoteGrid+EmptyState behind `AuthGate`, `min-w-[1280px]` fixed shell, no breakpoints (NFR-01)

### Tests
- [ ] 4.12 Frontend unit: `formatCardDate` day boundaries, lowercase, no year (FR-22, A1, NFR-08); markdown renderer escapes `<script>` and drops `javascript:` href (FR-26)
- [ ] 4.13 Component (RTL + msw): `NoteCard` 3px border + 50% fill from `--cat` (FR-16); title wraps/preview clamps (FR-21); sidebar hides count at 0, shows at ≥1 (A3, FR-18); empty-state copy (FR-08)
- [ ] 4.14 E2E (Playwright, 1280×832): signup → lands on dashboard "All Categories" (Q2); category filter switches grid contents (FR-19)
- Run: `cd frontend && npm run test && npm run test:e2e`

## Slice 5: Editor + Markdown + FR-27 Discard (PR 5)

- [ ] 5.1 `molecules/CategorySelect.tsx` — single-select dropdown listing the 3 categories (FR-15)
- [ ] 5.2 `organisms/NoteEditor.tsx` overlay on `/` (not a route): placeholders "Note Title"/"Pour your heart out…" cleared on edit start (FR-12); reuses `.note-surface` styling (4.8) (FR-16); top-right close control unmounting the overlay (FR-17); `formatEditorTimestamp()` in `lib/date-format.ts`, right-aligned "Last Edited: Month D, YYYY at h:mm am/pm" via `Intl.DateTimeFormat` parts (FR-14); reuses `lib/markdown.tsx` (4.7) for the note's read state before click-to-edit (FR-24, FR-26)
- [ ] 5.3 Wire "New Note" pill button (top-right, "+" icon) into `page.tsx`/dashboard header, opening `NoteEditor` with an empty in-memory draft (no id, no request) — instant open (FR-09)
- [ ] 5.4 `features/notes/useNoteDraft.ts` state machine: first keystroke → debounce 500ms → `POST /api/notes` → id; later keystrokes → debounce 500ms → `PATCH /api/notes/{id}`; single in-flight-save lock so the first POST resolves before any PATCH (FR-09, FR-10, R5)
- [ ] 5.5 Click-to-edit inline title/content fields inside `NoteEditor` — clicking text swaps to an editable field, edits flow through `useNoteDraft` (FR-24, FR-25)
- [ ] 5.6 Close handling in `useNoteDraft`: draft never persisted & both blank → in-memory discard, zero requests; persisted & both blank → `DELETE` (empty-guarded, 3.6) → 204; otherwise → flush pending edit then close (FR-17, FR-27)
- [ ] 5.7 Wire `CategorySelect` (5.1) to `PATCH categoryId` on the open note; `invalidateQueries(["notes"])` + `(["categories"])` on every note/category mutation (FR-15)

### Tests
- [ ] 5.8 Frontend unit: exact `formatEditorTimestamp` string match (FR-14)
- [ ] 5.9 Component (RTL + msw): draft state machine — single POST under rapid typing (R5, FR-09); DELETE only when both fields blank (FR-27); CSRF token re-read per unsafe request after login rotation (R6, NFR-04)
- [ ] 5.10 E2E: New Note → type → reload → persists (FR-09, FR-10); open note → clear both fields → close → gone (FR-27)
- [ ] 5.11 Pre-PR command sweep: `cd backend && .venv/bin/python -m pytest -q && python manage.py check && python manage.py makemigrations --check --dry-run`; `cd frontend && npm run test && npm run typecheck && npm run lint && npm run build && npm run test:e2e`

---

## Coverage Table — 27 FRs + 8 NFRs

| ID | Slice.Task(s) | ID | Slice.Task(s) |
|---|---|---|---|
| FR-01 | 1.11 | FR-15 | 3.5, 5.1, 5.7 |
| FR-02 | 1.12 | FR-16 | 3.2, 4.8, 5.2, 4.13 |
| FR-03 | 1.10, 1.16 | FR-17 | 5.2, 5.6 |
| FR-04 | 1.4, 1.14 | FR-18 | 4.2, 4.4, 4.13 |
| FR-05 | 1.2, 1.5, 1.6, 1.14, 1.15 | FR-19 | 3.4, 3.9, 4.4, 4.14 |
| FR-06 | 1.11, 1.12 | FR-20 | 4.8 |
| FR-07 | 2.1–2.5, 2.8 | FR-21 | 4.8, 4.13 |
| FR-08 | 4.10, 4.13 | FR-22 | 4.6, 4.12 |
| FR-09 | 3.4, 5.3, 5.4, 5.9, 5.10 | FR-23 | 3.1, 3.4, 3.9, 4.9 |
| FR-10 | 3.4, 5.4, 5.10 | FR-24 | 3.5, 5.2, 5.5 *(gap closed)* |
| FR-11 | 3.1, 3.2, 3.9 | FR-25 | 3.3, 5.5 |
| FR-12 | 5.2 | FR-26 | 4.7, 4.8, 4.12, 5.2 |
| FR-13 | 3.1, 3.3, 3.8 | FR-27 | 3.6, 3.8, 5.4, 5.6, 5.9, 5.10 |
| FR-14 | 5.2, 5.8 | | |

| ID | Slice.Task(s) |
|---|---|
| NFR-01 | 4.11 |
| NFR-02 | 1.7, 1.8 |
| NFR-03 | 1.1 |
| NFR-04 | 1.3, 1.13, 1.15, 5.9 |
| NFR-05 | 2.6, 2.9 |
| NFR-06 | 1.9, 2.1, 2.2, 4.8 |
| NFR-07 | 1.9 |
| NFR-08 | 4.6, 4.12 *(gap closed)* |

All 27 FRs and 8 NFRs are covered by at least one task; none unimplemented.

## Threat Matrix Carry-Forward

`design.md` marks the threat matrix N/A (no shell/subprocess/VCS/process-integration surface), but names three real trust boundaries whose RED tests are preserved above: session/CSRF (1.15, 5.9), per-user object ownership / IDOR (3.5, 3.9), and Markdown XSS (4.7, 4.12).
