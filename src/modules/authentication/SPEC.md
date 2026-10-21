# Module spec: Authentication

## Overview

Authentication is the identity layer every other module builds on. A User signs up or signs in with email and password and gets a Session. Every protected route and server function reads `userId` from that Session and scopes its data to it. The module uses [Better-Auth](https://www.better-auth.com/) (`^1.7.1`) with the Drizzle SQLite adapter, plus Better-Auth's `tanstackStartCookies` plugin so cookie writes work during server rendering on TanStack Start. The app supports many independent, isolated Users and is not a tool for a single operator. See the `User` entry in [`CONTEXT.md`](../../../CONTEXT.md).

## Entity

Better-Auth owns these four tables. The Drizzle adapter config in `integrations/better-auth/index.ts` maps them to this app's names: `user` to `users`, `session` to `sessions`, `account` to `accounts`, and `verification` to `verifications`.

### User

| Field           | Type     | Notes                                                                                     |
| --------------- | -------- | ----------------------------------------------------------------------------------------- |
| `id`            | string   | primary key                                                                               |
| `name`          | string   | `"${firstName} ${lastName}"`, joined at sign-up. No separate first and last name columns. |
| `email`         | string   | unique                                                                                    |
| `emailVerified` | boolean  | defaults to `false`, and nothing sets it to `true` today (see Future considerations)      |
| `image`         | string   | nullable and unused, because there is no avatar upload UI                                 |
| `createdAt`     | datetime |                                                                                           |
| `updatedAt`     | datetime |                                                                                           |

### Session

| Field       | Type     | Notes                                                                                                            |
| ----------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `id`        | string   | primary key                                                                                                      |
| `token`     | string   | unique, the session cookie's value                                                                               |
| `expiresAt` | datetime | 7 days after creation. That is Better-Auth's default, because this app's config doesn't set `session.expiresIn`. |
| `userId`    | string   | foreign key to User, `onDelete: cascade`, indexed                                                                |
| `ipAddress` | string   | nullable                                                                                                         |
| `userAgent` | string   | nullable                                                                                                         |
| `createdAt` | datetime |                                                                                                                  |
| `updatedAt` | datetime |                                                                                                                  |

`userId` has no uniqueness constraint, so a User can hold several Sessions at once, such as a phone and a laptop signed in together. This already works, and it needed no extra code.

### Auth Account (`accounts` table)

| Field                                                                      | Type               | Notes                                                                          |
| -------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------ |
| `id`                                                                       | string             | primary key                                                                    |
| `userId`                                                                   | string             | foreign key to User, `onDelete: cascade`, indexed                              |
| `issuer` / `providerId`                                                    | string             | both are `"credential"` for email and password sign-up today                   |
| `accountId`                                                                | string             | unique together with `issuer`. For credential sign-in, it is the User's email. |
| `password`                                                                 | string             | nullable. **It holds the password hash for email and password sign-up.**       |
| `accessToken`, `refreshToken`, `idToken`, `scope` and token-expiry columns | string or datetime | nullable and unused today, kept for OAuth providers                            |
| `createdAt` / `updatedAt`                                                  | datetime           |                                                                                |

See the `Auth Account` entry in CONTEXT.md for the general definition. One thing here isn't obvious. That entry describes OAuth details such as the issuer, tokens and provider id, but this table is also where Better-Auth stores the **password hash** for plain email and password sign-up. There is no separate Credential table. A User who only signs in with email and password still has exactly one Auth Account row, with `password` set and every OAuth-only column `null`.

### Verification (`verifications` table)

| Field                     | Type     | Notes                             |
| ------------------------- | -------- | --------------------------------- |
| `id`                      | string   | primary key                       |
| `identifier`              | string   | indexed, such as an email address |
| `value`                   | string   | the token or code being verified  |
| `expiresAt`               | datetime |                                   |
| `createdAt` / `updatedAt` | datetime |                                   |

The table exists, but nothing in this app writes or reads a Verification row today, because neither email verification nor password reset is wired up (see Future considerations). Once configured, Better-Auth would use this table for both.

## Design decisions

### The identity middleware is separate from the ownership middleware

`authMiddleware` (`src/modules/authentication/middlewares.ts`) does one thing. It asks the Session module for the signed-in User's id through `requireUserId`, which throws `SessionExpiredError` from `src/lib/errors.ts` when there is no Session, and passes the id on as `context.userId`. It checks no resource ownership. Every other module adds its own `verifyUser<Entity>Middleware` after it, such as `verifyUserBucketMiddleware` or `verifyUserAllocationMiddleware`, to confirm the _specific record_ being touched belongs to `context.userId`. The whole codebase follows this split. Authentication answers "who is this?" and never "do they own this?". Handlers behind an ownership middleware may read and write by id. Read [ADR 0003](../../../docs/adr/0003-ownership-checked-by-middleware.md) before removing one.

### Route guards

Two route-tree layouts guard every route, through `src/modules/authentication/guards.ts`:

- `_guest.tsx`'s `beforeLoad` is `requireSignedOut`. It redirects to `/dashboard` if a Session exists, which keeps signed-in users off the login and register pages.
- `_protected.tsx`'s `beforeLoad` is `requireSignedIn`. It redirects to `/` if no Session exists. It also puts `{ user }`, with `id`, `name` and `email`, in the route context for every nested route, where components such as `SidebarFooter` read it.

Both read the Session through `sessionQueryOption()` (`query-options.ts`). The result stays cached until the Session module clears it on sign-in or sign-out, so navigating doesn't ask the server again. `authMiddleware` is still the real check on every request.

### Sign-out

`signOutUser` calls Better-Auth's `auth.api.signOut()` behind `authMiddleware`, which ends the Session on the server. On the client, every path into or out of a Session goes through `src/modules/authentication/session.tsx` (see the 2026-10-20 update below). It empties the TanStack Query cache on the way in and on the way out, because query results belong to one User and must not show up for whoever signs in next on the same device.

### No explicit rate limiting

Better-Auth's built-in rate limiter is **on only in production** by default. It allows at most 100 requests per 10-second window and keeps its counts in **memory** unless a `secondaryStorage` is configured. This was checked in `node_modules/better-auth` itself, not taken from the docs. Nothing in `integrations/better-auth/index.ts` changes it. On Cloudflare Workers, isolates don't share memory, so the real protection against credential stuffing and brute force is weaker than the window and limit suggest. This session didn't fix it, because it was outside the agreed audit scope, and Future considerations records it. It is a real gap that needs a deliberate decision, such as a `secondaryStorage` backed by KV or D1, instead of an unchecked default.

## Features

| #   | Feature                            | Status                                                                                                                                                                                               |
| --- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Sign Up (email/password)           | **Implemented and correct.** First and last name, email, a password of 8 to 128 characters, and a matching confirm password.                                                                         |
| 2   | Sign In (email/password)           | **Implemented and correct.**                                                                                                                                                                         |
| 3   | Sign Out                           | **Implemented and correct.** Ends the Session on the server and clears the client's query cache.                                                                                                     |
| 4   | Session retrieval / route guarding | **Implemented and correct.** The `_guest` and `_protected` layouts both guard on the Session.                                                                                                        |
| 5   | Multi-device Sessions              | **Implemented and correct.** It needed no extra work, because the schema already supports it.                                                                                                        |
| n/a | Google OAuth Sign-In               | **Not implemented.** Both auth pages have the button, but it's `disabled`, and the server configures no provider. It is a placeholder for planned work. See Future considerations.                   |
| n/a | Email Verification                 | **Not implemented.** The `emailVerified` column exists and is always `false`. Nothing sets `requireEmailVerification` or sends verification emails. Specified, not built. See Future considerations. |
| n/a | Forgot / Reset Password            | **Not implemented.** There is no reset-password route and no `sendResetPassword` config. Specified, not built. See Future considerations.                                                            |
| n/a | Account Settings Page              | **Not implemented.** The sidebar user menu has an "Account" item, but it's `disabled`.                                                                                                               |
| n/a | Session Management (view/revoke)   | **Not implemented and not planned yet.** A User can't see or revoke their other Sessions, even though multi-device Sessions already work.                                                            |

## Fixed during this session

- **`schemas.ts` had an email check that could never decide anything.** In `email: z.email(...).min(1, "Email is required")`, the `.min(1)` never ran first. The only string it rejects is an empty one, and `.email()` already rejects that with a more specific message. Any string that passes `.email()` also passes `.min(1)`. The bound was removed.

## Updates

- **2026-10-20. Authentication's failures, in the async pass.** Every other module got the same pass. Sign Up, Sign In, Sign Out and route guarding, features 1 to 4, are unchanged. This update covers what the user sees when something fails.
  - **Messages the user can act on.** `signInUser` turns Better-Auth's `INVALID_EMAIL_OR_PASSWORD` into an `AppError` with "Incorrect email or password." `signUpUser` turns `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` into a `ConflictError` with "An account with this email already exists. Try signing in." The login and register pages toast "Failed to Sign In" or "Failed to Create Account" with that message, or with "Please try again." for any other error. They used to show the raw message of any error. A wrong password is deliberately not a `SessionExpiredError`, which means the Session is gone (see below).
  - **An expired Session signs the user out.** When a query or mutation fails with `SessionExpiredError` from `authMiddleware`, the app sends the user to `/` with one "Signed Out" toast carrying the server's message, then clears the query cache. `getContext` in `src/integrations/tanstack-query/root-provider.tsx` takes an `onSessionExpired` callback, and `getRouter` (`src/router.tsx`) supplies it. Several failing queries cause only one sign-out, and nothing runs on the server. The route guards still catch an expired Session on the next navigation. This handler covers a page that's already open, such as a dialog's query or a refetch on focus. A mutation that fails this way doesn't also show its own failure toast.
  - **Signing out of an expired Session.** `SidebarFooter` treats a `SessionExpiredError` from `signOutUser` as already signed out and finishes leaving. Other failures toast "Failed to Sign Out", with Retry for a network error, instead of the raw message.
  - **Fallback screens across the app.** Routes without their own screens, which are the guest pages, the dashboard and about, used to show bare "error" or "loading..." text. They now show `StateTemplate` screens: "Something went wrong" with an `AppError`'s message or a hint to check the connection, and "Loading".
  - **Retry runs the load again.** Every route error screen's Retry is now `RouteRetryButton` (`src/components/route-retry-button.tsx`), which calls `router.invalidate()`. It used to call the error component's `reset`, which only clears the boundary. So the Accounts, Buckets and Debts pages, both list and detail, showed the same error again even after the connection came back.
  - **One wording rule.** `describeErrorForUser(error, fallback)` in `src/lib/errors.ts` returns an `AppError`'s message or the fallback. The global mutation toast, sign-in, register and sign-out all use it.
  - `dashboard.tsx`'s own logout button stayed as it was, as the placeholder note under Future considerations explains.

- **2026-10-20. One module starts and ends a Session.** Features 1 to 3 are unchanged. Each way out used to clear the query cache and navigate in its own way. The sidebar's Sign Out and the expired-Session handler cleared the cache, the dashboard's logout button skipped it, and sign-in and sign-up assumed the cache was empty. `src/modules/authentication/session.tsx` now handles all of it:
  - `signIn(router, data)` and `signUp(router, data)` make the call. On success, they empty the cache and go to `/dashboard`. On failure, they show a toast, "Failed to Sign In" or "Failed to Create Account", instead of throwing, so the forms only await them.
  - `signOut(router)` signs out and goes to `/`. It ignores repeat clicks while a sign-out is in progress. It treats a `SessionExpiredError` as already signed out, and other failures toast "Failed to Sign Out", with Retry for a network error.
  - `leaveExpiredSession(router, error)` is what `getRouter` gives the query client. It shows one "Signed Out" toast no matter how many requests fail together, and it calls nothing on the server.
  - Leaving goes to `/` first and then empties the cache, so the open page's queries don't refetch into the same failure. Entering empties the cache first, so a missed exit can't leak data into the next Session.
  - The sidebar, the dashboard's logout button, and the login and register pages all call it.

- **2026-10-20. The session token stays on the server.** `getSession` used to send Better-Auth's whole Session to the browser. That included the Session record with its `token`, which the httpOnly cookie keeps away from JavaScript, the IP address and user agent, and the full User. `signInUser` and `signUpUser` returned Better-Auth's sign-in result, which carries the token too. `getSession` now returns only the User's `id`, `name` and `email`, or `null`, and sign-in and sign-up return nothing. The client only ever showed the name and email.
- **2026-10-20. One module owns Better-Auth.** Features 1 to 4 are unchanged. Three places used to call Better-Auth. `authMiddleware` in `lib/` and `getSession` each read the Session the same way, and sign-in and sign-up translated Better-Auth's error codes inside their server functions. `src/modules/authentication/session.server.ts` is now the only caller of `auth.api`, and it reads the request headers itself. It exports these:
  - `readSession()` returns the signed-in User, with `id`, `name` and `email`, or `null`.
  - `requireUserId()` returns the User's id, or throws `SessionExpiredError`.
  - `signInWithEmail(data)` and `signUpWithEmail(data)` translate Better-Auth's errors into "Incorrect email or password." and "An account with this email already exists."
  - `signOutSession()`.

  The server functions are one-line wrappers around it. `authMiddleware` moved to `src/modules/authentication/middlewares.ts` and passes `context.userId` instead of Better-Auth's Session, so code outside this module never sees Better-Auth's Session shape. 37 reads of `context.user.id` became `context.userId`. The `/api/auth/$` route still mounts Better-Auth's HTTP handler directly. That route is where the integration starts, so it isn't a caller.

- **2026-10-20. The route guards read the Session once.** Feature 4 is unchanged. Every matched route's `beforeLoad` runs on every navigation, and also on hover through `defaultPreload: "intent"`. So `_protected`, `_guest` and the dashboard each called `getSession`, a server round trip plus a D1 read, before any page could load. `sessionQueryOption()` in `src/modules/authentication/query-options.ts` now caches the signed-in User with `staleTime: Infinity`. `requireSignedIn` and `requireSignedOut` in `guards.ts` read it and hold the redirect rules, and the dashboard's duplicate check is gone. Navigating no longer asks the server who the user is. The app calls `getSession` once after sign-in, then never again. The cached Session goes away when a Session starts or ends, because the Session module clears the query cache. Leaving sets the cached Session to `null` before going to `/`. Otherwise the login page's guard would see the cached User and send them straight back to `/dashboard`. If a Session ends while it's cached, the guard still lets the user through, but the page's first request fails with `SessionExpiredError` and the client signs out. Successful mutations invalidate every query except the Session. `sessionQueryOption()` marks it with `meta: { keepOnWrite: true }`, and the mutation cache in `src/integrations/tanstack-query/root-provider.tsx` skips anything with that mark. Until 2026-10-20, every write also made the next navigation read the Session again.

- **2026-10-20. Every server call signs out on expiry.** The async pass caught `SessionExpiredError` in the query and mutation caches, so only queries and mutations signed the user out. The four name checks and Delete Transaction's pre-check call server functions directly. With an expired Session, they showed "Your session has expired" as a field error or in a "Can't Delete This Transaction" dialog, and the user stayed on the page. `sessionExpiryMiddleware` (`src/modules/authentication/session-expiry.ts`) now runs in the browser around every server-function call, registered as `functionMiddleware` in `src/start.ts`. It passes any `SessionExpiredError` to `leaveExpiredSession`, which reaches the router through `getRouterInstance()`, and then rethrows the error, so callers still see the failure. The query cache no longer handles expiry, `getContext` lost its `onSessionExpired` option, and the mutation cache only skips its failure toast. `refineNameAvailability` and Delete Transaction show nothing for a `SessionExpiredError`, so "Signed Out" is the only message.
  - **Dialogs close when a Session starts or ends.** `_protected.tsx` mounts the dialogs, so leaving unmounts them, but their stores kept `isOpen`. A dialog that was open when the Session ended opened again after the next sign-in. Every store made by `createDialogStore` now registers itself, and the Session module calls `closeAllDialogs()` (`src/stores/dialog-store.ts`) when a Session starts and when it ends.

## Doc corrections made this session

This session confirmed that supporting many Users is a deliberate product goal. Along the way it found that `bank-accounts/SPEC.md`, `buckets/SPEC.md`, `transactions/SPEC.md` and `allocations/SPEC.md` all explained the missing `updatedAt` column with **"single-user app, no sync/API client"**. That reads as "this app supports one User in total", which contradicts the design. All four now say that a User's Sessions have no concurrent-edit conflict to detect. `CONTEXT.md` also gained a `User` entry, which had been missing even though the User owns every other entity. It says the app is built for many independent, isolated Users.

## Future considerations

### Google OAuth sign-in (planned, undesigned)

The disabled button on `/` and `/register` is a deliberate placeholder, not dead UI to remove. Wiring it up means registering an OAuth app with Google, configuring `socialProviders.google` in `integrations/better-auth/index.ts`, and handling the callback route. Nothing beyond that is designed, and this session didn't scope it.

### Email verification (specified, not built)

`users.emailVerified` exists, but nothing sets it. [`docs/specs/email-verification.md`](../../../docs/specs/email-verification.md) has the full spec, which covers sending the email on sign-up, a manual resend and a `verify-email` route. That spec leaves these _further_ uses undecided on purpose (see its Out of scope):

- Allow self-service password reset only for a verified email. This depends on Forgot / Reset Password existing first.
- Show a "please verify" banner without blocking the app.
- Require verification before the User changes their email address.

### Forgot / reset password (specified, not built)

A User who forgets their password has no way to recover access on their own today. [`docs/specs/forgot-password.md`](../../../docs/specs/forgot-password.md) has the full spec, which covers the reset request email, a time-limited reset link, and revoking Sessions after a successful reset. It's worth building, because the app is meant as a real alternative to paid budgeting tools for people other than its original author.

### Rate limiting and brute-force protection (unaudited)

See Design decisions above. The app runs on Better-Auth's implicit default, which is weaker than it looks because each Cloudflare Workers isolate has its own memory. It needs a deliberate decision, such as a `secondaryStorage` backed by KV or D1, instead of the unchecked default, especially once the app has real outside users.

### Account settings page (gap, undesigned)

The sidebar's "Account" menu item is `disabled` and leads nowhere. It would likely hold profile editing, for name, email and password, and later session management (below).

### Session management (gap, undesigned)

Multi-device Sessions already work in the data, but a User has no screen to see which devices are signed in or to sign one out remotely, such as after losing a phone. Not scoped yet.

### `dashboard.tsx` is a placeholder and not audited

`_protected/dashboard.tsx` has its own logout button, which has gone through the Session module like `SidebarFooter`'s since 2026-10-20. It also prints the raw route context with `<pre>{JSON.stringify(foo, null, 2)}</pre>`. Otherwise it stays untouched on purpose. The route is a placeholder that will be replaced once the core features and real data exist, so any cleanup inside it now would be thrown away with the rest of the file.
