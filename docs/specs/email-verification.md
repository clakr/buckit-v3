---
status: ready-for-agent
module: authentication
---

# Spec: Email Verification

No issue tracker is used for this project. This file is the actionable checklist — its `status: ready-for-agent` frontmatter stands in for the triage label a tracker would normally carry. Update the status (e.g. `in-progress`, `done`) as work proceeds.

## Problem Statement

`users.emailVerified` exists in the schema but nothing ever sets it — there's no mechanism to send or consume a verification link, so the flag is permanently `false` for every User, for everyone.

## Solution

Automatically send a verification email right after sign-up (with a manual resend option), and mark the User's email verified when they click the link — built on Better-Auth's existing `sendVerificationEmail`/`verifyEmail` primitives. This spec deliberately makes the flag _accurate_ only; it does not make verification status _consequential_ anywhere else in the app — see Out of Scope.

## User Stories

1. As a newly-registered User, I want a verification email sent automatically after I sign up, so I can confirm my email without an extra step.
2. As a User who clicks the verification link, I want my account marked verified and to land back in the app, so I know it worked.
3. As a User whose verification link has expired, I want a clear error message, so I know to request a new one.
4. As a User who didn't receive or lost the verification email, I want a way to request it again, so I'm not stuck.
5. As a User who is already verified and clicks an old verification link again, I want no error and no side effect, so a stale bookmarked or forwarded link doesn't break anything.
6. As a developer, I want the verification email sent through the same shared `sendEmail` seam as password reset, so exactly one place in the codebase knows how to send transactional email.
7. As a developer, I want the verification server functions testable without a live email provider, so CI never depends on an external service.
8. As a developer, I want `emailVerified` to actually flip to `true` in the database on success, so future features that read it (see Future Considerations) can trust it.

## Implementation Decisions

- **Reuses the `sendEmail` seam** introduced by the Forgot / Reset Password spec (`docs/specs/forgot-password.md`). Whichever of the two specs is implemented first creates the seam; the other just imports it. Provider choice is the same open decision noted there — not duplicated here.
- **`integrations/better-auth/index.ts`**: add `emailVerification.sendVerificationEmail: async ({ user, url }) => sendEmail({ to: user.email, subject: "Verify your email", html: <link to `url`> })` and `emailVerification.sendOnSignUp: true` — this fires automatically right after `signUpEmail`, which `signUpUser` (`modules/authentication/functions.ts`) already calls. Token expiry stays on Better-Auth's own default unless a reason to change it comes up.
- **`modules/authentication/functions.ts`**: add `resendVerificationEmail`, wrapped in `authMiddleware` and using `context.user.email` — **never** a client-supplied email. This matters: an endpoint that emails an arbitrary caller-supplied address would let anyone use it to spam/enumerate, the same failure class as the IDOR bugs already found and fixed elsewhere in this module's ownership checks (see `allocations/SPEC.md`, `transactions/SPEC.md`). Wraps `auth.api.sendVerificationEmail({ body: { email: context.user.email } })`.
- **New route**: `src/routes/verify-email.tsx`, top-level — deliberately outside both the `_guest` and `_protected` route groups. Sign-up already auto-signs the User in (per `signUpUser`/`register.tsx`'s existing redirect-to-`/dashboard` flow), so this link is normally clicked while authenticated, but Better-Auth's `verifyEmail` endpoint itself doesn't require a session, so the route shouldn't force one either. Calls `auth.api.verifyEmail({ query: { token } })` server-side, then redirects to `/dashboard`.
- **Re-verifying is a no-op, not an error.** Clicking an already-consumed or already-verified link succeeds silently (matches Better-Auth's own endpoint behavior) — the route must not special-case or error on this.
- **No UI change anywhere else.** `_protected.tsx`, `SidebarFooter`, and every existing route are untouched. Verification status has zero visible effect on the app beyond `users.emailVerified` becoming `true` in the database.

## Testing Decisions

- **No prior art exists** — same caveat as the Forgot / Reset Password spec: this repo has zero test files today despite `vitest` being configured. Greenfield; base test setup is foundational work for whichever spec lands first.
- Test `resendVerificationEmail` and the `verify-email` route's server-side handler directly — call/invoke them like any other server function, not through rendered UI.
- Mock the `sendEmail` seam; assert it's called with the right recipient and a verification URL.
- **Dedicated test for the ownership edge**: assert `resendVerificationEmail` always uses the authenticated User's own session email, never anything a caller could pass in — this is the one correctness-sensitive case worth its own test, per the IDOR precedent noted above.
- Assert verifying an already-verified account succeeds as a no-op (no thrown error, no double side effect).
- Don't test Better-Auth's own token internals — only this app's wiring around them.

## Out of Scope

- **Any gating of sign-in or app usage based on `emailVerified`** — explicitly deferred; the user asked to leave this for future consideration. This spec only makes the flag accurate, not consequential.
- Any nag banner or UI indicator of verification status.
- Choosing/wiring the concrete email provider — shared open decision with the Forgot / Reset Password spec, not duplicated here.
- Blocking sensitive actions (e.g. changing email) behind verification — noted as a candidate in the original audit (`authentication/SPEC.md`), not designed or built here.

## Further Notes

- See `src/modules/authentication/SPEC.md` → Future Considerations → Email Verification for the full list of candidate use cases (gate password reset, nag banner, gate email change) that remain undecided and are not this spec's job to resolve.
- If the Forgot / Reset Password spec is implemented first, this spec inherits its `sendEmail` seam as-is; if this one lands first, that spec should do the same in reverse.
