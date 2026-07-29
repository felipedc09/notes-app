# Categories Domain Spec

## Goal
Implement category management for notes-app MVP covering FR-07, FR-18, FR-19 with resolved decision A3 and NFR-05 (server-side counts).

## Testable Acceptance Criteria

### FR-07: Category seeding
- **Given** a new user signs up
- **When** their account is created
- **Then** the system shall automatically seed exactly three categories:
  - Random Thoughts (color: #ef9c66)
  - School (color: #fcdc94)
  - Personal (color: #78aba8)
- **And** each category shall be associated with the user's account
- **And** categories shall be persisted server-side via Django ORM

### FR-18: Dashboard sidebar UI
- **Given** the user is on the dashboard
- **When** the dashboard loads
- **Then** it shall render a left sidebar
- **And** the sidebar shall list "All Categories" as the first item
- **And** the sidebar shall list each of the user's three categories
- **And** each category entry shall show a color dot matching the category color (NFR-06)
- **And** each category name shall be displayed
- **And** when a category has ≥1 note, it shall display the count in parentheses
- **And** when a category has 0 notes, the count shall be hidden (Decision A3)

### FR-19: Category filtering
- **Given** the user is on the dashboard with multiple categories and notes
- **When** the user selects "All Categories"
- **Then** all notes across all categories shall be displayed
- **And** the "All Categories" item shall be highlighted as active
- **And** when the user selects a specific category (Random Thoughts, School, or Personal)
- **Then** only notes belonging to that category shall be displayed
- **And** other categories' notes shall be hidden
- **And** the selected category item shall be highlighted as active

## Resolved Decisions Applied

### A3: Sidebar counts at zero
- **Hide zero counts:** When a category has 0 notes, no count is displayed
- **Show counts when ≥1:** When a category has 1 or more notes, count appears in parentheses
- **Matches design:** This aligns with the empty-state frame where category names appear without counts
- **User experience:** Users focus on category names and colors, not empty-zero states

### NFR-05: Server-side category note counts
- **Django ORM aggregation:** Note counts computed via Django ORM
- **Single source of truth:** Counts derived server-side, not client-side
- **Consistency guarantee:** All components see the same note counts
- **Performance:** Efficient SQL aggregation queries

## Technical Constraints
- **Fixed category set:** Exactly three categories, no user-manageable creation/renaming
- **Colors fixed:** Per NFR-06: #ef9c66 (Random Thoughts), #fcdc94 (School), #78aba8 (Personal)
- **Category ownership:** Categories belong to individual users only
- **No CRUD:** Categories are seeded once per user, not editable by users

## API Implications
- **Categories endpoint:** `GET /api/categories` returns user's three categories with colors
- **Counts endpoint:** `GET /api/categories/{id}/count` returns note count for a specific category
- **Filter endpoint:** `GET /api/notes?categoryId={id}` filters notes by category (FR-19)
- **Response format:** JSON with category name, color, and optional count (when ≥1)

## Testable Behaviors

### Category Seeding Tests
1. **New user sign-up:** Verify exactly 3 categories created per user
2. **Category persistence:** Verify categories survive user logout/login
3. **Category colors:** Verify colors match specification (hex codes)
4. **Unique ownership:** Verify categories don't leak between users

### Sidebar UI Tests
1. **Empty state:** Verify sidebar renders colors + names without counts when 0 notes
2. **Non-empty state:** Verify sidebar renders colors + names + counts when ≥1 note
3. **All Categories item:** Verify "All Categories" always visible and functional
4. **Active state:** Verify visually selected category/item is highlighted

### Filtering Tests
1. **All categories filter:** Verify all notes displayed when "All Categories" selected
2. **Specific category filter:** Verify only relevant notes displayed per category
3. **Filter persistence:** Verify filter state maintained across interactions
4. **Empty filter results:** Verify appropriate empty state when filtered category has no notes

## Performance Considerations
- **Efficient queries:** Use Django ORM with proper indexing
- **Count aggregation:** Single SQL query for all category counts
- **Client caching:** Minimal client-side data duplication
- **SSR/SSG:** Leverage Next.js for initial sidebar rendering

## Monitoring and Observability
- **Category creation:** Track category seeding events
- **Count accuracy:** Verify server-side count matches actual note counts
- **Filter performance:** Monitor filtering query execution times
- **Error rates:** Track any category-related API errors

## Security Considerations
- **Category ownership:** Ensure users can't access other users' categories
- **Data isolation:** Categories properly scoped to authenticated user sessions
- **Idempotent seeding:** Multiple category seeding attempts don't create duplicates