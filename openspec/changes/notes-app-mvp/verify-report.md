# Verify Report — notes-app-mvp

Branch: `feat/slice-5-editor` @ `419a1f0` (tip; contains all 5 chained-PR slices).
Verification date: 2026-07-30. All commands run as `bot-tin` against the real repo, real DB, real dev servers.

## 1. Requirement-by-requirement verdicts

Evidence format: `file::symbol` — `test`.

### Functional Requirements (27)

| ID | Verdict | Evidence |
|---|---|---|
| FR-01 | pass | `frontend/src/app/signup/page.tsx` ("Yay, New Friend!", email+password fields, "Sign Up" button) |
| FR-02 | pass | `frontend/src/app/login/page.tsx` ("Yay, You're Back!", "Login" button) |
| FR-03 | pass | `atoms/PasswordField.tsx` (eye icon shown only when `hasValue`, toggles `type` password/text) — `PasswordField.test.tsx` (3 tests, passing) |
| FR-04 | pass | `apps/accounts/views.py::SignupView.post` — `User.objects.create_user` inside `transaction.atomic()` — `test_auth.py::test_signup_response_body` |
| FR-05 | pass | `apps/accounts/views.py::LoginView.post` — `authenticate()` + `login()`, server-side session — `test_auth.py::test_login_success_rotates_session_and_returns_user` |
| FR-06 | pass | `AuthCard` footer links; signup→`/login` "We're already friends!", login→`/signup` "Oops! I've never been here before" |
| FR-07 | pass | `apps/categories/services.py::seed_default_categories` (`get_or_create`, idempotent), called from `SignupView` — `test_categories*.py` seeding tests (part of 40/40) |
| FR-08 | pass | `organisms/EmptyState.tsx` exact copy "I'm just here waiting for your charming notes…" + SVG illustration, rendered by `page.tsx` when `notes.length === 0` — `EmptyState.test.tsx` (2 tests) |
| FR-09 | pass | `page.tsx` "New Note" pill (`+` icon, top-right) → `setEditorTarget("new")` → `NoteEditor` opens instantly with an in-memory draft, no request — e2e `editor.spec.ts` ✓ |
| FR-10 | pass | `useNoteDraft.ts::performSave` — first keystroke → debounced `POST /api/notes` — e2e "New Note → type → reload → persists" ✓ |
| FR-11 | pass | `apps/notes/models.py::Note` (title, content, category FK, exactly one) — `test_notes_api.py` integration suite |
| FR-12 | pass | `NoteEditor.tsx` placeholders "Note Title"/"Pour your heart out…", cleared once `draft.title`/`draft.content` is non-empty |
| FR-13 | pass | `apps/notes/serializers.py::NoteSerializer.update()` bumps `last_edited` only on title/content diff — `test_notes_serializer.py::TestLastEditedBumpRule` (4 tests) |
| FR-14 | pass | `lib/date-format.ts::formatEditorTimestamp()` exact string assembly — `date-format.test.ts` (part of 9 tests), rendered right-aligned in `NoteEditor.tsx` |
| FR-15 | pass | `molecules/CategorySelect.tsx` + `useNoteDraft.ts::updateCategory` → `PATCH categoryId` — `test_notes_serializer.py::test_category_only_change_does_not_bump_last_edited` |
| FR-16 | pass | `.note-surface` CSS class (`globals.css`, `color-mix` 50% + 3px border), applied identically in `NoteCard.tsx` and `NoteEditor.tsx` via `--cat` — `NoteCard.test.tsx::"applies the category color..."` |
| FR-17 | pass | `NoteEditor.tsx` single top-right `IconButton` "Close note" → `draft.close()` → `onClose` unmounts overlay |
| FR-18 | pass | `organisms/Sidebar.tsx` — "All Categories" first, then 3 categories, color dot + name — `Sidebar.test.tsx` (2 tests) |
| FR-19 | pass | `Sidebar.tsx::selectCategory` writes `?category=` param; `page.tsx::useNotes(categoryId)` filters; backend `get_queryset()` `?category=` filter — e2e `dashboard.spec.ts` "category filter switches..." ✓ |
| FR-20 | pass | `NoteCard.tsx` renders date/category/title/preview — `NoteCard.test.tsx::"shows the date and category name"` |
| FR-21 | pass | `NoteCard.tsx`: title `h3` unclamped (`className` asserted to not match `/line-clamp/`), preview `div.line-clamp-4` — both asserted in `NoteCard.test.tsx` |
| FR-22 | pass | `lib/date-format.ts::formatCardDate()` local-calendar-day diff → `today`/`yesterday`/`Month D` — `date-format.test.ts` (9 tests covering day boundaries) |
| FR-23 | pass | `Note.Meta.ordering = ["-last_edited", "-id"]` + `ListCreateAPIView` — `test_notes_api.py::TestNoteOrdering` |
| FR-24 | pass | `NoteCard.tsx onSelect` → `page.tsx::setEditorTarget(id)` → opens `NoteEditor`; click-to-edit swaps static text to input/textarea (`editingTitle`/`editingContent` state) |
| FR-25 | **partial** | `updateTitle`/`updateContent` call `scheduleSave` immediately on every keystroke (title/content state itself updates instantly in the UI), but the **displayed `lastEdited` timestamp** only updates after the 500ms-debounced network round trip resolves (`performSave` sets `lastEdited` from the server response) — not "immediately visible" per the spec's literal wording. `tasks.md`'s own post-apply verdict flags this explicitly as an interpretation call ("automatic, no manual save" vs. "per-keystroke ticking clock"). The interpretation is reasonable and consistent with A2/debounced-autosave design, but it does not literally satisfy the dashboard spec's "immediately visible" / "real-time" scenario language — see §6. |
| FR-26 | pass | `lib/markdown.tsx` (`react-markdown` + `remark-gfm`, no `rehype-raw`) — `markdown.test.tsx` (4 tests: script escape, `javascript:` href drop, safe link `rel`, block-strip preview) |
| FR-27 | pass | `apps/notes/views.py::NoteDetailView.destroy()` — 204 only if both fields blank after `.strip()`, else 409 — `test_notes_api.py::TestDiscardGuard` (204 blank, 204 whitespace-only, 409 non-blank, 404 cross-user) + e2e `editor.spec.ts` "closing a note with both fields cleared discards it" ✓ |

**FR count: 26 pass, 1 partial, 0 fail.**

### Non-Functional Requirements (8)

| ID | Verdict | Evidence |
|---|---|---|
| NFR-01 | pass | `page.tsx`: `min-w-[1280px]`, no Tailwind breakpoint prefixes anywhere in `frontend/src` (`rg "sm:|md:|lg:|xl:|@media"` → 0 matches) |
| NFR-02 | pass | `next.config.ts` dev rewrite `/api/:path*` → `127.0.0.1:8000`; `infra/nginx.conf` prod single-origin reverse proxy; e2e run confirms first-party cookies across the rewrite |
| NFR-03 | pass | `config/settings.py::DATABASES` via `dj_database_url.config(default="sqlite:///...")` — engine-agnostic |
| NFR-04 | pass | `SESSION_COOKIE_HTTPONLY/SECURE/SAMESITE` settings — `test_auth.py::test_signup_sets_httponly_secure_samesite_lax_session_cookie` (asserts all three flags on the actual response cookie); CSRF enforced — `test_stale_csrf_token_from_before_login_is_rejected` (403 on stale/wrong token against an authenticated unsafe method) |
| NFR-05 | pass | `apps/categories/views.py::CategoryListView.get_queryset` — single `annotate(Count("notes"))` query — categories test suite (`django_assert_num_queries`, part of 40/40) |
| NFR-06 | pass | `globals.css`/`styles/tokens.css` tokens match spec hexes; `apps/categories/constants.py::DEFAULT_CATEGORIES` colors `#ef9c66`/`#fcdc94`/`#78aba8` |
| NFR-07 | pass | `layout.tsx` loads `Inria_Serif(700)`/`Inter(400,700)` as CSS vars (source-read, not independently pixel-verified — see §7 caveat) |
| NFR-08 | pass | `formatCardDate()` relative-day logic — covered by `date-format.test.ts` |

**NFR count: 8 pass, 0 fail.**

## 2. Binding decisions verification

| Decision | Verdict | Evidence |
|---|---|---|
| A1 — lowercase `today`/`yesterday`, local-calendar-day | pass | `date-format.ts::formatCardDate` compares `toLocalCalendarDayMs()` (constructs `new Date(y,m,d)` in local tz), returns literal lowercase strings `"today"`/`"yesterday"` |
| A2 — both timestamp formats present & distinct | pass | `formatCardDate()` (today/yesterday/Month D) vs `formatEditorTimestamp()` ("Last Edited: Month D, YYYY at h:mm am/pm") — two separate functions, two separate test files/assertions, structurally cannot collide |
| A3 — sidebar count hidden at 0 | pass | `CategoryFilterItem.tsx`: `{typeof count === "number" && count > 0 && <span>({count})</span>}` — renders nothing below 1 |
| Q1 — Django defaults, no email verification, no password reset | pass | `AUTH_PASSWORD_VALIDATORS` = the 4 stock Django validators; no email-confirmation code path anywhere in `apps/accounts`; `rg -i "password.?reset"` over `backend/` → 0 matches; no reset URL/view/template |
| Q2 — post-auth landing on unfiltered dashboard | pass | Both `signup/page.tsx` and `login/page.tsx` call `router.replace("/")` on success; `page.tsx` defaults `categoryId = null` (no `?category=` param) → "All Categories" |
| Q3 — no pagination | pass | `REST_FRAMEWORK` in `settings.py` has no `DEFAULT_PAGINATION_CLASS`; `NoteListCreateView` is a plain `ListCreateAPIView` with no `pagination_class` override |

**All 6 decisions verified as implemented.**

## 3. Scope discipline

- **Category CRUD**: `apps/categories/urls.py` exposes exactly one route — `GET /api/categories` (`ListAPIView`). No create/update/delete view or URL exists for categories. **Confirmed not built.**
- **Search / tags / pinning / archiving / attachments / extra sort controls**: `rg -i "search|tags|pin|archive|attachment|sort"` over `frontend/src` and `backend/apps` returns no feature code matching these (only the single category `?category=` filter exists as a "sort/filter" control). **Confirmed not built.**
- **Sharing / multi-user**: no sharing model, no invite/collaborator concept anywhere in the schema or UI. **Confirmed not built.**
- **Responsive layouts**: `rg "sm:|md:|lg:|xl:|@media"` over `frontend/src` → 0 matches; `page.tsx` is `min-w-[1280px]` fixed-shell only. **Confirmed not built.**
- **Sync/offline, notifications**: no service worker, no offline cache, no notification code anywhere. **Confirmed not built.**
- **WL-01 (general note deletion)**: NOT shipped. `NoteDetailView.destroy()` (`apps/notes/views.py`) is gated: `if instance.title.strip() or instance.content.strip(): return 409`. There is **no UI delete affordance** anywhere in `NoteEditor.tsx`, `NoteCard.tsx`, or `page.tsx` — the only top-right editor control is the FR-17 close button, which internally may trigger the empty-guarded DELETE via `useNoteDraft.ts::close()`, never exposed as a user-facing "delete" action. **Verified empty-guard genuinely blocks deletion of a non-empty note**: `test_notes_api.py::test_delete_non_blank_note_returns_409` creates a note with non-blank title, issues `DELETE`, and asserts `409` + the exact error body, and the note still exists afterward is implied by the guard short-circuiting before `super().destroy()` is ever called (confirmed by reading `views.py::destroy()` — the `Response(409)` returns before the `super().destroy()` line executes). Whitespace-only content (`"   "`, `"\n\t"`) is correctly treated as blank (`test_delete_whitespace_only_note_returns_204`) — matches "empty" as "blank after strip," not "byte-length zero."

**Scope discipline: clean. No out-of-scope feature found; WL-01 correctly withheld.**

## 4. Security spot-checks

| Check | Verdict | Evidence |
|---|---|---|
| Cross-user note id → 404 not 403 (IDOR) | pass | `apps/notes/views.py::NoteDetailView.get_queryset()` scoped to `request.user` → `test_notes_api.py::test_another_users_note_id_returns_404_not_403`, `test_patching_another_users_note_id_returns_404`, `test_delete_another_users_note_returns_404_not_409` — all pass |
| Foreign `categoryId` rejected | pass | `NoteSerializer.__init__` scopes `categoryId` field's queryset to `Category.objects.filter(user=request.user)` → DRF's `PrimaryKeyRelatedField` 400s on an id outside that queryset — `test_notes_api.py::test_foreign_users_category_id_is_rejected_with_400` |
| `rehype-raw` absent | pass | `rg "rehype-raw"` over `frontend/` finds exactly one hit: a comment in `markdown.tsx` warning never to add it. Not in `package.json` dependencies or devDependencies. |
| `javascript:` hrefs stripped | pass | react-markdown's default `urlTransform` is left untouched (never overridden) — `markdown.test.tsx::"drops a javascript: href via the default urlTransform"` passes |
| Session cookie flags httpOnly + Secure + SameSite=Lax | pass | `settings.py`: `SESSION_COOKIE_HTTPONLY=True` (hardcoded), `SESSION_COOKIE_SECURE=env-bool(default True)`, `SESSION_COOKIE_SAMESITE="Lax"` — asserted directly against the response cookie object in `test_auth.py::test_signup_sets_httponly_secure_samesite_lax_session_cookie` (not just config inspection) |
| CSRF enforced on authenticated unsafe methods | pass | `test_auth.py::test_stale_csrf_token_from_before_login_is_rejected` — a pre-login CSRF token replayed against an authenticated `POST /api/auth/logout` → `403`. Note: `POST /api/auth/signup` and `POST /api/auth/login` are themselves CSRF-exempt by design (DRF's `SessionAuthentication.enforce_csrf()` only runs once a session user is already resolved — there is no prior session to protect on an anonymous request), documented and tested explicitly in `test_signup_without_csrf_token_succeeds`/`test_login_without_csrf_token_succeeds`. This is standard, intentional DRF behavior, not a gap — CSRF is enforced on every unsafe method once a session exists (logout, and structurally the same for the notes PATCH/DELETE endpoints via the identical `SessionAuthentication` class). |

**Security spot-checks: 6/6 pass.**

## 5. Real command output

### Backend

```
$ cd backend && .venv/bin/python -m pytest -q
........................................                                 [100%]
40 passed in 14.87s
```

```
$ cd backend && .venv/bin/python manage.py check
System check identified some issues:
WARNINGS:
?: (urls.W002) Your URL pattern '/<int:pk>' [name='note-detail'] has a route
   beginning with a '/'. Remove this slash as it is unnecessary...
System check identified 1 issue (0 silenced).
```
Exit code 0 (warning only, non-fatal) — matches the deviation documented at task 3.7 in `tasks.md`, verified genuine (not silently swept).

```
$ cd backend && .venv/bin/python manage.py makemigrations --check --dry-run
[same W002 warning]
No changes detected
```
Exit code 0 — no missing migrations.

### Frontend

```
$ cd frontend && npm run test -- --run
 ✓ src/components/organisms/Sidebar.test.tsx (2 tests)
 ✓ src/components/atoms/PasswordField.test.tsx (3 tests)
 ✓ src/lib/markdown.test.tsx (4 tests)
 ✓ src/components/organisms/NoteCard.test.tsx (4 tests)
 ✓ src/lib/date-format.test.ts (9 tests)
 ✓ src/components/organisms/EmptyState.test.tsx (2 tests)
 ✓ src/components/organisms/NoteEditor.test.tsx (3 tests)
 Test Files  7 passed (7)
      Tests  27 passed (27)
```

```
$ cd frontend && npm run typecheck   # tsc --noEmit
(no output — clean, exit 0)
```

```
$ cd frontend && npm run lint        # eslint
(no output — clean, exit 0)
```

```
$ cd frontend && npm run build       # next build
✓ Compiled successfully in 3.4s
  Running TypeScript ... Finished TypeScript in 3.3s
  Generating static pages using 3 workers (6/6) in 221ms
Route (app): / , /_not-found , /login , /signup — all ○ (Static)
```

```
$ cd frontend && npm run test:e2e    # playwright test
  ✓ e2e/dashboard.spec.ts:10:5 signup lands on the dashboard in the All Categories state (1.5s)
  ✓ e2e/dashboard.spec.ts:32:5 category filter switches the active sidebar item and updates the URL (FR-19) (1.6s)
  ✓ e2e/editor.spec.ts:18:5 New Note opens instantly, autosaves after typing, and survives a reload (FR-09, FR-10) (2.7s)
  ✓ e2e/editor.spec.ts:40:5 closing a note with both fields cleared discards it instead of persisting (FR-27) (3.2s)
  4 passed (10.6s)
```

**All commands cited by `tasks.md`'s task 5.11 pre-PR sweep were re-run independently in this verification and produced identical pass/exit-code outcomes to what apply claimed.**

## 6. Discrepancies between apply claims and actual findings

1. **FR-25 wording gap (minor, already self-disclosed).** `tasks.md`'s post-apply verdict pre-emptively flags that FR-25 ("update in real-time"/"immediately visible") is implemented as *debounced autosave* rather than a sub-second ticking clock. Independently confirmed by reading `useNoteDraft.ts`: the `lastEdited` state variable is set only inside `performSave`'s `.then` continuation, i.e. only after the 500ms debounce timer fires **and** the network round trip resolves — not on every keystroke. This is a defensible interpretation given A2 and the debounced-autosave architecture, and it was disclosed rather than hidden, but the literal spec scenario text ("timestamp shall update in real-time," "immediately visible") is not literally met. **Not a blocking gap** — flagging as the one `partial` verdict rather than accepting the self-report at face value.

2. **`manage.py check` warning is real, not silenced.** `tasks.md` claims `manage.py check`/`makemigrations --check` "clean" in the slice-3 deviation note and task 5.11 summary but *also* explicitly documents the `urls.W002` warning as an accepted tradeoff in the slice-3 deviation text. Independently re-running both commands reproduces the exact same single warning, exit code 0. This is **consistent**, not a discrepancy — the "clean" framing in the coverage-table summary is slightly loose (a system check warning exists) but the underlying claim (exit 0, no migration drift) holds and the warning itself was disclosed elsewhere in the same document.

3. **No other discrepancy found.** Every test count, coverage-table task mapping, and command-exit claim in `tasks.md`'s "Post-apply verdict" section was independently reproduced by re-running the actual commands and re-reading the actual implementing code (not the test files' docstrings alone) for all 27 FRs, all 8 NFRs, all 6 binding decisions, and the 6 named security spot-checks. No stubbed, mocked, or hand-waved coverage was found — every cited test actually asserts the claimed behavior against real request/response cycles or real DOM output (RTL) or a real browser (Playwright against real dev servers).

## 7. Caveats / not independently re-verified

- **Visual pixel-fidelity** (exact `#faf1e3` background rendering, `1px 1px 2px rgba(0,0,0,.25)` shadow, exact border-radius as rendered by the browser, font rendering) was verified by **source inspection of the token values** (`globals.css`, `styles/tokens.css`) matching NFR-06/07's specified values, not by a pixel-level visual regression screenshot — this matches `design.md`'s own risk R7, which accepts this as a known, low-severity gap ("no visual-regression coverage... one manual check at 1280×832 before archive"). Not re-litigated here since the design already scoped it out as acceptable.

## 8. Final verdict

**PASS WITH ONE WARNING.**

The notes-app MVP genuinely implements all 27 FRs and all 8 NFRs from `REQUIREMENTS.md` v5, all 6 binding decisions from `decisions.md`, and holds scope discipline against the Out of Scope list and WL-01. All 5 chained-PR slices are present on `feat/slice-5-editor`. Every test suite claimed by the apply phases was independently re-run in this session and reproduced identical pass counts and exit codes; every security and scope claim was independently verified by reading the actual implementing source, not by trusting task checkboxes or docstrings.

The one substantive finding — **FR-25's "real-time"/"immediately visible" scenario language is satisfied by debounced autosave rather than literal per-keystroke timestamp refresh** — was already self-disclosed by the apply phase in `tasks.md`, is a reasonable interpretation consistent with the rest of the design (A2, R5's debounce architecture), and does not warrant blocking archive. It is downgraded from `pass` to `partial` here because the literal spec scenario text is not met, but no code change is required unless the client explicitly wants sub-second timestamp refresh (which nothing else in the requirements calls for).

**Nothing remains for MVP completeness.** No CRITICAL issues. Recommend proceeding to `sdd-archive`.
