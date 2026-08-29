---
status: ready-for-agent
module: allocations
---

# Spec: Allocation — Cross-Account/Cross-Bucket List

No issue tracker is used for this project. This file is the actionable checklist — its `status: ready-for-agent` frontmatter stands in for the triage label a tracker would normally carry. Update the status (e.g. `in-progress`, `done`) as work proceeds.

## Problem Statement

An Allocation today is only ever viewable embedded in one of its two parents: the Bucket detail page (a flat table of every Allocation into that Bucket) or the Bank Account detail page (an "Allocations" tab next to "Transactions"). A user with more than one Bank Account and more than one Bucket has no way to see, filter, or search their earmarking activity across both dimensions at once — reviewing "everything I allocated last month" means visiting every Bucket or every Account detail page individually.

## Solution

A cross-account, cross-bucket Allocations list view, filterable by Bank Account, by Bucket, and by date range, with a text search over the note field. Log/Edit/Delete an Allocation directly from this unified list, the same as from either embedded view today.

## User Stories

### Existing behavior (already implemented)

_Not new work — recapped here so this file stays a complete behavioral reference for what's changing, not just a diff. Full detail lives in `src/modules/allocations/SPEC.md`._

1. As a user, I want to log a new Allocation from one of my Bank Accounts into a Bucket, with an amount, date, and optional note, so that I can set money aside toward it.
2. As a user, I want the app to prevent me from logging an Allocation that would push the source Bank Account's Unallocated balance below zero, so that number stays trustworthy.
3. As a user, I want to see every Allocation into a Bucket on that Bucket's detail page, so I can review its full funding history.
4. As a user, I want to see every Allocation out of a Bank Account on that account's detail page (in its "Allocations" tab), so I can review what I've earmarked from it.
5. As a user, I want to edit an existing Allocation's amount, date, or note, so I can correct a mistake.
6. As a user, I want editing an Allocation to enforce the same Unallocated ≥ 0 rule as logging one, so I can't retroactively make the account's numbers invalid.
7. As a user, I want to delete an Allocation I logged by mistake, so its money returns to the source account's unallocated pool.
8. As a user, I want a simple yes/no confirmation when deleting an Allocation (not a typed-confirmation gate), since deleting one Allocation doesn't cascade to destroy any other records.
9. As a user, I want an Allocation's amount to always be interpreted in its Bank Account's currency, since an Allocation has no currency of its own.
10. As a user, I want it to stay true that I can't reassign an existing Allocation to a different Bucket or Bank Account — if I earmarked money to the wrong place, I delete it and log a new one instead. *(Confirms an existing, permanent boundary — not new work.)*

### Cross-account/cross-bucket list

11. As a user with multiple Bank Accounts and Buckets, I want to see all my Allocations in one place, so I don't have to check each Bucket's or each Account's detail page separately.
12. As a user, I want each row in that list to show both which Bank Account it came from and which Bucket it went into, so I can tell them apart without the context of a specific parent page.
13. As a user, I want to filter that list by Bank Account, so I can narrow to money leaving one account without leaving the unified view.
14. As a user, I want to filter that list by Bucket, so I can narrow to money entering one Bucket without leaving the unified view.
15. As a user, I want to filter that list by a date range, so I can review a specific period (e.g. "last month").
16. As a user, I want to search that list by note text, so I can find a specific Allocation I remember details about.
17. As a user, I want that list sorted by date (most recent first) by default, matching how the embedded Allocations tables already behave, so the behavior is consistent.
18. As a user, I want to open, edit, or delete an Allocation directly from that unified list, so I don't have to navigate to its specific Bucket or Account first.
19. As a user, I want to log a new Allocation directly from that unified list — picking both which Bank Account it comes from and which Bucket it goes into — so I don't have to go find the account first.
20. As a user, I want the unified Allocations list to only ever show my own Allocations, never another user's, so my financial data stays private — same ownership boundary as every other view in this app.

## Implementation Decisions

- **Modules touched**: `allocations` only. No schema changes to `bank-accounts`, `buckets`, or `transactions`.
- **Schema**: none. No new columns or tables — this is a read/filter feature over the existing `allocations` table.
- **New server function**: `getAllocations({ filters })`, querying across all of the user's Bank Accounts and Buckets (ownership enforced the same way `getBankAccounts`/`getBuckets` enforce it — scoped by `userId` via a join through `bankAccounts`, not by a single `bankAccountId`/`bucketId`). Returns each Allocation joined with its Bank Account's `name`/`currency` and its Bucket's `name`. Filters: `bankAccountId`, `bucketId`, `dateFrom`/`dateTo`, and a `search` string matched against `note`. Same shape as the already-spec'd (unbuilt) `getTransactions` in `docs/specs/transaction-list-and-transfer.md` — no new pure-function seam needed, it's a straightforward filtered read like `getBankAccounts`/`getBuckets`.
- **New route**: a top-level `/allocations` route (sibling to `/accounts` and `/buckets`).
- **New columns**: `UNIFIED_ALLOCATIONS_COLUMNS` (Date, Bank Account, Bucket, Amount, Note, Actions — reusing the existing `AllocationActionsDropdownMenu` unchanged). The existing per-Bucket and per-Account `ALLOCATIONS_COLUMNS` definitions are untouched.
- **`LogAllocationDialog` gains an in-dialog Bank Account picker.** Today its store only holds a preset `account: BankAccount | null` (set by whichever Bank Account detail page opened it) and the dialog has no account-selection UI — only the Bucket select. Opening it from the unified list has no preset account, so the dialog needs an optional Bank Account select field, shown only when no account is preset. When opened from a Bank Account detail page, behavior is unchanged (account preset, no picker shown).
- **Entry point**: a "Log Allocation" toolbar action on the new unified list, opening `LogAllocationDialog` with no preset account.

## Testing Decisions

Deferred, for the same reason already recorded in `docs/specs/bank-account-crud.md`, `docs/specs/bucket-crud.md`, and `docs/specs/transaction-list-and-transfer.md`: no test harness exists yet anywhere in this repo (`vitest` is a dependency but unconfigured — no config, no test files, no D1-test-runner infrastructure for server functions like `getAllocations`, which calls `getDB(env.db)` via `cloudflare:workers`). Nothing here needs its own seam beyond that infrastructure question: `getAllocations` is a plain filtered read, same shape as `getBankAccounts`/`getBuckets`, with no new validation logic to isolate — logging/editing from the unified list reuses `validateLogAllocationAmount`/`validateEditAllocationAmount` unchanged.

## Out of Scope

- **`Distribution`** (a saved, reusable, manually-triggered preset that logs an income Transaction and splits it via Allocations) — a separate, not-yet-designed module, itself blocked on the undesigned `Goal`/`Debt` shape fork. See the `Distribution` entry in [`CONTEXT.md`](../../CONTEXT.md) and the Future Considerations section of [`src/modules/allocations/SPEC.md`](../../src/modules/allocations/SPEC.md). Not touched by this spec.
- **Allocation reassignment** (moving an existing Allocation to a different Bucket or Bank Account) — permanent non-feature, confirmed in `src/modules/allocations/SPEC.md`. Delete + log a new Allocation covers this; not revisited here.
- **A combined Bank Account + Bucket "matrix" view** (e.g. a grid of Account × Bucket subtotals) — a different, bigger feature than a filterable list; not considered here.
- Any change to the Bank Account, Bucket, or Transactions modules.
- Any automated tests for this pass (see Testing Decisions).

## Further Notes

- Resolved vocabulary for `Allocation` lives in `CONTEXT.md`; full module rationale lives in `src/modules/allocations/SPEC.md`. This spec assumes both as context rather than repeating them.
- This spec deliberately mirrors `docs/specs/transaction-list-and-transfer.md`'s list half in shape (filtered cross-parent view, same "no new seam" testing conclusion) — Allocation's version adds a second filter dimension (Bucket, alongside Bank Account) since Allocation, unlike Transaction, has two parents instead of one.
- `docs/specs/transaction-list-and-transfer.md` doesn't itself call out that its analogous `LogTransactionDialog` would need the same in-dialog-account-picker extension for its unified list's "log new transaction" entry point (its story 19) — that gap applies there too, just not made explicit in that file. Worth a look when that spec gets built.
