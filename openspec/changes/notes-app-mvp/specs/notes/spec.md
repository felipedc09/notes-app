# Notes Domain Spec

## Goal
Implement notes management for notes-app MVP covering FR-09 through FR-17, FR-24 through FR-27 with resolved decision A2 (dual timestamp formats).

## Testable Acceptance Criteria

### FR-09: Note creation
- **Given** the user is on the dashboard
- **When** the user clicks the "New Note" button (pill, top-right, "+" icon)
- **Then** a new note shall be created instantly
- **And** the note shall be persisted via the backend with no manual save action
- **And** the note shall be assigned the category selected in the editor's dropdown
- **And** the note shall receive a unique ID and ownership linked to the authenticated user

### FR-10: Note persistence
- **Given** a new note is created via the "New Note" button
- **When** the note creation request is made to the backend
- **Then** the note shall be immediately persisted in the database
- **And** subsequent page loads shall show the note in the appropriate category
- **And** no additional user interaction (like clicking save) shall be required

### FR-11: Note data model
- **Given** a note exists in the system
- **When** the note is created or retrieved
- **Then** the note shall contain:
  - A title (string)
  - Content body (text) containing Markdown source
  - Reference to exactly one category (categoryId)
  - Last edited timestamp (date and time)
  - Unique ID and user ownership
- **And** all fields shall be validated server-side

### FR-12: New note placeholders
- **Given** a new note is created via the "New Note" button
- **When** the note editor loads
- **Then** the note title field shall contain placeholder text "Note Title"
- **And** the note content field shall contain placeholder text "Pour your heart out…"
- **And** placeholders shall be cleared when user begins editing

### FR-13: Last edited timestamps
- **Given** a note is created or modified
- **When** the title or content changes
- **Then** the note's lastEdited timestamp shall be updated to the current date and time
- **And** this timestamp shall be stored in both date and time components

### FR-14: Editor timestamp format
- **Given** a note is open in the editor
- **When** the timestamp is displayed
- **Then** it shall render as "Last Edited: {Month D, YYYY} at {h:mm am/pm}"
- **And** this shall be right-aligned in the editor
- **And** examples include "Last Edited: July 21, 2024 at 8:39pm"

### FR-15: Category selection
- **Given** a note is open in the editor
- **When** the user interacts with the category control
- **Then** a single-select dropdown shall appear
- **And** the dropdown shall list the three categories: Random Thoughts, School, Personal
- **And** the user shall be able to select exactly one category
- **And** the selected category shall determine the note's category

### FR-16: Category coloring
- **Given** a note is either previewed in a card or open in editor
- **When** the note is rendered
- **Then** the note's background shall be filled with its category color at ~50% opacity
- **And** a 3px solid border of the category color shall be displayed
- **And** the same styling shall apply to both preview cards and full editor

### FR-17: Editor close control
- **Given** a note is open in the editor
- **When** the user activates the top-right close control
- **Then** the note editor shall close
- **And** the user shall be returned to the notes list
- **And** the note shall remain persistent with all changes saved

### FR-24: Note viewing and editing
- **Given** the user is on the dashboard with notes listed
- **When** the user clicks on a note preview card
- **Then** the note shall open for viewing
- **And** the user shall be able to edit the title and content by clicking on the text
- **And** inline editing shall replace the static preview with editable fields

### FR-25: Auto timestamp updates
- **Given** a note is open for inline editing
- **When** the user edits the title or content
- **Then** the note's lastEdited timestamp shall update in real-time
- **And** the updated timestamp shall be immediately visible to the user
- **And** this shall happen automatically without additional user action

### FR-26: Markdown rendering
- **Given** a note is previewed in a card or read-only view
- **When** the note is rendered for display
- **Then** the Markdown content shall be formatted as HTML output
- **And** formatted elements (e.g., bullet lists) shall be visible
- **And** the raw Markdown source shall be used for authoring in the editor
- **And** no live-preview toolbar shall be present in the editor

### FR-27: Empty notes persist (v6 — reverses the original discard rule)
- **Given** the user clicks "New Note"
- **When** the editor opens
- **Then** the note record shall be created immediately via the backend
- **And** its Last Edited timestamp shall be server-derived and displayed at once
- **When** the user then closes the note with both title and content empty
- **Then** the note shall be kept, not discarded
- **And** the user shall still see the note when returning to the dashboard
- **And** the empty-guarded `DELETE` endpoint shall remain available but unused by the client

> Supersedes the original FR-27 ("empty note discard"). See `../../AMENDMENTS.md`.

## Resolved Decisions Applied

### A2: Dual timestamp formats
- **Card/preview format:** "today"/"yesterday" for current/prior day, "Month D" (no year) otherwise
- **Editor format:** "Last Edited: Month D, YYYY at h:mm am/pm", right-aligned
- **Both formats are intentional:** Different surfaces serve different density/purpose needs
- **No contradiction:** Card shows relative-friendly format, editor shows complete timestamp

## Technical Constraints
- **Content format:** All note bodies stored as Markdown (plain text)
- **Single category:** Each note belongs to exactly one of the three seeded categories
- **Auto-save:** No manual save actions required
- **Discard logic:** Empty notes automatically discarded

## API Implications
- **Create note:** `POST /api/notes` with title, content, categoryId
- **Update note:** `PUT /api/notes/{id}` with title, content
- **Get note:** `GET /api/notes/{id}` returns full note with Markdown content
- **List notes:** `GET /api/notes?categoryId={id}` filters by category
- **Response format:** JSON with note ID, title, content, categoryId, lastEdited

## Testable Behaviors

### Note Creation Tests
1. **Instant persistence:** Verify note appears immediately after creation (no page reload)
2. **Category assignment:** Verify new note assigned to selected category
3. **Placeholder behavior:** Verify placeholders disappear on edit start
4. **Auto-save verification:** Verify note survives page refresh without manual save

### Note Editing Tests
1. **Inline editing:** Verify clicking text allows inline editing
2. **Timestamp updates:** Verify real-time timestamp updates on editing
3. **Markdown rendering:** Verify formatted output in cards/read view
4. **Discard logic:** Verify empty notes are properly discarded

### UI/Interaction Tests
1. **Category coloring:** Verify background/border colors match category
2. **Close control:** Verify editor close returns to notes list
3. **Empty state:** Verify no persistence of empty notes
4. **Placeholder interaction:** Verify placeholders are editable

## Performance Considerations
- **Auto-save optimization:** Minimize server requests while ensuring data integrity
- **Markdown processing:** Efficient rendering for both preview and editor
- **Real-time updates:** Minimize timestamp update latency
- **Discard efficiency:** Quick validation and cleanup of empty notes

## Monitoring and Observability
- **Creation metrics:** Track note creation rates and persistence success
- **Editing patterns:** Monitor edit frequency and timestamp update accuracy
- **Discard events:** Track empty note discard rates for UX optimization
- **Performance:** Measure note creation/edit response times

## Security Considerations
- **Content validation:** Ensure Markdown content doesn't contain malicious scripts
- **Category access:** Verify notes can only be edited by their owning user
- **Input sanitization:** Basic validation on title and content fields
- **Rate limiting:** Prevent abuse of note creation/editing endpoints