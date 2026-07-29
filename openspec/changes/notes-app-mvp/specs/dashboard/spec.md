# Dashboard Domain Spec

## Goal
Implement dashboard functionality for notes-app MVP covering FR-08 (empty state) and FR-20 through FR-23 (cards, date formatting, ordering) with resolved decision A1 (lowercase today/yesterday).

## Testable Acceptance Criteria

### FR-08: Empty state
- **Given** the user has no notes
- **When** the dashboard loads
- **Then** the system shall show an empty state
- **And** the empty state shall display the message "I'm just here waiting for your charming notes…"
- **And** the empty state shall include an illustration
- **And** the sidebar shall show the three categories (Random Thoughts, School, Personal) with their color dots but no note counts (0 counts hidden per A3)
- **And** there shall be no note cards visible

### FR-20: Note preview cards
- **Given** the user has notes in the system
- **When** the dashboard renders the notes list
- **Then** each note shall be rendered as a preview card
- **And** each card shall show the date of the note
- **And** each card shall show the category name of the note
- **And** each card shall show the title of the note
- **And** each card shall show a content preview of the note
- **And** cards shall be arranged in order of Last Edited timestamp, most recent first (FR-23)

### FR-21: Title wrapping and content preview truncation
- **Given** a note with a long title is displayed in a preview card
- **When** the card renders
- **Then** the full title shall be displayed without truncation
- **And** when the content preview overflows its container
- **Then** it shall be truncated with an ellipsis ("")

### FR-22: Smart date formatting
- **Given** a note with a date is displayed in a preview card
- **When** the card renders the date
- **Then** if the date is the current day, it shall display "today"
- **And** if the date is the previous day, it shall display "yesterday"
- **And** for any other date, it shall display "Month D" without a year (e.g., "July 21")
- **And** the date formatting shall be lowercase ("today"/"yesterday") per Decision A1
- **And** this formatting applies only to preview cards, not editor timestamps (FR-14)

### FR-23: Note ordering
- **Given** the user is viewing the dashboard
- **When** notes are fetched from the backend
- **Then** notes shall be ordered by lastEdited timestamp
- **And** the most recently edited notes shall appear first
- **And** notes with the same lastEdited timestamp shall maintain stable order
- **And** ordering shall work in conjunction with category filtering (FR-19)

## Resolved Decisions Applied

### A1: Date casing consistency (lowercase today/yesterday)
- **Card dates:** Display "today"/"yesterday" (lowercase) per design visual truth
- **Editor dates:** Display "Last Edited: Month D, YYYY at h:mm am/pm" (FR-14)
- **No contradiction:** Different surfaces have appropriate density for their context
- **Follows design:** Implements the design's visual truth over narration

## Technical Constraints
- **Platform:** Desktop web only (1280×832, NFR-01)
- **Card layout:** Fixed left sidebar with category filtering, right side main grid
- **Date handling:** Dates are relative for current/prior day, otherwise month+day
- **Content preview:** Raw Markdown preview, formatted for display in cards
- **Order preservation:** Maintains Last Edited ordering across all operations

## API Implications
- **Notes listing:** `GET /api/notes?categoryId={id}` returns notes with metadata
- **Response format:** JSON array with note objects containing:
  - id, title, content (Markdown), categoryId
  - lastEdited (ISO date string for processing)
  - categoryName (for card display)
- **Date processing:** Backend can provide both raw ISO dates and formatted strings
- **Ordering query:** `ORDER BY lastEdited DESC` in SQL

## Testable Behaviors

### Empty State Tests
1. **No notes scenario:** Verify empty state displays when user has 0 notes
2. **Message display:** Verify "I'm just here waiting for your charming notes…" message appears
3. **Illustration presence:** Verify empty state includes visual illustration
4. **Category sidebar:** Verify sidebar shows 3 categories with colors but no counts
5. **No cards:** Verify zero note cards displayed

### Card Display Tests
1. **Card structure:** Verify each note renders as a preview card
2. **Card content:** Verify all required fields (date, category, title, preview) appear
3. **Card ordering:** Verify cards ordered by lastEdited DESC
4. **Category filtering:** Verify only filtered notes displayed per category selection

### Date Formatting Tests
1. **Today format:** Verify "today" displays for current day notes
2. **Yesterday format:** Verify "yesterday" displays for prior day notes
3. **Month D format:** Verify "Month D" displays for older notes
4. **Case sensitivity:** Verify lowercase today/yesterday (no capital letters)
5. **No year:** Verify Month D format doesn't include year

### Edge Cases and Error Conditions
1. **Future dates:** Verify graceful handling of notes with future lastEdited dates
2. **Same day:** Verify today/yesterday logic works correctly across day boundaries
3. **Empty content:** Verify cards display appropriately when note content is empty
4. **Category changes:** Verify cards update category coloring when note category changes

## Performance Considerations
- **Card rendering:** Efficient SSR/SSG for initial page load
- **Date processing:** Pre-format dates on server to reduce client processing
- **Ordering optimization:** Indexed database queries for lastEdited sorting
- **Filtering efficiency:** Server-side filtering reduces client-side processing
- **Empty state optimization:** Lightweight rendering when no notes exist

## Monitoring and Observability
- **Card rendering performance:** Track initial dashboard load times
- **Date formatting accuracy:** Verify correct date formatting across different scenarios
- **Empty state usage:** Monitor how often users encounter empty state
- **Filtering performance:** Track category filtering response times
- **Ordering verification:** Ensure notes maintain correct lastEdited ordering

## User Experience Considerations
- **Visual hierarchy:** Cards provide clear note organization and quick scanning
- **Date familiarity:** Relative dates help users quickly understand note recency
- **Empty state encouragement:** Supportive messaging encourages note creation
- **Category context:** Color coding helps users quickly identify note categories

## Accessibility Considerations
- **Screen reader support:** Ensure date and content information is verbally announced
- **Keyboard navigation:** Support keyboard navigation through cards and categories
- **Color contrast:** Ensure category colors meet contrast requirements for text
- **Semantic HTML:** Use proper HTML elements for card structure and metadata

## Design Consistency
- **Visual design:** Cards follow NFR-06 design tokens (radius 11px, shadow 1px 1px 2px)
- **Typography:** NFR-07 specifies Inria Serif for titles, Inter for body text
- **Color scheme:** Fixed color palette per NFR-06 with category-specific colors
- **Layout:** Fixed desktop layout with 1280×832 viewport (NFR-01)