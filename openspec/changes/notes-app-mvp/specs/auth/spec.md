# Auth Domain Spec

## Goal
Implement authentication for notes-app MVP covering FR-01 through FR-06 with resolved decisions Q1 and Q2.

## Testable Acceptance Criteria

### FR-01: Sign-up screen
- **Given** the user is on the sign-up screen
- **When** the page loads
- **Then** it shall present "Email address" and "Password" fields
- **And** the screen shall be headed "Yay, New Friend!"
- **And** the form shall include a "Sign Up" button (Q2 decision)

### FR-02: Login screen
- **Given** the user is on the login screen
- **When** the page loads
- **Then** it shall present "Email address" and "Password" fields
- **And** the screen shall be headed "Yay, You're Back!"
- **And** the form shall include a "Login" button

### FR-03: Password visibility toggle
- **Given** the user is on either sign-up or login screen
- **When** the password field contains text
- **Then** an eye icon shall appear on the password field
- **And** clicking the eye icon shall toggle password visibility between masked and visible

### FR-04: Account creation
- **Given** a user enters valid email and password on sign-up
- **When** they submit the form
- **Then** the system shall create an account with that email and password
- **And** the account shall be created using Django's password hashing (Q1 decision)
- **And** no email verification flow shall be performed (Q1 decision)

### FR-05: Session authentication
- **Given** a user enters valid credentials on login
- **When** they submit the form
- **Then** the system shall authenticate them against stored credentials
- **And** a server-side Django session shall be established
- **And** the session shall be protected with httpOnly, Secure, and SameSite=Lax cookie attributes (NFR-04)
- **And** CSRF protection shall be enabled for unsafe methods

### FR-06: Navigation links
- **Given** the user is on the sign-up screen
- **When** they look for navigation
- **Then** they shall see a link to login screen with text "We're already friends!"
- **And** the user clicking this link shall be taken to the login screen
- **And** the user clicking this link shall see "Oops! I've never been here before" displayed
- **And** when on the login screen, the user shall see "Oops! I've never been here before" with link to sign-up

## Resolved Decisions Applied

### Q1: Auth Details (Minimal approach)
- **Password validation:** Use Django's default `AUTH_PASSWORD_VALIDATORS`
- **No email verification:** Omitted per demo/design scope
- **No password-reset:** Omitted per demo/design scope
- **Built on Django auth:** Leveraging Django's secure password hashing and validation

### Q2: CTA Label and Landing
- **Sign-up button:** Displayed as "Sign Up" (confirmed assumption 7)
- **Post-auth landing:** Dashboard at `/` in "All Categories" unfiltered state
- **Login redirect:** Both sign-up and login redirect to same dashboard

## Security Constraints
- **Password hashing:** Django's built-in hashing (secure)
- **Session cookies:** httpOnly, Secure, SameSite=Lax
- **CSRF protection:** Enabled for POST/PUT/DELETE/PATCH methods
- **No plaintext passwords:** All passwords stored hashed

## Technical Constraints
- **Same-origin deployment:** Session cookies work without CORS credential dance (NFR-02)
- **Django session auth:** Server-side sessions as architectural requirement
- **No email flow:** Minimal scope focused on core authentication MVP

## API Implications
- **Auth endpoints:** `/api/auth/signup` and `/api/auth/login`
- **Session management:** Cookie-based sessions via Django
- **No pagination:** Single-user scope, no pagination for auth endpoints
- **Error handling:** Standard Django authentication error responses

## Performance Considerations
- **Fast authentication:** Leverages Django's optimized auth system
- **Cookie efficiency:** Lightweight session cookie
- **No database overhead:** Minimal additional infrastructure required

## Monitoring and Observability
- **Login attempts:** Track authentication success/failure rates
- **Session longevity:** Monitor session expiration and renewal patterns
- **Security events:** Alert on unusual authentication patterns