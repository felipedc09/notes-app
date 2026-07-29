# SDD Proposal: notes-app MVP

## Goal
Define scope and implementation slice plan for notes-app MVP based on REQUIREMENTS.md v5.

## Scope Overview

**Included Requirements:**
- **27 Functional Requirements (FRs):** All FR-01 through FR-27 as defined in REQUIREMENTS.md
- **8 Non-Functional Requirements (NFRs):** NFR-01 through NFR-08 as defined in REQUIREMENTS.md

**Explicitly Excluded:**
- **Out of Scope items:** Category management, search, tags, pinning, archiving, attachments, multi-user, responsive layouts, sync/offline, notifications, accessibility/i18n
- **WL-01:** Note deletion (marked as wishlist/enhancement, not client scope)

## Slice Plan

### Phase 1: Authentication (FR-01..FR-06)
- **Sign-up screen** (FR-01): Email/password fields, "Yay, New Friend!" header
- **Login screen** (FR-02): Email/password fields, "Yay, You're Back!" header
- **Password visibility toggle** (FR-03): Eye icon for masking/unmasking
- **Account creation** (FR-04): User creation from entered credentials
- **Session authentication** (FR-05): Server-side session establishment
- **Navigation links** (FR-06): Sign-up↔login screen linking

### Phase 2: Categories (FR-07)
- **Seed default categories** (FR-07): Exactly three categories:
  - Random Thoughts
  - School
  - Personal

### Phase 3: Notes CRUD-minus-delete (FR-09..FR-17, FR-24..FR-27)
- **Note creation** (FR-09): "New Note" button with + pill icon
- **Note persistence** (FR-10): Auto-save on creation via backend
- **Note data model** (FR-11): Title, Markdown content, single category
- **New note placeholders** (FR-12): "Note Title", "Pour your heart out…"
- **Last Edited timestamps** (FR-13): Per-note modification tracking
- **Editor timestamp format** (FR-14): "Last Edited: {Month D, YYYY} at {h:mm am/pm}"
- **Category selection** (FR-15): Single-select dropdown for three categories
- **Category coloring** (FR-16): Background + border with category colors
- **Close control** (FR-17): Top-right editor close button returning to list
- **Note viewing/editing** (FR-24): Click card to open for inline editing
- **Auto timestamp updates** (FR-25): Real-time editing timestamp updates
- **Markdown rendering** (FR-26): Formatted output in cards/ read view
- **Empty note discard** (FR-27): Auto-discard if title and content empty

### Phase 4: Dashboard (FR-18..FR-23)
- **Dashboard UI** (FR-18): Left sidebar with "All Categories" + category list
- **Sidebar content** (FR-18): Color dot + category name + note count
- **Category filtering** (FR-19): Select category to filter notes, "All Categories" for all
- **Note preview cards** (FR-20): Show date, category name, title, content preview
- **Title wrapping** (FR-21): Full title display, content preview truncation with ellipsis
- **Smart date formatting** (FR-22): "today"/"yesterday" for current/prior day, "Month D" otherwise
- **Note ordering** (FR-23): Last Edited timestamp, most recent first

## Decisions Needed (Open Questions)

### Q1: Auth Details
**Status:** Strategy decided (session) — still missing:
- Password rules/validation requirements
- Email verification flow (if any)
- Password reset functionality

### Q2: Sign-up CTA Label and Post-Auth Landing
**Status:** Unconfirmed — need to determine:
- Exact sign-up button/label text for login screen
- Post-authentication landing page/redirect behavior

### Q3: API Contract
**Status:** Unspecified — still to define:
- Endpoint shapes for auth, notes, categories operations
- Pagination parameters for notes grid API
- Any additional API response formats or error handling

## Decisions Needed (Ambiguities)

### A1: Date Casing Consistency
**Ambiguity:** Narration uses "Today"/"Yesterday" while design renders "today"/"yesterday" (FR-22). Need to confirm:
- Intended casing for day-of-week labels
- Whether to follow narrative convention or design implementation

### A2: Dual Timestamp Formats
**Ambiguity:** Two different timestamp formats exist:
- Card preview: relative format or "Month D" (no year)
- Editor: "Last Edited: Month D, YYYY at h:mm am/pm"
Need to confirm both formats are acceptable/required

### A3: Sidebar Count Display
**Ambiguity:** Category sidebar counts on empty state unclear:
- Are zero counts displayed as "0" or hidden entirely
- Expected user experience when categories exist but have no notes

## Implementation Priorities

1. **Security first:** Session auth, password hashing, CSRF protection
2. **Core functionality:** Basic CRUD, category system, smart filtering
3. **User experience:** Smart date formatting, auto-save, empty state handling
4. **Design consistency:** Color tokens, typography, layout per NFR-06/07
5. **Performance:** Server-side category counts, efficient filtering

## Next Steps

- Resolve the 6 decisions needed (3 open questions + 3 ambiguities)
- Begin sdd-implement phase for auth slice (Phase 1)
- Establish API contract before frontend implementation
- Design data models based on specifications