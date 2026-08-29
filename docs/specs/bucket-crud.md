---
status: ready-for-agent
module: buckets
---

# Spec: Bucket — Edit, Delete, and the Boundaries Around Them

No issue tracker is used for this project. This file is the actionable checklist — its `status: ready-for-agent` frontmatter stands in for the triage label a tracker would normally carry. Update the status (e.g. `in-progress`, `done`) as work proceeds.

## Problem Statement

A user can create a Bucket and see its list/detail views, but cannot fix a mistake afterward. Renaming a Bucket (even to correct a typo) is impossible — the "Edit" menu item exists but is disabled. Removing a Bucket they no longer use is equally impossible — "Delete" is disabled too. There is also no visible documentation of *why* certain things a user might expect (spending directly from a Bucket, a savings target/progress bar) don't exist — without it, a future contributor could "fix" these as if they were oversights.

## Solution

Add Edit (rename only) and Delete (permanently remove a Bucket and everything allocated to it, protected by typed confirmation) as working actions on a Bucket, mirroring the pattern already specified for Bank Account (`docs/specs/bank-account-crud.md`, `docs/adr/0001-hard-delete-bank-accounts.md`). Everything else discussed for the Bucket module — a savings-target `Goal` module, a sortable subtotal column, an aggregate summary on the Bucket detail page — is deliberately named and pushed to Out of Scope so it isn't mistaken for missing work.

## User Stories

1. As a user, I want to see a list of all my Buckets with a per-source-currency subtotal, so that I can see at a glance how much I've earmarked into each one.
2. As a user, I want to open a Bucket's detail page and see every Allocation into it, so that I can review its full funding history.
3. As a user, I want to create a new Bucket with just a name, so that I can start earmarking money toward it.
4. As a user, I want the app to prevent me from creating two Buckets with the same name (case-insensitively), so that I don't confuse similarly-named Buckets.
5. As a user, I want to log an Allocation from one of my Bank Accounts into a Bucket, so that I can set money aside toward it.
6. As a user, I want to edit or delete an Allocation, so that I can correct a mistake without deleting the whole Bucket.
7. As a user, I want the app to prevent any Allocation change that would push a Bank Account's unallocated balance below zero, so that I can trust that number is always actually available.
8. As a user, I want to rename an existing Bucket, so that I can fix a typo or reflect a change in how I think about it (e.g. "Trip" → "Japan Trip").
9. As a user, I want renaming to enforce the same uniqueness rule as creation (case-insensitive, excluding the Bucket's own current name), so that I can't create a duplicate and can still save without changing anything.
10. As a user, I want a confirmation toast when I successfully rename a Bucket, so that I know the change was saved.
11. As a user, I want to delete a Bucket I no longer need, so that my Buckets list doesn't accumulate clutter from abandoned savings categories.
12. As a user, I want to be told exactly how many Allocations will be destroyed before I delete a Bucket, so that I understand the scope of the action.
13. As a user, I want to be told that deleting a Bucket returns its earmarked money to each source Bank Account's unallocated balance, so that I understand my money isn't lost, just un-earmarked.
14. As a user, I want to type the Bucket's name to confirm deletion, so that I can't destroy a Bucket's entire funding history with a single accidental click.
15. As a user, I want deleting a Bucket to also remove all of its Allocations, so that I don't end up with orphaned Allocations pointing at a Bucket that no longer exists.
16. As a user, I want a confirmation toast when a Bucket is deleted, so that I have feedback the action completed.
17. As a user, I want to be redirected back to the Buckets list after deleting the Bucket I was currently viewing, so that I'm not left on a broken detail page for a Bucket that no longer exists.
18. As a user, I want it to stay true that I can never record an expense directly against a Bucket, so that Buckets stay simple savings categories and all spending stays visible on the Bank Account it actually left from. *(Confirms an existing, permanent boundary — not new work.)*
19. As a user, I want to eventually set a savings target and see progress on a Bucket, so that I know how close I am to a goal. *(Captured for a future, undesigned `Goal` module — not part of this spec's build.)*
20. As a user, I want to eventually sort my Buckets list by subtotal, so that I can find my biggest or smallest Buckets at a glance. *(Captured for later — blocked on designing an efficient per-row currency-conversion approach; not part of this build.)*
21. As a user, I want to eventually see a Bucket's total-per-currency summarized at the top of its detail page, not just buried in the list view, so that I don't have to go back to the list to see it. *(Captured for later — the detail page's summary needs its own design pass; not part of this build.)*

## Implementation Decisions

- **Modules touched**: `src/modules/buckets` only (`functions.ts`, `schemas.ts`, `mutations.ts`, `components/`). No other module needs to change.
- **New server functions**:
  - `editBucket` — behind the existing `verifyUserBucketMiddleware`. Validates `name` (trim, required, max 100 chars, unique per user excluding the Bucket's own current name). Updates `name` only. No other field is accepted by this mutation, by design (the entity has no other mutable field).
  - `deleteBucket` — behind the existing `verifyUserBucketMiddleware`. Performs a hard delete of the `buckets` row. No server-side "can this be deleted" guard is needed — the existing `onDelete: "cascade"` foreign key removes the Bucket's `allocations` rows automatically, and there is no blocking rule (see `docs/adr/0002-hard-delete-buckets.md`). Because `Unallocated` is computed on read, this automatically returns the destroyed Allocations' amounts to each source Bank Account's unallocated pool — no separate reconciliation step is needed.
- **Existing function to extend**: `validateBucketName` needs an optional "exclude this bucket id" parameter so the edit flow can validate uniqueness while still allowing a no-op save (submitting without changing the name).
- **Schema changes**: none.
- **UI — Edit**: new dialog with a single Name field, pre-filled with the current value, using the same pattern as `AddBucketDialog`'s name field (debounced async validation calling the extended `validateBucketName`). Wires into the currently-`disabled` "Edit" item in `BucketActionsDropdownMenu`.
- **UI — Delete**: new dedicated confirmation dialog requiring the user to type the Bucket's name to confirm — **not** the existing lightweight `confirm()` store used elsewhere in the app (that's a plain Yes/No dialog). The dialog body must state the exact count of Allocations that will be destroyed and that their amounts return to each source Bank Account's unallocated balance. The destructive action stays disabled until the typed input exactly matches the Bucket's name. Wires into the currently-`disabled` "Delete" item in `BucketActionsDropdownMenu`.
  - **Do not extract a shared typed-confirmation-dialog component yet**, even though this is now the second module (after the still-unbuilt Bank Account delete) needing one. Per the project's own rule-of-three standard for extraction, wait for a third real need before pulling this into a shared component — build it independently here, matching the pattern rather than a shared import.
- **Post-delete navigation**: deleting from the Bucket detail page redirects to `/buckets`. Deleting from the Buckets list just removes the row — no navigation needed.

## Testing Decisions

Not decided for this pass. No test harness exists anywhere in the repo yet (`vitest` is a dependency but unconfigured — no `vitest.config.ts`, no test files, no `@cloudflare/vitest-pool-workers` or equivalent for exercising D1-backed server functions like `editBucket`/`deleteBucket`). That's new infrastructure for the whole repo, not a one-module decision — intentionally not introduced here. Revisit once a testing seam is deliberately chosen (see the same open item in `docs/specs/bank-account-crud.md`).

## Out of Scope

- **`Goal` module** (target/progress tracking on a Bucket) — planned but undesigned. Open fork not resolved here: a column added to `buckets` vs. a wholly separate model referencing one or more Buckets. See the `Goal` entry in `CONTEXT.md`.
- **Bucket-scoped spending/Transactions** — rejected outright, permanently. Spending is always recorded as a Bank Account Transaction; this is a boundary, not a gap.
- **Sortable subtotal column** on the Buckets list — blocked on designing an efficient row-by-row currency-conversion approach.
- **Aggregate summary header** on the Bucket detail page — needs its own design pass before building.
- **Shared subtotal utility (`utils.ts`)** for Buckets — not extracted yet per the project's rule-of-three standard; the calculation is still only used in one place.
- **Shared typed-confirmation-dialog component** — not extracted yet, same rule-of-three reasoning; build this ticket's delete dialog independently.
- Any change to the Bank Account or Allocations modules (each has, or will have, its own spec).
- Any automated tests for this pass (see Testing Decisions).

## Further Notes

- Resolved vocabulary lives in `CONTEXT.md` (repo root). Full module rationale (entity shape, invariants, the goal-vs-envelope boundary, the deliberately-deferred polish gaps) lives in `src/modules/buckets/SPEC.md`. The delete-policy trade-off is recorded in `docs/adr/0002-hard-delete-buckets.md`, which itself references `docs/adr/0001-hard-delete-bank-accounts.md` as precedent. Read those before implementing — this spec assumes their context rather than repeating it.
- This spec deliberately mirrors `docs/specs/bank-account-crud.md`'s shape (same kind of Edit/Delete gap, same typed-confirmation pattern) so the two modules stay consistent when both get built.
