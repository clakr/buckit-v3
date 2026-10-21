---
status: accepted
---

# A Workers Rate Limiting binding throttles auth attempts

`signInUser` and `signUpUser` run `authAttemptLimitMiddleware` (`src/modules/authentication/middlewares.ts`). It calls `consumeAuthAttempt` in `session.server.ts`, which counts the attempt against the `AUTH_ATTEMPT_LIMITER` binding in `wrangler.jsonc`. Each client IP (`cf-connecting-ip`) gets 5 sign-in attempts and, separately, 5 sign-up attempts per 60 seconds. Past that, the call throws `RateLimitedError` before validation or the password check runs. Better-Auth's own HTTP endpoints for email sign-in and sign-up are closed with `disabledPaths`, so `/api/auth/$` isn't a way around the throttle.

## Why this was needed

Better-Auth runs its rate limiter only inside its HTTP router (`onRequestRateLimit` in `better-auth/dist/api/index.mjs`). The sign-in and sign-up server functions call `auth.api.signInEmail` and `auth.api.signUpEmail` directly, which never pass through the router, so they had no rate limit at all. The HTTP endpoints had one, but only in production, with counts in each Workers isolate's own memory.

## Considered options

- **A Workers Rate Limiting binding.** Chosen. It needs one entry in `wrangler.jsonc`, no schema, and no extra database writes. The counters are shared across isolates. They're kept per Cloudflare location and are approximate, and the window can only be 10 or 60 seconds. That's enough to slow brute force and credential stuffing from one client.
- **A D1 table.** It's exact and the window can be any length, but it needs a migration and a D1 write on every attempt.
- **KV.** It's eventually consistent (about 60 seconds) and allows one write per second per key, so it's a poor fit for counters.
- **Routing auth through Better-Auth's HTTP handler** with `rateLimit.storage` or a `secondaryStorage`. That would rewrite how the login and register forms call the server, and lose the error translation in `session.server.ts`.

The throttle is keyed on the client IP only. Keying on the target email as well would slow attacks spread over many IPs, but anyone could then lock a real User out by failing on purpose with their email.

## Consequences

- A User behind a shared IP, such as an office NAT, shares the budget with everyone else on it. 5 attempts a minute is generous for real use.
- Every attempt counts, not just failed ones, because the binding can't take back a count. A User who gets their password right on the first try uses one attempt.
- Windows are fixed to the clock minute, not sliding, so a client can get up to 10 attempts across a minute boundary.
- Any new Better-Auth endpoint that takes a guessable secret, such as password reset from `docs/specs/forgot-password.md`, should go through a throttled server function, and its HTTP path should be added to `disabledPaths`.
- Better-Auth endpoints that check a password but need a Session first (`/change-password`, `/verify-password`, `/delete-user`) still have only Better-Auth's per-isolate limiter. Someone can only guess against an account they're already signed in to, so this was left as is.
- A request without `cf-connecting-ip` counts against a shared `unknown` key. Workers always sets the header, so this only happens off Cloudflare.
- Local dev runs the same binding through miniflare, which keys every request on `127.0.0.1`.
