# Decisions — notes-app MVP

Resolves the 3 Open Questions and 3 Ambiguities carried forward by `proposal.md`.
Stakeholder-confirmed 2026-07-29. These are binding inputs for `sdd-spec` and `sdd-design`.

| # | Question | Decision |
|---|----------|----------|
| Q1 | Auth details beyond session strategy | **Minimal — Django defaults.** Use Django's built-in `AUTH_PASSWORD_VALIDATORS` (min 8 chars, not entirely numeric, not a common password, not similar to user attrs). **No email verification. No password-reset flow.** Neither appears in the demo or the design. |
| Q2 | Sign-up CTA label + post-auth landing | **CTA label: "Sign Up"** (assumption 7 in REQUIREMENTS.md, now confirmed). **Post-auth landing: the dashboard** (`/`), in the "All Categories" unfiltered state. Applies to both sign-up and login. |
| Q3 | API contract — pagination | **No pagination.** `GET /api/notes` returns all of the user's notes, ordered `lastEdited` descending (FR-23). Single-user scope and the design shows no pagination or infinite-scroll affordance. Revisit only if note volume becomes a real problem. |
| A1 | Date casing on cards | **lowercase — "today" / "yesterday".** The design is visual truth; FR-22 already specifies this. Narration's "Today"/"Yesterday" is superseded. |
| A2 | Two timestamp formats | **Both intended, as written.** Card: `today` \| `yesterday` \| `Month D` (no year). Editor: `Last Edited: Month D, YYYY at h:mm am/pm`, right-aligned (FR-14). Not a contradiction — different surfaces, different density. |
| A3 | Sidebar counts at zero | **Hide the count when it is 0.** Render only the color dot + category name, matching the empty-state frame where names appear without counts. Counts appear once a category has ≥1 note. |

## Scope correction

`proposal.md`'s slice plan omitted **FR-08** (empty state: *"I'm just here waiting for your
charming notes…"* plus illustration). It belongs in the **Phase 4 / dashboard** slice alongside
FR-18..FR-23. Not a scope change — a transcription gap in the proposal.

## Unchanged

Everything else in `REQUIREMENTS.md` v5 stands: 27 FRs, 8 NFRs, the Out of Scope list, and
WL-01 (note deletion) remaining wishlist rather than client scope.
