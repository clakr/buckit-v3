Status: ready-for-agent

# Forgot / Reset Password

## Problem Statement

A User who forgets their password has no way to recover access today — the only path is contacting the app's operator directly, which doesn't scale for an app meant to have real external Users beyond its original author (see `authentication/SPEC.md`'s locked decision that this is a genuinely multi-user product).

## Solution

Let a signed-out User request a password-reset email from the sign-in page, follow a time-limited link to a page where they set a new password, and sign in with it — built on Better-Auth's existing `requestPasswordReset`/`resetPassword` primitives, which this app hasn't wired up yet.

## User Stories

1. As a signed-out User who forgot their password, I want a "Forgot password?" link on the sign-in page, so that I can start recovery without contacting support.
2. As a signed-out User requesting a reset, I want to enter my email and submit, so that a reset link is sent to my inbox if that email has an account.
3. As a signed-out User who submitted a reset request, I want the same confirmation message regardless of whether that email is registered, so the flow doesn't leak which emails exist in the system.
4. As a User who clicks the reset link in their email, I want to land on a page where I can set a new password, so I can regain access without knowing my old one.
5. As a User setting a new password, I want to confirm it by typing it twice, so I don't lock myself out with a typo.
6. As a User setting a new password, I want the same 8–128 character rule already enforced at sign-up, so the rule is consistent everywhere a password is set.
7. As a User whose reset link has expired or was already used, I want a clear error message, so I know to request a new one instead of assuming something is broken.
8. As a User who successfully resets their password, I want to land back on the sign-in page, so I can immediately sign in with the new password.
9. As a User who successfully resets their password, I want every other active Session of mine revoked, so a lost device or leaked link can't retain access after I've regained control.
10. As a developer, I want the reset-password email sent through one shared `sendEmail` seam, so swapping providers later — or mocking it in tests — never touches business logic.
11. As a developer, I want the two new server functions testable without a live email provider, so CI never depends on an external service.

## Implementation Decisions

- **New shared seam — `sendEmail`.** A single function, e.g. `sendEmail({ to, subject, html }): Promise<void>`, is the one new integration point both this spec and the Email Verification spec (`.scratch/email-verification/spec.md`) build on. Nothing in this codebase sends email today (no Resend/SMTP/nodemailer dependency exists). Whichever of the two specs is implemented first creates this seam; the other imports it. **Which provider it wraps is an explicit open decision, not made in this spec — see Further Notes.**
- **`integrations/better-auth/index.ts`**: add `emailAndPassword.sendResetPassword: async ({ user, url }) => sendEmail({ to: user.email, subject: "Reset your password", html: <link to `url`> })`, and `emailAndPassword.revokeSessionsOnPasswordReset: true` (a real Better-Auth option — confirmed in `node_modules/better-auth/dist/api/routes/password.mjs`; deletes all of the User's Sessions once the reset succeeds). Token expiry stays on Better-Auth's own default (`resetPasswordTokenExpiresIn`, 1 hour) unless a reason to change it comes up.
- **`modules/authentication/schemas.ts`**: add `requestPasswordResetSchema` (email only, same `z.email().toLowerCase().trim()` shape as `signInUserSchema`), and `resetPasswordSchema` (password + confirmPassword, same 8–128-char + refine-match shape as `signUpUserSchema`). The token itself is a URL param, not a form field.
- **`modules/authentication/functions.ts`**: add `requestPasswordReset` (wraps `auth.api.requestPasswordReset({ body: { email, redirectTo: "/reset-password" } })`) and `resetPassword` (wraps `auth.api.resetPassword({ body: { newPassword, token } })`). Neither needs `authMiddleware` — both are for signed-out Users by definition.
- **New routes**: `src/routes/_guest/forgot-password.tsx` (email-only form, mirrors `_guest/index.tsx`'s `useAppForm` structure) and `src/routes/_guest/reset-password.tsx` (password + confirm form, reads `token` from the URL search params via TanStack Router's `validateSearch`, mirrors `_guest/register.tsx`'s structure). Both live in the `_guest` route group like the existing sign-in/sign-up pages.
- **`/` (sign-in page)**: add a "Forgot password?" link near the password field, pointing to `/forgot-password`.
- **No-leak response**: Better-Auth's `requestPasswordReset` endpoint already responds identically whether or not the email exists. The UI must show one generic "If that email has an account, a reset link was sent" message regardless of the response shape — never branch client-side on whether the email was found.
- **Error surfacing**: expired/invalid-token and other failures use the same `error instanceof Error ? error.message : String(error)` → `toast.error` pattern already used in `index.tsx`/`register.tsx` — no new error-handling convention needed.

## Testing Decisions

- **No prior art exists.** This repo has `vitest` configured (`devDependencies`, a `test` script) but zero `*.test.ts(x)` files anywhere — this would be the first test suite written, not a continuation of an established pattern. The implementing agent should establish the base test setup (test runner config, any DB test-fixture strategy) as foundational work; that setup isn't designed here.
- Test the two new server functions (`requestPasswordReset`, `resetPassword`) directly — call them like any other exported `createServerFn` handler and assert on return values / thrown errors. Don't test through rendered routes/UI.
- Mock the `sendEmail` seam rather than hitting a real provider. Assert `requestPasswordReset` calls `sendEmail` with the requesting User's address and a token-bearing URL; assert `resetPassword` does **not** call `sendEmail`.
- Don't test Better-Auth's own internals (token generation, hashing, expiry math) — that's the library's tested behavior. Test only this app's wiring: the two server functions, the two new schemas' validation boundaries, and the `sendEmail` call shape.

## Out of Scope

- Choosing and wiring a concrete email provider (Resend, Postmark, SES, etc.) — open decision, not resolved here (see Further Notes).
- Rate-limiting reset requests specifically — falls under this app's existing, separately-flagged, unaudited rate-limiting gap (`authentication/SPEC.md` → Future Considerations → Rate Limiting), not re-solved by this spec.
- Email verification — separate spec (`.scratch/email-verification/spec.md`).
- Account-lockout or suspicious-activity notifications beyond revoking Sessions on a successful reset.
- Any redesign of `/` or `/register` beyond adding the one "Forgot password?" link.

## Further Notes

- **Email provider is explicitly undecided.** The user was asked directly and said they haven't thought about it yet — nothing is locked in. Resend was the natural recommendation (HTTP API, works on Cloudflare Workers without needing raw TCP sockets, a common Better-Auth pairing) but that's not a decision, just a note for whoever picks this up. Until a provider is chosen, `sendEmail` can be stubbed (e.g. `console.log` in dev) so the rest of the flow is buildable and testable without blocking on it.
- See `src/modules/authentication/SPEC.md` for the audit this spec grew out of, including the multi-user-by-design decision that motivates building self-service recovery at all.
