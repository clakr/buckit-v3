---
status: ready-for-agent
module: authentication
---

# Spec: Email verification

This project uses no issue tracker, so this file is the checklist. Its `status: ready-for-agent` frontmatter takes the place of a tracker's triage label. Update the status, for example to `in-progress` or `done`, as work goes on.

## Problem statement

The schema has `users.emailVerified`, but nothing ever sets it. No code sends or consumes a verification link, so the flag is always `false` for every User.

## Solution

Send a verification email right after sign-up, offer a manual resend, and mark the User's email verified when they click the link. Build it on Better-Auth's existing `sendVerificationEmail` and `verifyEmail` functions. This spec only makes the flag _accurate_. Verification status changes nothing else in the app. See Out of scope.

## User stories

1. As a newly registered User, I want a verification email sent automatically after I sign up, so I can confirm my email without an extra step.
2. As a User who clicks the verification link, I want my account marked verified and to land back in the app, so I know it worked.
3. As a User whose verification link has expired, I want a clear error message, so I know to request a new one.
4. As a User who didn't receive or lost the verification email, I want a way to request it again, so I'm not stuck.
5. As a User who is already verified and clicks an old verification link again, I want no error and no side effect, so a stale bookmarked or forwarded link doesn't break anything.
6. As a developer, I want the verification email sent through the same shared `sendEmail` function as password reset, so exactly one place in the codebase knows how to send transactional email.
7. As a developer, I want to test the verification server functions without a live email provider, so CI never depends on an external service.
8. As a developer, I want `emailVerified` to flip to `true` in the database on success, so future features that read it (see Future considerations) can trust it.

## Implementation decisions

- **Reuse the `sendEmail` function** from the Forgot / Reset Password spec (`docs/specs/forgot-password.md`). Whichever spec ships first creates it, and the other imports it. The choice of email provider is the same open decision that spec records, so this spec doesn't repeat it.
- **`integrations/better-auth/index.ts`.** Add `emailVerification.sendVerificationEmail: async ({ user, url }) => sendEmail({ to: user.email, subject: "Verify your email", html: <link to `url`> })` and `emailVerification.sendOnSignUp: true`. Better-Auth then sends the email right after `signUpEmail`, which `signUpUser` in `modules/authentication/functions.ts` already calls. Token expiry stays at Better-Auth's default unless a reason to change it comes up.
- **`modules/authentication/functions.ts`.** Add `resendVerificationEmail`, wrapped in `authMiddleware`. It uses `context.user.email` and **never** an email the client sends. An endpoint that emails any address a caller supplies would let anyone use it for spam or to enumerate accounts. That is the same class of bug as the IDOR bugs this module's ownership checks already fixed (see `allocations/SPEC.md` and `transactions/SPEC.md`). It calls `auth.api.sendVerificationEmail({ body: { email: context.user.email } })`.
- **New route `src/routes/verify-email.tsx`, at the top level.** It sits outside both the `_guest` and `_protected` route groups on purpose. Sign-up already signs the User in, through the existing redirect to `/dashboard` in `signUpUser` and `register.tsx`, so the User usually clicks this link while signed in. Better-Auth's `verifyEmail` endpoint doesn't require a session, though, so the route shouldn't require one either. The route calls `auth.api.verifyEmail({ query: { token } })` on the server, then redirects to `/dashboard`.
- **Verifying again does nothing and isn't an error.** Clicking a used link, or a link for an already-verified User, succeeds silently, as Better-Auth's endpoint does. The route must not special-case it or raise an error.
- **No other UI changes.** `_protected.tsx`, `SidebarFooter` and every existing route stay as they are. Verification status has no visible effect on the app. The only change is that `users.emailVerified` becomes `true` in the database.

## Testing decisions

- **The repo has no tests yet**, the same caveat as the Forgot / Reset Password spec. `vitest` is configured, but there are no test files. Whichever spec ships first sets up the base test configuration.
- Test `resendVerificationEmail` and the `verify-email` route's server handler directly, by calling them like any other server function, not through rendered UI.
- Mock `sendEmail`, and assert it receives the right recipient and a verification URL.
- **Give the ownership case its own test.** Assert that `resendVerificationEmail` always uses the signed-in User's own session email, never anything a caller passes in. It is the one case where a mistake is a security bug, as the IDOR fixes above show.
- Assert that verifying an already-verified account succeeds and does nothing: no thrown error and no repeated side effect.
- Don't test Better-Auth's own token internals, only this app's code around them.

## Out of scope

- **Gating sign-in or app use on `emailVerified`.** The user asked to leave this for later. This spec only makes the flag accurate.
- A nag banner or any other UI showing verification status.
- Choosing and wiring the email provider. This is the open decision shared with the Forgot / Reset Password spec, and that spec records it.
- Requiring verification for sensitive actions such as changing the email. The original audit in `authentication/SPEC.md` lists this as a candidate, and this spec doesn't design or build it.

## Further notes

- The Email verification section of Future considerations in `src/modules/authentication/SPEC.md` lists the candidate uses, such as gating password reset, a nag banner and gating email change. They are undecided, and this spec doesn't decide them.
- If the Forgot / Reset Password spec ships first, this spec uses its `sendEmail` function unchanged. If this spec ships first, that spec does the same in reverse.
