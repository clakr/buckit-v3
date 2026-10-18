# Module Spec: Authentication

## Overview

Authentication is the identity layer every other module builds on: a User signs up or signs in with email/password, gets a Session, and every protected route/server function derives `userId` from that Session to scope its data. Built on [Better-Auth](https://www.better-auth.com/) (`^1.7.1`) with the Drizzle/SQLite adapter, plus its `tanstackStartCookies` plugin for SSR-safe cookie writes on TanStack Start. The app is designed to support multiple independent, isolated Users (not a single-operator tool) — see the `User` entry in [`CONTEXT.md`](../../../CONTEXT.md).

## Entity

Better-Auth owns these four tables; this app maps them to its own names via the Drizzle adapter config (`user`→`users`, `session`→`sessions`, `account`→`accounts`, `verification`→`verifications` in `integrations/better-auth/index.ts`).

### User

| Field           | Type     | Notes                                                                            |
| --------------- | -------- | -------------------------------------------------------------------------------- |
| `id`            | string   | primary key                                                                      |
| `name`          | string   | `"${firstName} ${lastName}"`, joined at sign-up — no separate first/last columns |
| `email`         | string   | unique                                                                           |
| `emailVerified` | boolean  | default `false`, never set `true` today (see Future Considerations)              |
| `image`         | string   | nullable, unused (no avatar upload UI)                                           |
| `createdAt`     | datetime |                                                                                  |
| `updatedAt`     | datetime |                                                                                  |

### Session

| Field       | Type     | Notes                                                                                                      |
| ----------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `id`        | string   | primary key                                                                                                |
| `token`     | string   | unique, the session cookie's value                                                                         |
| `expiresAt` | datetime | 7 days from creation — Better-Auth's built-in default; `session.expiresIn` is not set in this app's config |
| `userId`    | string   | FK → User, `onDelete: cascade`, indexed                                                                    |
| `ipAddress` | string   | nullable                                                                                                   |
| `userAgent` | string   | nullable                                                                                                   |
| `createdAt` | datetime |                                                                                                            |
| `updatedAt` | datetime |                                                                                                            |

No uniqueness constraint on `userId` — a User can hold multiple concurrent Sessions (e.g. phone and laptop signed in at once). This already works today; nothing extra was needed to support it.

### Auth Account (`accounts` table)

| Field                                                               | Type            | Notes                                                                |
| ------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------- |
| `id`                                                                | string          | primary key                                                          |
| `userId`                                                            | string          | FK → User, `onDelete: cascade`, indexed                              |
| `issuer` / `providerId`                                             | string          | for email/password today, both are effectively `"credential"`        |
| `accountId`                                                         | string          | unique with `issuer` — for credential auth, this is the User's email |
| `password`                                                          | string          | nullable — **holds the hashed password for email/password sign-up**  |
| `accessToken`/`refreshToken`/`idToken`/`scope`/token-expiry columns | string/datetime | nullable, unused today — reserved for OAuth providers                |
| `createdAt` / `updatedAt`                                           | datetime        |                                                                      |

See CONTEXT.md's `Auth Account` entry for the general definition. Worth calling out explicitly here since it's non-obvious: despite the entry's OAuth-flavored description (issuer, tokens, provider id), this table is also where Better-Auth stores the **password hash** for plain email/password sign-up — there is no separate "Credential" table. A User with only email/password auth still gets exactly one Auth Account row, with `password` set and every OAuth-only column `null`.

### Verification (`verifications` table)

| Field                     | Type     | Notes                           |
| ------------------------- | -------- | ------------------------------- |
| `id`                      | string   | primary key                     |
| `identifier`              | string   | indexed — e.g. an email address |
| `value`                   | string   | the token/code being verified   |
| `expiresAt`               | datetime |                                 |
| `createdAt` / `updatedAt` | datetime |                                 |

Schema exists but is currently unused end-to-end: nothing in this app writes or reads a Verification row today, because neither email verification nor password reset is wired up (see Future Considerations). Better-Auth would use this table for both once configured.

## Design Decisions

### Identity Middleware Is Separate From Ownership Middleware

`authMiddleware` (`src/modules/authentication/middlewares.ts`) does exactly one thing: ask the Session module for the signed-in User's id (`requireUserId`, which throws `UnauthorizedError` from `src/lib/errors.ts` without a Session) and pass it on as `context.userId`. It performs no resource-ownership checks. Every other module layers its own `verifyUser<Entity>Middleware` on top of this (e.g. `verifyUserBucketMiddleware`, `verifyUserAllocationMiddleware`) to confirm the _specific record_ being touched belongs to `context.userId`. This split is correct and consistent across the codebase — Authentication's job stops at "who is this," never "do they own this." Handlers behind an ownership middleware may read and write by id; see [ADR 0003](../../../docs/adr/0003-ownership-checked-by-middleware.md) before removing one.

### Route Guarding Pattern

Two route-tree layouts gate everything, through `src/modules/authentication/guards.ts`. `_guest.tsx`'s `beforeLoad` is `requireSignedOut`, which redirects to `/dashboard` if a Session exists (keeping signed-in users off login/register). `_protected.tsx`'s is `requireSignedIn`, which redirects to `/` if none exists and exposes `{ user }` (`id`, `name`, `email`) as route context for every nested route (consumed by `SidebarFooter`, etc.). Both read the Session through `sessionQueryOption()` (`query-options.ts`), cached until the Session module clears it on sign-in or sign-out, so navigating doesn't re-ask the server. `authMiddleware` remains the real check on every request.

### Sign-Out Flow

`signOutUser` is a plain Better-Auth `auth.api.signOut()` call behind `authMiddleware`, invalidating the Session server-side. On the client, every way in and out of a Session goes through `src/modules/authentication/session.tsx` (see the 2026-10-20 update below), which empties the TanStack Query cache on the way in and out. Query results are User-scoped and must not leak into whatever gets signed in next on the same device.

### No Rate Limiting Configured Explicitly

Better-Auth's built-in rate limiter defaults to **enabled only in production**, a 10-second window, max 100 requests, backed by **in-memory storage** unless a `secondaryStorage` is configured (checked directly in `node_modules/better-auth`, not asserted from docs). Nothing in `integrations/better-auth/index.ts` overrides this. On Cloudflare Workers, in-memory storage doesn't share state across isolates, so the effective protection against credential-stuffing/brute-force is weaker than the window/max numbers imply. Not fixed this session — flagged in Future Considerations since it wasn't part of the agreed audit scope, but it's a real gap worth a deliberate decision (e.g. `secondaryStorage` backed by KV/D1) rather than leaving it to an unverified default.

## Features

| #   | Feature                            | Status                                                                                                                                                                                                     |
| --- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Sign Up (email/password)           | **Implemented and correct.** First/last name, email, password (8–128 chars) + confirm-password match check.                                                                                                |
| 2   | Sign In (email/password)           | **Implemented and correct.**                                                                                                                                                                               |
| 3   | Sign Out                           | **Implemented and correct.** Invalidates Session server-side, clears client query cache.                                                                                                                   |
| 4   | Session retrieval / route guarding | **Implemented and correct.** `_guest`/`_protected` layouts both correctly gate on `getSession()`.                                                                                                          |
| 5   | Multi-device Sessions              | **Implemented and correct** (no extra work needed — schema already supports it).                                                                                                                           |
| —   | Google OAuth Sign-In               | **Not implemented.** UI button exists on both auth pages but is `disabled`; no provider configured server-side. Intentional placeholder for planned future work — see Future Considerations.               |
| —   | Email Verification                 | **Not implemented.** `emailVerified` column exists and is permanently `false`; no `requireEmailVerification`, no verification-email sending configured. Spec'd, not yet built — see Future Considerations. |
| —   | Forgot / Reset Password            | **Not implemented.** No reset-password route, no `sendResetPassword` configured. Spec'd, not yet built — see Future Considerations.                                                                        |
| —   | Account Settings Page              | **Not implemented.** "Account" item in the sidebar user menu exists but is `disabled`.                                                                                                                     |
| —   | Session Management (view/revoke)   | **Not implemented, not yet planned.** A User has no way to see or revoke other active Sessions, despite multi-device Sessions already working under the hood.                                              |

## Fixed During This Session

- **`schemas.ts` — dead email validation.** `email: z.email(...).min(1, "Email is required")` — `.min(1)` can never be the deciding check: any string that fails it (empty) already fails `.email()` first with a more specific message, and any string that passes `.email()` already satisfies `.min(1)`. Removed the unreachable bound.

## Updates

- **2026-10-20 — Authentication's failures, async pass.** Same pass every other module got. Sign Up, Sign In, Sign Out and route guarding (features 1–4) are unchanged; this is about what the user sees when something fails.
  - **Messages the user can act on:** `signInUser` turns Better-Auth's `INVALID_EMAIL_OR_PASSWORD` into an `AppError` ("Incorrect email or password."), and `signUpUser` turns `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` into a `ConflictError` ("An account with this email already exists. Try signing in."). The login and register pages toast "Failed to Sign In" / "Failed to Create Account" with that message, or a "Please try again." fallback for anything else. They used to show any error's raw message. A wrong password is deliberately not an `UnauthorizedError`, which means "your Session is gone" (below).
  - **An expired Session signs you out:** any query or mutation that fails with `UnauthorizedError` (from `authMiddleware`) sends the user to `/` with one "Signed Out" toast carrying the server's message, then clears the query cache. `getContext` in `src/integrations/tanstack-query/root-provider.tsx` takes an `onSessionExpired` callback, and `getRouter` (`src/router.tsx`) supplies it. Several failing queries produce one sign-out, and nothing runs on the server. The route guards still catch it on the next navigation; this covers a page that's already open, e.g. a dialog's query or a refetch on focus. Such a mutation doesn't also show its own failure toast.
  - **Signing out of an expired Session:** `SidebarFooter` treats an `UnauthorizedError` from `signOutUser` as already signed out and finishes leaving. Other failures toast "Failed to Sign Out", with Retry for a network error, instead of the raw message.
  - **App-wide fallbacks:** routes without their own screens (the guest pages, dashboard, about) used to show a bare "error" or "loading..." text. They now show `StateTemplate` screens: "Something went wrong" with an `AppError`'s message or a connection hint, and "Loading".
  - **Retry re-runs the load:** every route error screen's Retry is now `RouteRetryButton` (`src/components/route-retry-button.tsx`), which calls `router.invalidate()`. It used to call the error component's `reset`, which only clears the boundary, so the Accounts, Buckets and Debts pages (list and detail) showed the same error again even after the connection came back.
  - **Shared wording rule:** `describeErrorForUser(error, fallback)` in `src/lib/errors.ts` returns an `AppError`'s message or the fallback. The global mutation toast, sign-in, register and sign-out all use it.
  - `dashboard.tsx`'s own logout button is untouched, per the placeholder note under Future Considerations.

- **2026-10-20 — one module enters and leaves a Session.** Features 1–3 are unchanged. Each exit used to clear the query cache and navigate in its own way: the sidebar's Sign Out and the expired-Session handler did, the dashboard's logout button skipped the clear, and sign-in and sign-up assumed an empty cache. `src/modules/authentication/session.tsx` now owns all of it:
  - `signIn(router, data)` and `signUp(router, data)` make the call and, on success, empty the cache and land on `/dashboard`. A failure is toasted ("Failed to Sign In" / "Failed to Create Account") and not thrown, so the forms only await it.
  - `signOut(router)` signs out and leaves for `/`. Repeat clicks are ignored while one is in flight. An `UnauthorizedError` counts as already signed out, and other failures toast "Failed to Sign Out", with Retry for a network error.
  - `leaveExpiredSession(router, error)` is what `getRouter` hands the query client: one "Signed Out" toast, however many requests fail together, and nothing on the server.
  - Leaving goes to `/` first, then empties the cache, so the open page's queries don't refetch into the same failure. Entering empties it first, so a missed exit can't leak into the next Session.
  - The sidebar, the dashboard's logout button, and the login and register pages all call it.

- **2026-10-20 — the session token stays on the server.** `getSession` sent Better-Auth's whole Session to the browser: the Session record with its `token` (the value the httpOnly cookie keeps away from JavaScript), IP address and user agent, plus the full User. `signInUser` and `signUpUser` returned Better-Auth's sign-in result, which carries the token too. `getSession` now returns only the User's `id`, `name` and `email`, or `null`; sign-in and sign-up return nothing. The client only ever showed the name and email.
- **2026-10-20 — one module owns Better-Auth.** Features 1–4 are unchanged. Better-Auth was reached from three places: `authMiddleware` in `lib/` and `getSession` each read the Session the same way, and sign-in and sign-up translated Better-Auth's error codes inside their server functions. `src/modules/authentication/session.server.ts` is now the only caller of `auth.api`, and reads the request headers itself:
  - `readSession()`: the signed-in User (`id`, `name`, `email`) or `null`.
  - `requireUserId()`: the User's id, or `UnauthorizedError`.
  - `signInWithEmail(data)` / `signUpWithEmail(data)`: "Incorrect email or password." and "An account with this email already exists." translated here.
  - `signOutSession()`.

  The server functions are one-line adapters over it. `authMiddleware` moved to `src/modules/authentication/middlewares.ts` and passes `context.userId` instead of Better-Auth's Session, so its shape stops at this module (37 `context.user.id` reads became `context.userId`). The `/api/auth/$` route still mounts Better-Auth's HTTP handler directly. It's the integration's entry point, not a caller.

- **2026-10-20 — the route guards read the Session once.** Feature 4 is unchanged. Every matched route's `beforeLoad` runs on every navigation, and on hover through `defaultPreload: "intent"`, so `_protected`, `_guest` and the dashboard each called `getSession` (a server round trip and a D1 read) before any page could load. `sessionQueryOption()` in `src/modules/authentication/query-options.ts` caches the signed-in User with `staleTime: Infinity`. `requireSignedIn` / `requireSignedOut` in `guards.ts` read it and hold the redirect rules, and the dashboard's duplicate check is gone. Navigating no longer asks the server who you are: one `getSession` after sign-in, then none. The cache goes when a Session starts or ends, since the Session module clears the query cache. Leaving sets the cached Session to `null` before navigating to `/`, or the login page's guard would send the cached User straight back to `/dashboard`. A Session that ends while cached still lets the guard through, but the page's first request fails with `UnauthorizedError` and the client signs out. Every successful mutation invalidates all queries, the Session included, so the first navigation after one re-reads it.

## Documentation Corrections Made This Session

While confirming multi-user is a deliberate product goal (not incidental plumbing), found that `bank-accounts/SPEC.md`, `buckets/SPEC.md`, `transactions/SPEC.md`, and `allocations/SPEC.md` all justified "no `updatedAt` column" with **"single-user app, no sync/API client"** — which reads as "this app supports one User total," contradicting the actual design. Reworded all four to "no per-User concurrent-edit conflict scenario" instead, and added a `User` entry to `CONTEXT.md` (previously missing despite being the root owner of every other entity) stating the app is built for multiple independent, isolated Users.

## Future Considerations

### Google OAuth Sign-In (Planned, Undesigned)

The disabled button on `/` and `/register` is an intentional placeholder — not dead UI to remove. Wiring it up requires registering an OAuth app with Google, configuring `socialProviders.google` in `integrations/better-auth/index.ts`, and handling the callback route. Undesigned beyond that; not scoped this session.

### Email Verification (Spec'd, not yet built)

`users.emailVerified` exists but nothing sets it. See [`docs/specs/email-verification.md`](../../../docs/specs/email-verification.md) for the full spec (auto-send on sign-up, manual resend, `verify-email` route). Candidate _further_ future use cases, deliberately left undecided even by that spec (see its Out of Scope):

- Gate self-service password reset behind a verified email (depends on Forgot/Reset Password existing first).
- Show a "please verify" banner/nag without blocking app usage.
- Require verification before allowing a change to the account's email address.

### Forgot / Reset Password (Spec'd, not yet built)

No self-service recovery path exists today for a User who forgets their password. See [`docs/specs/forgot-password.md`](../../../docs/specs/forgot-password.md) for the full spec (request-reset email, time-limited reset link, session revocation on success). Worth building given the app is intended for other people to use as a real alternative to paid budgeting tools, not just its original author.

### Rate Limiting / Brute-Force Protection (Unaudited)

See Design Decisions above — currently running on Better-Auth's implicit default, which is weaker than it looks under Cloudflare Workers' per-isolate memory model. Needs a deliberate decision (e.g. a `secondaryStorage` backed by KV/D1) rather than staying on the unverified default, especially once the app has real external users.

### Account Settings Page (Gap, Undesigned)

The sidebar's "Account" menu item is `disabled` with no destination. Would presumably host profile editing (name, email, password change) and eventually session management (below).

### Session Management (Gap, Undesigned)

Multi-device Sessions already work at the data layer, but a User has no UI to see which devices are signed in or revoke one remotely (e.g. after losing a phone). Not yet scoped.

### `dashboard.tsx` — Known Placeholder, Not Audited for Correctness

`_protected/dashboard.tsx` has its own logout button (which goes through the Session module like `SidebarFooter`'s, since 2026-10-20), and dumps the raw route context via `<pre>{JSON.stringify(foo, null, 2)}</pre>`. Otherwise left untouched by design — this route is a placeholder to be replaced once core features and real data exist, so cleaning up code inside it now would be discarded along with the rest of the file later.
