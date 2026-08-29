---
status: ready-for-agent
module: transactions
---

# Spec: Transaction — Cross-Account List/Search and Transfer

No issue tracker is used for this project. This file is the actionable checklist — its `status: ready-for-agent` frontmatter stands in for the triage label a tracker would normally carry. Update the status (e.g. `in-progress`, `done`) as work proceeds.

## Problem Statement

Transactions today are only ever viewable embedded in a single Bank Account's detail page (`TRANSACTIONS_COLUMNS` tab). A user with more than one account (the seeded data already has two — "Chase Checking" and "Wise EUR Account") has no way to see, filter, or search their activity across accounts in one place. Separately, moving money between two of a user's own Bank Accounts today requires manually creating two unrelated Transactions (an expense on one, an income on the other) with nothing tying them together — easy to get wrong (mismatched amounts, forgetting one side) and leaves no visible trace that they're related.

## Solution

Two capabilities added to the Transactions module:

1. A cross-account Transactions list view, filterable by account, type, and date range, with a text search over the note field.
2. A **Transfer** action: pick a source and destination Bank Account (same currency only — see Implementation Decisions) and an amount; creates two Transactions atomically — an expense on the source, an income on the destination — sharing a note that identifies them as a transfer pair.

## User Stories

### Existing behavior (already implemented)

_Not new work — recapped here so this file stays a complete behavioral reference for the Transactions module, not just a diff of what's changing. Full detail lives in `src/modules/transactions/SPEC.md`._

1. As a user, I want to log a new Transaction (income or expense) against one of my Bank Accounts with an amount, date, and optional note, so that I can record money moving in or out.
2. As a user, I want the app to prevent me from logging an expense that would push the account's Unallocated balance below zero, so I can trust that number is always actually available.
3. As a user, I want to see each Transaction's type, amount, date, and note on its Bank Account's detail page, so I can review the account's activity.
4. As a user, I want to edit an existing Transaction's type, amount, date, or note, so I can correct a mistake.
5. As a user, I want editing a Transaction to enforce the same Unallocated ≥ 0 rule as logging one, so I can't retroactively make the account's numbers invalid.
6. As a user, I want to delete a Transaction I logged by mistake, so it no longer counts toward the account's Balance.
7. As a user, I want to be told exactly what will be removed (the type and amount) before I delete a Transaction, so I understand the scope of the action.
8. As a user, I want deletion to be blocked if removing the Transaction would leave the account's Unallocated balance negative, so the invariant holds even when undoing history.
9. As a user, I want a simple yes/no confirmation when deleting a Transaction (not a typed-confirmation gate), since deleting one Transaction doesn't cascade to destroy any other records.
10. As a user, I want a Transaction's amount to always be interpreted in its Bank Account's currency, since a Transaction has no currency of its own.

### Cross-account list/search

11. As a user with multiple Bank Accounts, I want to see all my Transactions in one place across every account, so I don't have to check each account's detail page separately.
12. As a user, I want each row in that list to show which Bank Account it belongs to, so I can tell them apart.
13. As a user, I want to filter that list by Bank Account, so I can narrow to one account without leaving the unified view.
14. As a user, I want to filter that list by Type (income/expense), so I can isolate spending or earnings.
15. As a user, I want to filter that list by a date range, so I can review a specific period (e.g. "last month").
16. As a user, I want to search that list by note text, so I can find a specific Transaction I remember details about.
17. As a user, I want that list sorted by date (most recent first) by default, matching how the per-account Transactions tab already behaves, so the behavior is consistent.
18. As a user, I want to open, edit, or delete a Transaction directly from that unified list, so I don't have to navigate to its specific account first.
19. As a user, I want to log a new Transaction directly from that unified list (picking which account it belongs to), so I don't have to go find the account first.
20. As a user, I want the unified Transactions list to only ever show my own Transactions, never another user's, so my financial data stays private — same ownership boundary as every other view in this app.

### Transfer between own accounts

21. As a user, I want to transfer money directly from one of my own Bank Accounts to another, so I don't have to fake it with two disconnected Transactions.
22. As a user, I want to pick the source account, destination account, and amount in one flow, so I don't have to visit each account separately to log the two halves.
23. As a user, I want the app to prevent transferring between two accounts of different currencies, so I never get an unintended, unconverted exchange-rate mismatch (matches the constraint already documented in `bank-accounts/SPEC.md`).
24. As a user, I want the app to prevent transferring an account into itself, so I can't accidentally create a meaningless no-op pair of Transactions.
25. As a user, I want the app to prevent a transfer that would push the source account's Unallocated balance below zero, so the same money-safety guarantee that applies to a normal expense also applies here.
26. As a user, I want a transfer to never be blocked by the destination account's state, so that receiving money never has a failure mode — only the sending side can be invalid.
27. As a user, I want both halves of a transfer to be created together or not at all, so I never end up with only one side logged if something goes wrong mid-way.
28. As a user, I want the two Transactions created by a transfer to be recognizable as a pair (e.g. by their note), so I can tell a transfer apart from an unrelated coincidental expense/income of the same amount.
29. As a user, I want a confirmation toast when a transfer succeeds, so I know both sides were logged.
30. As a user, I want to be able to edit or delete either half of a transfer afterward using the normal Edit/Delete Transaction flow, so I'm not stuck with a special-cased UI just because it originated from a transfer.

## Implementation Decisions

- **Modules touched**: `transactions` only. No schema changes to `bank-accounts`, `buckets`, or `allocations`.
- **Schema — no new columns or tables.** Per the existing note in [`bank-accounts/SPEC.md`](../../src/modules/bank-accounts/SPEC.md), a transfer is modeled as **two ordinary Transaction rows** — an `expense` on the source account, an `income` on the destination account — connected only by a shared, auto-generated note (e.g. `"Transfer to {destination account name}"` / `"Transfer from {source account name}"`). There is **no real link** between the two rows (no `transferGroupId` or similar) — this is a deliberate choice to avoid new schema for a cosmetic grouping need; a stronger link is real future work if it turns out users need to "undo a transfer" as one action (see Out of Scope).
- **New server function**: `transferBetweenAccounts`, validated against a new `transferSchema` (`sourceBankAccountId`, `destinationBankAccountId`, `amount`, optional `note`, `date`). Rejects if `sourceBankAccountId === destinationBankAccountId`, rejects if the two accounts' `currency` differ, and reuses the existing unallocated-balance check (same as `validateLogTransaction`'s expense path) against the **source account only** — the destination account never needs a check, since receiving income can never push a balance invalid. On success, inserts both Transaction rows in a single DB transaction (atomic — story 17).
- **New UI**: a `TransferDialog` (source account select, destination account select excluding whichever is picked as source, amount, optional note, date) mounted globally in `_protected.tsx`, matching the existing dialog-store pattern (`useLogTransactionDialogStore`, etc). Entry points: a "Transfer" item on `BankAccountActionsDropdownMenu` (pre-filling that account as source) and a toolbar action on the new cross-account Transactions list.
- **New route**: a top-level `/transactions` route (sibling to `/accounts` and `/buckets`), backed by a new `getTransactions({ filters })` server function that queries across all of the user's Bank Accounts (ownership enforced the same way `getBankAccounts` enforces it — scoped by `userId`, not by a single `bankAccountId`). Returns each Transaction joined with its Bank Account's `name`/`currency`. Filters: `bankAccountId`, `type`, `dateFrom`/`dateTo`, and a `search` string matched against `note`.
- **New columns**: `UNIFIED_TRANSACTIONS_COLUMNS` (Date, Account, Type, Amount, Note, Actions — reusing the existing `TransactionActionsDropdownMenu` unchanged). The existing per-account `TRANSACTIONS_COLUMNS` is untouched.
- **No new pure-function seam for the list.** `getTransactions` is a straightforward filtered read, same shape as `getBankAccounts`/`getBuckets` — nothing to unit-test in isolation beyond the query itself.
- **One pure-function seam for Transfer**: extend/reuse `getBankAccountUnallocatedBalance` exactly as `validateLogTransaction` already does for a plain expense — no new pure function needed, since a transfer's source-side validation is identical in shape to logging an expense Transaction.

## Testing Decisions

Deferred, for the same reason already recorded in `docs/specs/bank-account-crud.md` and `docs/specs/bucket-crud.md`: no test harness exists yet anywhere in this repo (`vitest` is a dependency but unconfigured — no config, no test files, no D1-test-runner infrastructure for `transferBetweenAccounts`/`getTransactions`, which call `getDB(env.db)` via `cloudflare:workers`). The one thing worth calling out: `transferBetweenAccounts`'s validation logic (same-currency check, self-transfer check, source-side unallocated check) is expressible as a small pure function separable from the DB insert, the same way `getBankAccountUnallocatedBalance` already is — a good first candidate once a Vitest seam is actually chosen for this repo.

## Out of Scope

- **Categorization/Tags** — a Category is metadata attached to a Transaction, but is its own module with its own CRUD lifecycle (create/rename/delete a named category), not a Transaction-module concern. Noted as separate, related future work — not spec'd here.
- **`Distribution`** (a saved, reusable, manually-triggered preset that logs an income Transaction and splits it via Allocations) — a separate, not-yet-designed module. See the `Distribution` entry in [`CONTEXT.md`](../../CONTEXT.md) and the Future Considerations section of [`src/modules/transactions/SPEC.md`](../../src/modules/transactions/SPEC.md). Not touched by this spec.
- **A real link between a transfer's two Transaction rows** (e.g. a `transferGroupId` column enabling "undo transfer" as one action, or preventing one half from being edited/deleted without the other). The shared-note approach is deliberately soft — see Implementation Decisions. Revisit only if that turns out to be a real, felt need.
- **Cross-currency transfers** (with conversion) — rejected outright for this pass, matching the constraint already documented in `bank-accounts/SPEC.md`.
- **Scheduled/recurring transfers** — a separate, not-yet-considered idea.
- Any change to the Bank Account, Bucket, or Allocation modules.
- Any automated tests for this pass (see Testing Decisions).

## Further Notes

- Resolved vocabulary for `Transaction` lives in `CONTEXT.md`; full module rationale lives in `src/modules/transactions/SPEC.md`. This spec assumes both as context rather than repeating them.
- Categorization and `Distribution` are real, named future work directly adjacent to this module, but deliberately not spec'd here — each needs its own module and its own pass (see Out of Scope).
