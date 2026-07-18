# Module Spec: Authentication

## Overview

Authentication manages user identity and session lifecycle. It uses **Better Auth** with email/password auth, cookie-based sessions, and route-level guards for guest vs. protected areas. OAuth (Google) is a future concern — the UI buttons exist but are disabled.

## Design Decisions

### Better Auth as Auth Provider

Better Auth handles credential storage, password hashing, session token generation, and verification flows. It integrates with Drizzle ORM and Cloudflare D1 (SQLite) via the `drizzleAdapter`. This avoids building custom crypto/session logic.

### Cookie-Based Sessions

Sessions are stored in HTTP-only cookies via `tanstackStartCookies()`. The cookie is set automatically by Better Auth on sign-in and cleared on sign-out. No token juggling in JS — the server reads the cookie from request headers.

### Email/Password as Primary (OAuth as Future)

Only email/password is enabled. Google OAuth buttons are rendered but **disabled** — they serve as a visual placeholder. Once an OAuth provider is configured in Better Auth, the buttons become active with no additional front-end changes.

### Full Name Storage

The DB stores a single `name` column (`"Clark Tolosa"`). The register form splits it into `firstName` / `lastName` for UX, then concatenates before sending to the API. This avoids two columns when only one display name is needed post-signup.

### Server-Side Route Guards

Authentication checks happen in `beforeLoad` hooks, **not** in client-side state. Every navigation re-verifies the session by calling `auth.api.getSession()` with the request cookie. This prevents stale client state from bypassing auth.

**Guest layout (`/`, `/register`):** If session exists, redirect to `/dashboard`.

**Protected layout (`/dashboard`, `/accounts/*`, etc.):** If no session, redirect to `/`.

### Auth Middleware for Server Functions

Server functions that require authentication (e.g., `signOutUser`, `getBankAccounts`) use `authMiddleware`. This extracts the session from request headers and throws `"Unauthorized"` if invalid, preventing unauthorized RPC calls.

### Error Handling Philosophy

Better Auth errors are returned as thrown exceptions from server functions. The front-end catches these and displays them as inline form errors or toasts. No custom error mapping is done — Better Auth messages are user-friendly enough.

---

## Data Model

| Table           | Purpose                | Key Columns                                                                                                                |
| --------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `users`         | User identity          | `id` (PK), `name`, `email` (unique), `emailVerified`, `image`                                                              |
| `sessions`      | Active sessions        | `id` (PK), `token` (unique), `expiresAt`, `userId` (FK → users)                                                            |
| `accounts`      | Auth provider accounts | `id` (PK), `accountId`, `providerId` ("email" or "google"), `userId` (FK → users), `password` (hashed, for email provider) |
| `verifications` | Verification tokens    | `id` (PK), `identifier`, `value`, `expiresAt` (used by Better Auth for email verification / password reset)                |

---

## User Flows

### 1. Sign Up (Register)

**Trigger:** User clicks "Sign Up" link on the login page or navigates to `/register` while unauthenticated.

**Form:**
| Field | Type | Default | Required | Constraints |
|-------|------|---------|----------|-------------|
| First Name | text | — | yes | 1–50 chars, trimmed |
| Last Name | text | — | yes | 1–50 chars, trimmed |
| Email | email | — | yes | valid email format, lowercased, trimmed |
| Password | password | — | yes | 8–128 chars |
| Confirm Password | password | — | yes | must match Password |

**Behavior on submit:**

1. Validate all fields on blur (Zod schema).
2. On form submit, call `signUpUser` server function with `{ firstName, lastName, email, password }`.
3. `signUpUser` calls `auth.api.signUpEmail()` which hashes the password, creates a `users` row and an `accounts` row (provider = "email"), and starts a session.
4. On success, navigate to `/dashboard` (replace history).
5. On failure, catch the error and display it.

**Validation rules (from `signUpUserSchema`):**
| Field | Rule | Error Message |
|-------|------|---------------|
| firstName | z.string().trim().min(1).max(50) | "First name is required" / "First name must be at most 50 characters" |
| lastName | z.string().trim().min(1).max(50) | "Last name is required" / "Last name must be at most 50 characters" |
| email | z.email().toLowerCase().trim().min(1) | "Please enter a valid email address" / "Email is required" |
| password | z.string().min(8).max(128) | "Password must be at least 8 characters" / "Password must be at most 128 characters" |
| confirmPassword | z.string().min(1) + .refine(matches password) | "Please confirm your password" / "Passwords do not match" |

**Edge cases:**

- **Email already registered** → Better Auth throws `"User already exists with this email"`. Display as inline or toast error.
- **Passwords do not match** → Blocked by Zod `.refine()` on `confirmPassword`. Inline error on Confirm Password field.
- **Password too short/long** → Blocked by Zod `min(8)` / `max(128)`. Inline error on Password field.
- **Very long name** → Blocked by Zod `max(50)`. Inline error on the respective name field.
- **Network error / server down** → Server function throws. Catch and show toast "Something went wrong. Please try again."
- **User navigates away during submission** → Form state is lost; no partial registration.
- **Rapid duplicate submissions** → Button is disabled during submission (loading state prevents double-fire).

**UI States:**

- **Idle** — Form ready to fill. All fields empty.
- **Validating** — Fields show inline errors on blur (not on every keystroke).
- **Submitting** — "Create Account" button shows a spinner and is disabled.
- **Server error** — Toast or inline error from Better Auth (e.g., "User already exists with this email").
- **Success** — Redirect to `/dashboard`.

---

### 2. Sign In (Login)

**Trigger:** User navigates to `/` (root route) while unauthenticated. Guest layout redirects authenticated users away.

**Form:**
| Field | Type | Default | Required | Constraints |
|-------|------|---------|----------|-------------|
| Email | email | — | yes | valid email format, lowercased, trimmed |
| Password | password | — | yes | 8–128 chars |

**Behavior on submit:**

1. Validate fields on blur (Zod schema).
2. Call `signInUser` server function with `{ email, password }`.
3. `signInUser` calls `auth.api.signInEmail()` which verifies credentials and sets a session cookie.
4. On success, navigate to `/dashboard` (replace history).
5. On failure, catch the error and display it.

**Validation rules (from `signInUserSchema`):**
| Field | Rule | Error Message |
|-------|------|---------------|
| email | z.email().toLowerCase().trim().min(1) | "Please enter a valid email address" / "Email is required" |
| password | z.string().min(8).max(128) | "Password must be at least 8 characters" / "Password must be at most 128 characters" |

**Edge cases:**

- **Wrong email or password** → Better Auth throws `"Invalid email or password"`. Display as inline error above the form. Do **not** reveal whether the email exists (security best practice).
- **Account does not exist** → Same generic error: "Invalid email or password".
- **Empty fields** → Blocked by Zod `min(1)`. Inline errors.
- **White space only** → `trim()` converts email to empty → "Email is required".
- **Network error / server down** → Toast "Something went wrong. Please try again."
- **Already authenticated user visits `/`** → Guest layout's `beforeLoad` redirects to `/dashboard`. No sign-in form shown.
- **Session expired during login attempt** → Irrelevant; login creates a new session.

**UI States:**

- **Idle** — Form ready to fill.
- **Submitting** — "Login" button shows a spinner, fields disabled.
- **Validation error** — Inline messages on email/password fields.
- **Server error** — "Invalid email or password" shown as a general form error or toast.
- **Success** — Redirect to `/dashboard`.

---

### 3. Sign Out (Logout)

**Trigger:** User clicks "Sign Out" in the sidebar footer dropdown menu.

**Flow:**

1. Dropdown menu is always visible in the sidebar (user info + "Sign Out" item).
2. User clicks "Sign Out".
3. Call `signOutUser` server function (guarded by `authMiddleware` — session must be valid).
4. `signOutUser` calls `auth.api.signOut()` which clears the session cookie server-side.
5. On the client, clear the TanStack Query cache (`queryClient.clear()`).
6. Navigate to `/` (replace history).

**Edge cases:**

- **Session already expired** → `authMiddleware` throws `"Unauthorized"`. The client catches this, clears cache, and navigates to `/` anyway — the user ends up on the login page regardless.
- **Network error during sign out** → Catch error, show toast "Failed to sign out. Try again." User is still on protected page; retry works.
- **Double-click on Sign Out** → First call invalidates session; second call hits `authMiddleware` which throws → treated as expired-session case.
- **Multiple tabs** → Signing out in one tab clears the server session. Other tabs will fail on their next server function call (e.g., navigation, data fetch) and should redirect to `/`.

**UI States:**

- **Idle** — Dropdown menu visible, "Sign Out" item clickable.
- **Submitting** — Dropdown closes or "Sign Out" shows spinner.
- **Error** — Toast "Failed to sign out. Try again."
- **Success** — Redirect to `/`. Sidebar no longer renders (guest layout).

---

### 4. Route Protection (Session Guard)

**Trigger:** Occurs automatically on **every** navigation to a guest or protected route.

**Guest Layout** (`_guest.tsx`):

```
beforeLoad:
  session = getSession()
  if session exists → redirect to /dashboard
```

Applied to: `/`, `/register`

**Protected Layout** (`_protected.tsx`):

```
beforeLoad:
  session = getSession()
  if no session → redirect to /
  return { user: session.user }
```

Applied to: `/dashboard`, `/accounts/*`, and all other authenticated routes.

**Auth Middleware** (`middlewares.ts`):
Used by server functions (`signOutUser`, `getBankAccounts`, etc.):

```
headers = getRequestHeaders()
session = auth.api.getSession({ headers })
if no session → throw "Unauthorized"
```

**Behavior:**

- Both layouts call `getSession()` on the server, which reads the cookie from request headers.
- Guest layout: if session exists, throw `redirect` to `/dashboard`.
- Protected layout: if no session, throw `redirect` to `/`.
- Protected layout passes `{ user: session.user }` to child routes via context.

**Edge cases:**

- **Session expired mid-session** → The next server function call (e.g., loading accounts) will fail with `"Unauthorized"`. The client should catch this and redirect to `/`. (Not currently implemented — to be added.)
- **Direct URL access** → User types `/dashboard` in URL bar. The `beforeLoad` hook runs server-side and redirects if not authenticated.
- **First paint flash** → Both layouts use SSR with data: guest is `ssr: false`, protected is `ssr: "data-only"`. No flash of protected content.
- **Cookie tampered** → Better Auth validates the session signature; invalid cookies result in `null` session → redirect to `/`.

**UI States:**

- **Loading** — Layout shows nothing (or a brief loading state) while `beforeLoad` resolves.
- **Redirect** — Instant redirect via `throw redirect(...)`. No intermediate UI.
- **Error** — If `getSession()` itself fails (network), the page should show an error state. (Not currently implemented — to be added.)

---

### 5. OAuth — Google (Future / Placeholder)

**Trigger:** User clicks "Login with Google" or "Sign up with Google" button on `/` or `/register`.

**Current state:** The buttons exist but are **disabled** (`<Button disabled>`). No OAuth provider is configured in Better Auth.

**Form element:**

```
[Login with Google]   ← disabled, no onClick handler
[Sign up with Google] ← disabled, no onClick handler
```

**Future behavior (when OAuth is configured):**

1. User clicks Google button.
2. Navigate to `POST /api/auth/$` with the Google OAuth provider.
3. Better Auth redirects to Google's consent screen.
4. On callback, Better Auth creates/links account and sets session cookie.
5. Redirect to `/dashboard`.

**Edge cases (future):**

- **Account already exists with same email** → Better Auth links the OAuth account to the existing user.
- **OAuth popup blocked** → Should use full-page redirect instead of popup.
- **OAuth provider down** → Show error toast "Google login is unavailable. Try again later."
- **User cancels OAuth flow** → Returned to login/register page with no error.

**UI States:**

- **Idle** — Google button visible but disabled.
- **Enabled (future)** — Google button clickable; shows spinner during redirect.

---

## Suggested Routes

| Route         | Page                          | Layout    | Auth Required         |
| ------------- | ----------------------------- | --------- | --------------------- |
| `/`           | Login page                    | Guest     | No (redirects if yes) |
| `/register`   | Register page                 | Guest     | No (redirects if yes) |
| `/dashboard`  | Dashboard                     | Protected | Yes                   |
| `/accounts/*` | Accounts (and other features) | Protected | Yes                   |
| `/api/auth/$` | Better Auth API proxy         | Public    | Varies by endpoint    |

---

## Future Considerations

- **Password Reset** — Better Auth supports it natively. Add a "Forgot password?" link on the login form, enable the feature in the Better Auth config, and wire up the reset-password page. The `verifications` table already exists.
- **Email Verification** — Better Auth supports it natively. Enable in config, add a "Verify email" flow post-registration. The `emailVerified` column and `verifications` table already exist.
- **OAuth Providers** — Google, GitHub, etc. Add provider ID and client secret to Better Auth config. Remove `disabled` from buttons. The `accounts` table already supports multiple providers per user.
- **Session Expiry Handling** — Currently, expired sessions throw raw errors. Add a global error boundary or TanStack Query mutation hook that catches `"Unauthorized"` and redirects to `/`.
- **Avatar Images** — Currently a placeholder. OAuth providers return an `image` URL; wire this into the sidebar avatar and user profile.
- **Account Settings** — A dedicated page to change name, email, and password.
