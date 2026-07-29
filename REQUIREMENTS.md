# Notes Application — Requirements Specification

> Reconciles the demo narration (behavior) with the Figma design *Notes Taking
> App Challenge* (visual truth), plus stakeholder decisions on architecture and
> scope. Source tags: **demo**, **design**, **demo+design**, **stated**
> (stakeholder decision), **inferred**.

## Changelog (v5)

- **Auth: session-based auth selected** — server-side Django sessions with an
  httpOnly cookie; deployed same-origin. The last open architectural decision
  is closed.
- *(v4 set Markdown content, discard-empty, and server-side counts; v3
  confirmed the stack and moved deletion to Wishlist; v2 reconciled the
  design.)*

## Summary

A single-user notes app built as a **Next.js/React** client against a
**Django** backend. After email/password (session) auth, the user lands on a
cream-themed desktop dashboard: a fixed left sidebar of the three categories
(color dot + note count) and a newest-first grid of note preview cards tinted
by category. Notes are created instantly (no manual save), auto-timestamped,
authored in Markdown, edited inline in a full-width category-tinted editor, and
filtered by category. Core scope is Create / Read / Update; **deletion is a
planned non-client enhancement** (see Wishlist).

## Actors & Personas

- **End user** — the only human actor; performs all auth, note, and category
  interactions. No admin/role/tier in either source.
- *New user* / *returning user* — states of the same actor (sign-up vs login).
- **Django backend** *(system dependency — confirmed)* — authentication,
  session management, persistence, category-count aggregation, and the API.
- **Next.js/React frontend** *(the client)* — the UI the end user operates.

## Functional Requirements

MoSCoW priority is **inferred** — no source ranks features (see Assumptions).

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| FR-01 | The system shall present a sign-up screen with "Email address" and "Password" fields, headed "Yay, New Friend!". | Must | demo+design |
| FR-02 | The system shall present a login screen with "Email address" and "Password" fields, headed "Yay, You're Back!", with a "Login" button. | Must | demo+design |
| FR-03 | The system shall provide an eye icon on the password field that toggles the entered password between masked and visible. | Should | demo+design |
| FR-04 | The system shall create an account from the entered email and password on sign-up submission. | Must | demo |
| FR-05 | The system shall authenticate a returning user against entered email and password on login submission, establishing a server-side session. | Must | demo + stated |
| FR-06 | The sign-up screen shall link to login via "We're already friends!"; the login screen shall link to sign-up via "Oops! I've never been here before". | Must | design |
| FR-07 | The system shall seed every new user with exactly three categories: Random Thoughts, School, Personal. | Must | demo+design |
| FR-08 | When the user has no notes, the system shall show an empty state with the message "I'm just here waiting for your charming notes…" and an illustration. | Should | design |
| FR-09 | The system shall create a new note when the user activates the "New Note" button (pill, top-right of the dashboard, "+" icon). | Must | demo+design |
| FR-10 | The system shall persist a note on creation, via the backend, with no manual save action. | Must | demo+design |
| FR-11 | Each note shall have a title, a Markdown content body, and exactly one category. | Must | demo+design+stated |
| FR-12 | A new note shall show placeholder text: title "Note Title", body "Pour your heart out…". | Should | design |
| FR-13 | The system shall store a Last Edited timestamp per note and set it whenever the title or content changes. | Must | demo+design |
| FR-14 | The editor shall display the timestamp as "Last Edited: {Month D, YYYY} at {h:mm am/pm}" (e.g., "Last Edited: July 21, 2024 at 8:39pm"), right-aligned. | Must | design |
| FR-15 | The system shall let the user change a note's category via a single-select dropdown listing the three categories. | Must | demo+design |
| FR-16 | The system shall set the note's background to its category color — ~50%-opacity fill + 3px solid border in that color — in both the preview card and the open editor. | Must | demo+design |
| FR-17 | The editor shall expose a single top-right control that closes the note and returns to the notes list. | Must | demo+design |
| FR-18 | The dashboard shall render a left sidebar listing "All Categories" plus each category with its color dot, name, and note count. | Must | demo+design |
| FR-19 | Selecting a category shall filter the list to that category's notes; selecting "All Categories" shall show all notes. | Must | demo+design |
| FR-20 | The system shall render each note as a preview card showing the date, the category name, the title, and a content preview. | Must | demo+design |
| FR-21 | The card shall wrap the full title and truncate only the content preview with an ellipsis on overflow. | Should | design |
| FR-22 | On a card, the date shall render "today" for the current day, "yesterday" for the prior day, otherwise "Month D" without a year. | Must | demo+design (lowercase per design) |
| FR-23 | The system shall display notes ordered by Last Edited, most recent first. | Should | inferred (design sample ordering) |
| FR-24 | Clicking a note shall open it for viewing and inline editing of title and content (click the text to edit). | Must | demo+design |
| FR-25 | Editing a note's title or content shall update its Last Edited timestamp automatically. | Must | demo+design |
| FR-26 | The system shall render Markdown content as formatted output (e.g., bullet lists) in the preview card and read view; authoring is raw Markdown in the plain editor field. | Should | stated + design (cards show rendered lists) |
| FR-27 | If a note is closed with both its title and content empty, the system shall discard it rather than persist it. | Must | stated |

## Non-Functional Requirements

| ID | Category | Requirement | Source |
|----|----------|-------------|--------|
| NFR-01 | Platform | Desktop web at ~1280×832 (all frames are "MacBook Air", 1280-wide). No mobile/tablet frames exist. | design |
| NFR-02 | Architecture | Next.js/React client and Django backend over an HTTP API, deployed **same-origin** so the session cookie is first-party (no CORS credential dance). | stated (API layer inferred from the decoupled stack) |
| NFR-03 | Persistence | Accounts, notes, and metadata persist server-side via the Django backend (Django ORM → relational store; engine unspecified). Session store: DB or Redis. | stated + inferred |
| NFR-04 | Security / Auth | Session-based auth: Django server-side sessions with an httpOnly + Secure + `SameSite=Lax` cookie; CSRF protection on unsafe methods; passwords hashed by Django auth; no plaintext. | stated + inferred |
| NFR-05 | API | Category note counts are computed server-side via Django ORM aggregation, not derived on the client. | stated |
| NFR-06 | Visual design | Background `#faf1e3`; category colors Random Thoughts `#ef9c66`, School `#fcdc94`, Personal `#78aba8`; accent/stroke `#957139`; heading `#88642a`. Cards/editor: radius 11px, shadow `1px 1px 2px rgba(0,0,0,.25)`. | design |
| NFR-07 | Typography | Titles/headings in Inria Serif (Bold); body, meta, and UI text in Inter (Regular/Bold). | design |
| NFR-08 | Usability | Dates in human-friendly form (relative for the two most recent days) to aid scanning. | demo+design |

## Data Model

### User *(persisted by Django auth)*
- `id`; `email`: string; `password`: hashed (Django auth) *(field explicit;
  hashing per Django default)*
- Owns many **Note**; associated with many **Category** *(ownership inferred)*

### Category
- `name`: string — the fixed set {Random Thoughts, School, Personal}
  *(explicit)*
- `color`: hex — Random Thoughts `#ef9c66`, School `#fcdc94`, Personal
  `#78aba8` *(explicit from design)*
- `noteCount`: integer — **derived server-side** (ORM aggregation), shown in
  the sidebar *(stated)*
- `id`, owning `userId` *(inferred)*
- Fixed per user, not user-manageable *(stated — no category CRUD in scope)*

### Note
- `title`: string *(explicit)*
- `content`: text — **Markdown source**, rendered for display *(stated;
  cards/read view render it; the editor edits raw Markdown)*
- `categoryId`: single reference *(explicit)*
- `lastEdited`: timestamp with date **and** time *(explicit — editor shows
  time; card derives the relative/short form)*
- `id`, owning `userId`, `createdAt` *(inferred — only Last Edited is shown)*
- Belongs to one **Category** and one **User**

## Constraints

- **Frontend:** Next.js (React). **Backend:** Django. *(stated)*
- **Auth:** server-side sessions (Django), httpOnly cookie, same-origin deploy.
  *(stated)*
- **Content format:** Markdown for note bodies. *(stated)*
- **Platform/viewport:** desktop web, 1280×832. *(design)*
- **Design tokens:** colors, radii, shadow, and fonts per NFR-06/07 are fixed
  by the design.
- **Timeline, budget, regulatory:** none stated.

## Assumptions

Each independently rejectable:

1. **Single actor type** — no admin/roles/sharing.
2. **Categories are per-user** and seeded on account creation.
3. **One category per note** (singular + single-select dropdown).
4. **"All Categories" is a filter view**, not a Category record; the default
   unfiltered state.
5. **MoSCoW priorities are inferred** — no source ranks features.
6. **A REST-style JSON API** mediates client↔backend (framework/style
   unconfirmed).
7. **Sign-up CTA label** wasn't captured (login's is "Login"); assumed
   "Sign Up" pending confirmation.
8. **Editor content scrolls** in a real build even though the mock clips it.
9. **Markdown is rendered read-only on display** with no live-preview toolbar in
   the editor (design shows a plain text field).

## Ambiguities & Contradictions

1. **Date casing.** Narration says "Today"/"Yesterday"; design renders
   "today"/"yesterday". FR-22 follows the design — confirm intended casing.
2. **Two timestamp formats.** Card = relative or "Month D" (no year); editor =
   "Last Edited: Month D, YYYY at h:mm am/pm". Consistent, but confirm both are
   intended.
3. **Sidebar counts on the empty state.** Category names show without counts —
   hidden, or rendered as 0?

## Open Questions

Ordered by how hard they block implementation:

1. **Auth details.** Strategy decided (session). Still to specify: password
   rules/validation, email verification (if any), and password-reset flow.
2. **Sign-up CTA label** and the post-auth landing/redirect.
3. **API contract** — endpoint shape and pagination for the notes grid.

## Wishlist / Additional Enhancements (non-client)

Builder-initiated; **not required by the client**, scheduled only if capacity
allows. Kept separate from the FR table so scope stays honest.

| ID | Enhancement | Notes |
|----|-------------|-------|
| WL-01 | Note deletion. | Completes CRUD. Needs: a delete control (not in the current design — new affordance in the editor and/or on the card), a confirmation step (destructive/irreversible), and a category note-count decrement on removal. Backend: `DELETE` on the note resource. Additive slice, outside the client's stated requirements. |

## Out of Scope

Excluded unless later requested — absent from narration, design, and
stakeholder direction; adding them would invent scope:

- **Category management** (create/rename/delete/recolor) — fixed set of three,
  no UI.
- **Search, tags, pinning, archiving, attachments, sort controls** beyond the
  single category filter.
- **Sharing / collaboration / multi-user.**
- **Mobile / responsive layouts** — no non-desktop frames (NFR-01).
- **Sync / multi-device / offline.**
- **Notifications / reminders.**
- **Accessibility & i18n targets** — none stated; flag given the "for everyone"
  framing.
