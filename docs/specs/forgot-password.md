---
status: ready-for-agent
module: authentication
---

# Spec: Forgot / reset password

This project uses no issue tracker, so this file is the checklist. Its `status: ready-for-agent` frontmatter takes the place of a tracker's triage label. Update the status, for example to `in-progress` or `done`, as work goes on.

## Problem statement

A User who forgets their password has no way to get back in today. The only option is to contact the app's operator, which doesn't work for an app meant to have real Users beyond its original author. `authentication/SPEC.md` records the decision that this is a multi-user product.

## Solution

From the sign-in page, a signed-out User requests a password-reset email. A time-limited link takes them to a page where they set a new password, and they sign in with it. Build it on Better-Auth's existing `requestPasswordReset` and `resetPassword` functions, which this app hasn't wired up yet.

## User stories

1. As a signed-out User who forgot their password, I want a "Forgot password?" link on the sign-in page, so that I can start recovery without contacting support.
2. As a signed-out User requesting a reset, I want to enter my email and submit, so that a reset link is sent to my inbox if that email has an account.
3. As a signed-out User who submitted a reset request, I want the same confirmation message whether or not that email is registered, so the flow doesn't reveal which emails have accounts.
4. As a User who clicks the reset link in their email, I want to land on a page where I can set a new password, so I can get back in without knowing my old one.
5. As a User setting a new password, I want to type it twice, so I don't lock myself out with a typo.
6. As a User setting a new password, I want the same 8 to 128 character rule that sign-up uses, so every place that sets a password follows one rule.
7. As a User whose reset link has expired or was already used, I want a clear error message, so I know to request a new one instead of assuming something is broken.
8. As a User who successfully resets their password, I want to land back on the sign-in page, so I can sign in with the new password right away.
9. As a User who successfully resets their password, I want every other Session of mine revoked, so a lost device or leaked link can't keep access after I've taken control back.
10. As a developer, I want the reset email sent through one shared `sendEmail` function, so switching providers later, or mocking it in tests, never touches business logic.
11. As a developer, I want to test the two new server functions without a live email provider, so CI never depends on an external service.

## Implementation decisions

- **A new shared `sendEmail` function.** One function, such as `sendEmail({ to, subject, html }): Promise<void>`, is the single new integration point. Both this spec and the Email Verification spec (`docs/specs/email-verification.md`) build on it. Nothing in this codebase sends email today, and there is no Resend, SMTP or nodemailer dependency. Whichever spec ships first creates `sendEmail`, and the other imports it. **This spec doesn't decide which provider it wraps. See Further notes.**
- **`integrations/better-auth/index.ts`.** Add `emailAndPassword.sendResetPassword: async ({ user, url }) => sendEmail({ to: user.email, subject: "Reset your password", html: <link to `url`> })` and `emailAndPassword.revokeSessionsOnPasswordReset: true`. The second is a real Better-Auth option, confirmed in `node_modules/better-auth/dist/api/routes/password.mjs`. It deletes all of the User's Sessions once the reset succeeds. Token expiry stays at Better-Auth's default `resetPasswordTokenExpiresIn` of 1 hour unless a reason to change it comes up.
- **`modules/authentication/schemas.ts`.** Add `requestPasswordResetSchema`, which takes only an email with the same `z.email().toLowerCase().trim()` rule as `signInUserSchema`. Add `resetPasswordSchema`, which takes a password and confirmPassword with the same 8 to 128 character rule and matching refine as `signUpUserSchema`. The token comes from a URL param, not a form field.
- **`modules/authentication/functions.ts`.** Add `requestPasswordReset`, which calls `auth.api.requestPasswordReset({ body: { email, redirectTo: "/reset-password" } })`, and `resetPassword`, which calls `auth.api.resetPassword({ body: { newPassword, token } })`. Neither uses `authMiddleware`, because both serve signed-out Users.
- **New routes.** `src/routes/_guest/forgot-password.tsx` is an email-only form that follows the `useAppForm` structure of `_guest/index.tsx`. `src/routes/_guest/reset-password.tsx` is a password and confirm form that follows `_guest/register.tsx`. It reads `token` from the URL search params through TanStack Router's `validateSearch`. Both live in the `_guest` route group with the existing sign-in and sign-up pages.
- **The sign-in page at `/`.** Add a "Forgot password?" link near the password field, pointing to `/forgot-password`.
- **The response reveals nothing.** Better-Auth's `requestPasswordReset` endpoint already responds the same way whether or not the email exists. The UI must always show one message, "If that email has an account, a reset link was sent", whatever the response looks like. The client must never branch on whether the email was found.
- **Showing errors.** An expired or invalid token and other failures go through the pattern `index.tsx` and `register.tsx` already use. They turn the error into a message with `error instanceof Error ? error.message : String(error)` and pass it to `toast.error`. No new error-handling convention is needed.

## Testing decisions

- **The repo has no tests yet.** `vitest` is configured, with a `devDependencies` entry and a `test` script, but no `*.test.ts(x)` files exist. This would be the first test suite, so there is no pattern to follow. The implementing agent sets up the base test configuration first, including the runner config and how tests get a database. This spec doesn't design that setup.
- Test the two new server functions, `requestPasswordReset` and `resetPassword`, directly. Call them like any other exported `createServerFn` handler and assert on return values and thrown errors. Don't test through rendered routes or UI.
- Mock `sendEmail` instead of calling a real provider. Assert that `requestPasswordReset` calls `sendEmail` with the requesting User's address and a URL that carries a token. Assert that `resetPassword` does **not** call `sendEmail`.
- Don't test Better-Auth's internals, such as token generation, hashing or expiry math, because the library tests those itself. Test only this app's code: the two server functions, where the two new schemas accept and reject input, and the arguments passed to `sendEmail`.

## Out of scope

- Choosing and wiring an email provider, such as Resend, Postmark or SES. This is still open. See Further notes.
- Rate-limiting reset requests. It belongs to the app's known rate-limiting gap, which `authentication/SPEC.md` records under Future considerations, in Rate limiting and brute-force protection. No one has audited that gap yet, and this spec doesn't solve it.
- Email verification, which has its own spec (`docs/specs/email-verification.md`).
- Account lockout or suspicious-activity notifications, beyond revoking Sessions after a successful reset.
- Any redesign of `/` or `/register` beyond the one "Forgot password?" link.

## Further notes

- **The email provider is undecided.** The user said they haven't thought about it yet, so nothing is locked in. Resend is the likely recommendation. It has an HTTP API, so it works on Cloudflare Workers without raw TCP sockets, and it's often paired with Better-Auth. That's a note for whoever picks this up, not a decision. Until someone picks a provider, `sendEmail` can be a stub, such as a `console.log` in dev, so the rest of the flow can be built and tested without waiting.
- `src/modules/authentication/SPEC.md` holds the audit this spec came from, including the multi-user decision that is the reason for building self-service recovery at all.
