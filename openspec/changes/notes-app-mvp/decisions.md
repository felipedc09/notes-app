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

## Design-conformance pass (2026-07-30)

The stakeholder supplied the actual Figma file (frames "MacBook Air - 1/2/12/13/14") after the
MVP was already implemented and verified against `REQUIREMENTS.md`. Per that document's own
framing, the design is visual truth, so the implementation was checked against exported
reference screenshots and corrected where it drifted.

**Copy corrected to exact design characters:**
- `EmptyState.tsx`: HTML-entity `I&apos;m ... notes&hellip;` → literal `I’m just here waiting
  for your charming notes...` (curly apostrophe U+2019, three literal periods instead of the
  `…` ellipsis character).
- `NoteEditor.tsx` content placeholder (both the empty-draft `<textarea>` placeholder and the
  read-state placeholder span): `Pour your heart out…` → `Pour your heart out...` (three
  periods, straight — no apostrophe in this string).
- `signup/page.tsx` footer link: `We&apos;re already friends!` → `We’re already friends!`
  (curly apostrophe).
- `login/page.tsx` footer link: `Oops! I&apos;ve never been here before` → `Oops! I’ve never
  been here before` (curly apostrophe).
- Left unchanged, confirmed already correct: `Note Title` placeholder, `Sign Up`/`Login` button
  labels, and the login heading `Yay, You're Back!`, which genuinely uses a **straight**
  apostrophe in the design — the design's own inconsistency, reproduced faithfully rather than
  normalized. Updated the corresponding assertions in `EmptyState.test.tsx`, `NoteEditor.test.tsx`,
  and the two Playwright specs that asserted the old strings (`e2e/dashboard.spec.ts`,
  `e2e/editor.spec.ts`).

**Editor layout corrected to match the design's full-page treatment** (`NoteEditor.tsx`): the
design's editor is not a centered modal.
- Removed the `bg-black/30` dark scrim; the ordinary page background now shows around the note
  surface.
- Widened the note surface from `max-w-3xl` (768px) to fill the fixed 1280px shell (design:
  1199×700 inset ~37px left/right, 84px from the top) — matches NFR-01's fixed-width desktop
  shell, so implemented with the same absolute-pixel convention already used by `page.tsx`.
- Moved the category dropdown (top-left) and the close control (top-right) out of the tinted
  note surface onto the page background above it, per the design. The close control lost its
  pill button chrome (background/rounding) to become a bare icon, matching the design; it keeps
  its `aria-label`/button semantics for accessibility.
- Moved "Last Edited: …" from the bottom of the note surface to the top, right-aligned, inside
  the surface. The timestamp format string itself was already correct and is untouched.

**Not attempted:** the design's three raster illustrations (bubble-tea cup on the empty state,
sleeping cat on sign-up, cactus on login) are not available as asset files and are out of scope
for this pass — the existing placeholder SVGs remain in place. This stays outstanding pending the
stakeholder providing the exported assets.

## Design-conformance pass, part 2 (2026-07-30)

The stakeholder exported the three real illustration assets from the Figma file and supplied a
second reference screenshot pass. This closed out the item deferred above and surfaced one more
drift the first pass had missed.

**Real illustrations wired in**, replacing all placeholders (task 6.4):
- `frontend/public/illustrations/empty-state.png` (500×499 native), `signup.png` (567×404
  native), `login.png` (145×173 native) committed to the repo.
- `EmptyState.tsx`: the hand-drawn `EmptyStateIllustration` SVG is removed entirely, replaced by
  `next/image` rendering `empty-state.png` at its designed size, 297×296.
- `AuthCard.tsx` gained an `illustration` slot (`ReactNode` prop) so `/signup` and `/login` can
  each pass their own image — `signup.png` at 188×134, `login.png` at 95×114 — since the two
  screens share one card component but use different art.
- All three render at the design's specified size, not the source pixel dimensions; aspect
  ratios already match so nothing distorts.

**Auth screen layout corrected** (`AuthCard.tsx`): the reference screenshots show no card at all
— content sits centered directly on the page background.
- Removed `bg-white`, `shadow-[var(--shadow-card)]`, and the card's own `max-w-md` (448px); the
  card wrapper is gone.
- Content (illustration, heading, fields, button, footer link) is horizontally centered, capped
  at `max-w-[384px]` per the design's field/button width.
- Heading changed from left-aligned `text-2xl` to centered `text-5xl`, matching the design's
  much larger serif heading block.
- Footer link centered (previously inherited left alignment from the removed card); kept its
  existing bold/underline/accent-color styling.
- Vertical rhythm (illustration→heading 13px, heading→fields 36px, between the two fields 13px,
  fields→button 43px, button→link 13px) approximated from the design frame via `gap`/margin
  utilities, not hard-coded absolute positions.

Verified against `fig-signup.png`, `fig-login.png`, and `fig-empty.png` reference exports with a
live screenshot comparison after implementation; all three now match.
