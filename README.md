# Buckit

A personal finance tracker. Money sits in Bank Accounts, Allocations earmark it to Buckets, and Transactions record it coming in and going out. Debts track money owed to or by other people. `CONTEXT.md` defines each term.

The app runs on TanStack Start, deployed to Cloudflare Workers, with Drizzle ORM over a Cloudflare D1 database.

## Run locally

```bash
pnpm install
pnpm db:migrate:local
pnpm dev
```

`pnpm dev` serves the app on port 3000. `pnpm db:seed` fills the local database with sample data.

## Check and build

```bash
pnpm fmt:check
pnpm lint
pnpm build
```

`pnpm pre` formats and lints in one step.

## Database

The schema lives in `src/db/schema.ts`. After changing it, run `pnpm db:migrate:generate` to write a migration into `migrations/`, then `pnpm db:migrate:local` to apply it.

`pnpm db:pull:prod` replaces the local database with a copy of production data.

## Deploy

```bash
pnpm deploy
pnpm db:migrate:remote
```

`pnpm deploy` builds the app and runs `wrangler deploy`. `pnpm db:migrate:remote` applies any new migrations to the production database.

## Docs

- `CONTEXT.md` is the domain glossary.
- `docs/adr/` records architecture decisions.
- `docs/specs/` and each `src/modules/*/SPEC.md` describe module behaviour.
