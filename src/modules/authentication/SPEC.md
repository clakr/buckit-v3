# Module Spec: Authentication

## Overview

Authentication is the identity layer every other module builds on: a User signs up or signs in with email/password, gets a Session, and every protected route/server function derives `userId` from that Session to scope its data. Built on [Better-Auth](https://www.better-auth.com/) (`^1.7.1`) with the Drizzle/SQLite adapter, plus its `tanstackStartCookies` plugin for SSR-safe cookie writes on TanStack Start. The app is designed to support multiple independent, isolated Users (not a single-operator tool) — see the `User` entry in [`CONTEXT.md`](../../../CONTEXT.md).

## Entity

Better-Auth owns these four tables; this app maps them to its own names via the Drizzle adapter config (`user`→`users`, `session`→`sessions`, `account`→`accounts`, `verification`→`verifications` in `integrations/better-auth/index.ts`).

### User

| Field           | Type     | Notes                                                        |
| --------------- | -------- | ------------------------------------------------------------- |
| `id`            | string   | primary key                                                    |
| `name`          | string   | `"${firstName} ${lastName}"`, joined at sign-up — no separate first/last columns |
| `email`         | string   | unique                                                         |
| `emailVerified` | boolean  | default `false`, never set `true` today (see Future Considerations) |
| `image`         | string   | nullable, unused (no avatar upload UI)                        |
| `createdAt`     | datetime |                                                                |
| `updatedAt`     | datetime |                                                                |

### Session

| Field        | Type     | Notes                                                  |
| ------------ | -------- | -------------------------------------------------------- |
| `id`         | string   | primary key                                              |
| `token`      | string   | unique, the session cookie's value                       |
| `expiresAt`  | datetime | 7 days from creation — Better-Auth's built-in default; `session.expiresIn` is not set in this app's config |
| `userId`     | string   | FK → User, `onDelete: cascade`, indexed                  |
| `ipAddress`  | string   | nullable                                                  |
| `userAgent`  | string   | nullable                                                  |
| `createdAt`  | datetime |                                                            |
| `updatedAt`  | datetime |                                                            |

No uniqueness constraint on `userId` — a User can hold multiple concurrent Sessions (e.g. phone and laptop signed in at once). This already works today; nothing extra was needed to support it.

### Auth Account (`accounts` table)

| Field                    | Type     | Notes                                                              |
| ------------------------ | -------- | --------------------------------------------------------------------- |
| `id`                     | string   | primary key                                                            |
| `userId`                 | string   | FK → User, `onDelete: cascade`, indexed                                |
| `issuer` / `providerId`  | string   | for email/password today, both are effectively `"credential"`         |
| `accountId`              | string   | unique with `issuer` — for credential auth, this is the User's email  |
| `password`               | string   | nullable — **holds the hashed password for email/password sign-up**   |
| `accessToken`/`refreshToken`/`idToken`/`scope`/token-expiry columns | string/datetime | nullable, unused today — reserved for OAuth providers |
| `createdAt` / `updatedAt`| datetime |                                                                         |

See CONTEXT.md's `Auth Account` entry for the general definition. Worth calling out explicitly here since it's non-obvious: despite the entry's OAuth-flavored description (issuer, tokens, provider id), this table is also where Better-Auth stores the **password hash** for plain email/password sign-up — there is no separate "Credential" table. A User with only email/password auth still gets exactly one Auth Account row, with `password` set and every OAuth-only column `null`.

### Verification (`verifications` table)

| Field        | Type     | Notes                                          |
| ------------ | -------- | ------------------------------------------------- |
| `id`         | string   | primary key                                        |
| `identifier` | string   | indexed — e.g. an email address                    |
| `value`      | string   | the token/code being verified                      |
| `expiresAt`  | datetime |                                                     |
| `createdAt` / `updatedAt` | datetime |                                       |

Schema exists but is currently unused end-to-end: nothing in this app writes or reads a Verification row today, because neither email verification nor password reset is wired up (see Future Considerations). Better-Auth would use this table for both once configured.

## Design Decisions

### Identity Middleware Is Separate From Ownership Middleware

`authMiddleware` (`lib/middlewares.ts`) does exactly one thing: call `auth.api.getSession()` and throw `Error("UNAUTHORIZED")` if there's no Session, otherwise pass the Session through as context. It performs no resource-ownership checks. Every other module layers its own `verifyUser<Entity>Middleware` on top of this (e.g. `verifyUserBucketMiddleware`, `verifyUserAllocationMiddleware`) to confirm the *specific record* being touched belongs to `context.user.id`. This split is correct and consistent across the codebase — Authentication's job stops at "who is this," never "do they own this."

### Route Guarding Pattern

Two route-tree layouts gate everything: `_guest.tsx`'s `beforeLoad` calls `getSession()` and redirects to `/dashboard` if a Session exists (keeps signed-in users off login/register); `_protected.tsx`'s `beforeLoad` calls `getSession()` and redirects to `/` if none exists, then exposes `{ user: session.user }` as route context for every nested route (consumed by `SidebarFooter`, etc.). Both are correct and consistent with each other.

### Sign-Out Flow

`signOutUser` is a plain Better-Auth `auth.api.signOut()` call behind `authMiddleware`, invalidating the Session server-side. The one real caller (`SidebarFooter`) also clears the TanStack Query cache (`queryClient.clear()`) before navigating to `/` — correct, since query results are User-scoped and must not leak into whatever gets signed in next on the same device.

### No Rate Limiting Configured Explicitly

Better-Auth's built-in rate limiter defaults to **enabled only in production**, a 10-second window, max 100 requests, backed by **in-memory storage** unless a `secondaryStorage` is configured (checked directly in `node_modules/better-auth`, not asserted from docs). Nothing in `integrations/better-auth/index.ts` overrides this. On Cloudflare Workers, in-memory storage doesn't share state across isolates, so the effective protection against credential-stuffing/brute-force is weaker than the window/max numbers imply. Not fixed this session — flagged in Future Considerations since it wasn't part of the agreed audit scope, but it's a real gap worth a deliberate decision (e.g. `secondaryStorage` backed by KV/D1) rather than leaving it to an unverified default.

## Features

| #   | Feature                          | Status                                                                                                    |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | Sign Up (email/password)          | **Implemented and correct.** First/last name, email, password (8–128 chars) + confirm-password match check.     |
| 2   | Sign In (email/password)          | **Implemented and correct.**                                                                                     |
| 3   | Sign Out                          | **Implemented and correct.** Invalidates Session server-side, clears client query cache.                        |
| 4   | Session retrieval / route guarding | **Implemented and correct.** `_guest`/`_protected` layouts both correctly gate on `getSession()`.               |
| 5   | Multi-device Sessions              | **Implemented and correct** (no extra work needed — schema already supports it).                                |
| —   | Google OAuth Sign-In               | **Not implemented.** UI button exists on both auth pages but is `disabled`; no provider configured server-side. Intentional placeholder for planned future work — see Future Considerations. |
| —   | Email Verification                 | **Not implemented.** `emailVerified` column exists and is permanently `false`; no `requireEmailVerification`, no verification-email sending configured. Spec'd, not yet built — see Future Considerations. |
| —   | Forgot / Reset Password            | **Not implemented.** No reset-password route, no `sendResetPassword` configured. Spec'd, not yet built — see Future Considerations. |
| —   | Account Settings Page              | **Not implemented.** "Account" item in the sidebar user menu exists but is `disabled`.                          |
| —   | Session Management (view/revoke)   | **Not implemented, not yet planned.** A User has no way to see or revoke other active Sessions, despite multi-device Sessions already working under the hood. |

## Fixed During This Session

- **`schemas.ts` — dead email validation.** `email: z.email(...).min(1, "Email is required")` — `.min(1)` can never be the deciding check: any string that fails it (empty) already fails `.email()` first with a more specific message, and any string that passes `.email()` already satisfies `.min(1)`. Removed the unreachable bound.

## Documentation Corrections Made This Session

While confirming multi-user is a deliberate product goal (not incidental plumbing), found that `bank-accounts/SPEC.md`, `buckets/SPEC.md`, `transactions/SPEC.md`, and `allocations/SPEC.md` all justified "no `updatedAt` column" with **"single-user app, no sync/API client"** — which reads as "this app supports one User total," contradicting the actual design. Reworded all four to "no per-User concurrent-edit conflict scenario" instead, and added a `User` entry to `CONTEXT.md` (previously missing despite being the root owner of every other entity) stating the app is built for multiple independent, isolated Users.

## Future Considerations

### Google OAuth Sign-In (Planned, Undesigned)

The disabled button on `/` and `/register` is an intentional placeholder — not dead UI to remove. Wiring it up requires registering an OAuth app with Google, configuring `socialProviders.google` in `integrations/better-auth/index.ts`, and handling the callback route. Undesigned beyond that; not scoped this session.

### Email Verification (Spec'd, not yet built)

`users.emailVerified` exists but nothing sets it. See [`docs/specs/email-verification.md`](../../../docs/specs/email-verification.md) for the full spec (auto-send on sign-up, manual resend, `verify-email` route). Candidate *further* future use cases, deliberately left undecided even by that spec (see its Out of Scope):

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

`_protected/dashboard.tsx` duplicates the `beforeLoad` Session check `_protected.tsx` already performs, has its own standalone logout button separate from `SidebarFooter`'s, and dumps the raw route context via `<pre>{JSON.stringify(foo, null, 2)}</pre>`. Left untouched this session by design — this route is a placeholder to be replaced once core features and real data exist, so cleaning up code inside it now would be discarded along with the rest of the file later.
