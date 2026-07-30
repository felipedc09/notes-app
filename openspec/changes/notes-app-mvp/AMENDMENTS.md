# Amendments to notes-app-mvp

Changes to the delivered behavior made *after* this change was implemented and verified.

This file exists so the original artifacts stay truthful. `design.md`, `tasks.md` and
`verify-report.md` are the record of what was designed, built and audited on 29–30 July 2026, and
rewriting them would falsify that audit trail. Where a later decision contradicts them, it is
recorded here and the affected section is marked `SUPERSEDED` in place.

---

## A1 — FR-27 reversed: empty notes persist

**Date:** 30 July 2026
**Type:** Product decision by the maintainer, not a defect
**Requirement version:** REQUIREMENTS.md v5 → v6

### What changed

| | Before (as designed and verified) | After |
|---|---|---|
| "New Note" click | Client-side draft only — no id, no request | `POST /api/notes` immediately |
| First keystroke | Debounced `POST` | Debounced `PATCH` |
| Timestamp visible | Only after the first save | Immediately on open |
| Close while blank | Discarded (in-memory, or empty-guarded `DELETE`) | Kept |

### Why

The Last Edited timestamp renders from the server's `lastEdited`. Because the original design created
the row only on first content, a newly opened note had nothing to display. Creating on open makes the
timestamp real and server-derived rather than a client-side guess — a guess would show a time for a
note that does not exist yet, and would keep showing it if the save later failed.

### Accepted trade-off

**Every "New Note" click now leaves a note behind**, including one closed immediately. Blank cards
appear in the dashboard grid where previously they did not. This was stated before the change was
made and accepted.

### Scope

- `frontend/src/features/notes/useNoteDraft.ts` — create on open; the empty-guard `DELETE` branch
  removed from `close()`.
- The backend is **unchanged**. `DELETE /api/notes/{id}` still exists, still enforces its empty
  guard, and is still covered by tests — the client simply no longer calls it. Reverting the
  frontend change restores the original behavior with no backend work.

### Artifacts affected

| Artifact | Status |
|---|---|
| `specs/notes/spec.md` § FR-27 | **Updated** — now states the new criteria |
| `design.md` § "FR-27: create fires on first content, not on open" | **Superseded**, marked in place |
| `design.md` § Risks R1 | Historical — R1 warned against create-on-open as rework; that rework was subsequently chosen deliberately |
| `tasks.md` 5.6, 5.9 | Historical — accurate for what was built in slice 5 |
| `verify-report.md` | Historical — its 34 pass / 1 partial / 0 fail verdict was measured against the pre-amendment spec |

### Verification of the amendment

- `vitest` — the FR-27 unit test was rewritten to assert the note is **kept**, plus a new
  create-on-open test; suite green.
- `playwright` — "a note opened and left empty is kept, not discarded" and "the timestamp is shown as
  soon as New Note is clicked".
- Delivered in PR #13.
