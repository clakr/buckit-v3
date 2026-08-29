---
status: ready-for-agent
module: bank-accounts
---

# Spec: Bank Account — Edit, Delete, and Creation Disclosures

No issue tracker is used for this project. This file is the actionable checklist — its `status: ready-for-agent` frontmatter stands in for the triage label a tracker would normally carry. Update the status (e.g. `in-progress`, `done`) as work proceeds.

## Problem Statement

A user can create and view Bank Accounts, but cannot fix a mistake afterward. Renaming an account (even to correct a typo) is impossible — the "Edit" menu item exists but is disabled. Removing an account they no longer use is equally impossible — "Delete" is disabled too. Worse, a user only discovers that an account's currency and starting balance can never be changed _after_ they've already created the account and started logging transactions against it — there's no warning at the point where the mistake would actually be prevented.

## Solution

Add Edit (rename only) and Delete (permanently remove an account and everything logged against it, protected by typed confirmation) as working actions on a Bank Account. Add inline disclosure text to the Create Account form so a user knows, before submitting, that currency and starting balance can never be changed afterward.

## User Stories

1. As a user, I want to see a list of all my bank accounts with their current balance and unallocated balance, so that I can get an overview of my finances at a glance.
2. As a user, I want to see each account's currency, so that I know what currency its numbers are in.
3. As a user, I want to see when an account last had a transaction, so that I can spot stale or unused accounts.
4. As a user, I want to open an account's detail page and see its transactions and allocations, so that I can review its full history.
5. As a user, I want to see an account's computed balance, total allocated, and unallocated amount on its detail page, so that I understand exactly where my money stands.
6. As a user, I want to create a new bank account with a name, currency, and starting balance, so that I can start tracking a new source of money.
7. As a user, I want the app to prevent me from creating two accounts with the same name (case-insensitively), so that I don't confuse similarly-named accounts.
8. As a user, I want to be warned, before I submit, that an account's currency can never be changed later, so that I choose the right one the first time.
9. As a user, I want to be warned, before I submit, that an account's starting balance can never be edited later, so that I enter the correct opening amount the first time.
10. As a user, I want those warnings to be simple inline field text rather than an extra confirmation step or checkbox, so that creating an account stays quick and low-friction.
11. As a user, I want to be prevented from entering a negative starting balance, so that I can't create an account that violates the "balance can never be negative" rule from day one.
12. As a user, I want to rename an existing bank account, so that I can fix a typo or reflect a change in how I think about it (e.g. "Savings" → "Emergency Fund").
13. As a user, I want renaming to enforce the same uniqueness rule as creation (case-insensitive, excluding the account's own current name), so that I can't create a duplicate and can still save without changing anything.
14. As a user, I want to see, on the edit form, that Currency and Starting Balance are not present/editable, so that I'm not confused about why those fields are missing.
15. As a user, I want a confirmation toast when I successfully rename an account, so that I know the change was saved.
16. As a user, I want to delete a bank account I no longer use, so that my accounts list doesn't accumulate clutter from closed or abandoned accounts.
17. As a user, I want to be told exactly how many transactions and allocations will be destroyed before I delete an account, so that I understand the scope of the action.
18. As a user, I want to type the account's name to confirm deletion, so that I can't destroy an account's entire history with a single accidental click.
19. As a user, I want deleting an account to also remove all of its transactions and allocations, so that I don't end up with orphaned data cluttering buckets or reports.
20. As a user, I want to be redirected back to the accounts list after deleting the account I was currently viewing, so that I'm not left on a broken detail page for an account that no longer exists.
21. As a user, I want a confirmation toast when an account is deleted, so that I have feedback the action completed.
22. As a user, I want my bank account's balance to be computed automatically from its starting balance and its transactions, so that I never have to manually keep it in sync.
23. As a user, I want the app to prevent any change (logging a transaction, editing a transaction, deleting a transaction, editing an allocation) that would push my unallocated balance below zero, so that I can trust the "unallocated" number is always actually available.
24. As a user, I want a bank account's balance to never go negative, so that this module accurately represents cash-like money I actually have, not credit or debt.
25. As a user, I want to eventually transfer money directly between two of my own bank accounts of the same currency, so that I don't have to fake a transfer using two unrelated transactions. (Captured for a future pass — not part of this spec's build.)

## Implementation Decisions

- **Modules touched**: `src/modules/bank-accounts` only (`functions.ts`, `schemas.ts`, `mutations.ts`, `components/`). No other module needs to change.
- **New server functions**:
  - `editBankAccount` — behind the existing `verifyUserBankAccountMiddleware`. Validates `name` (trim, required, max 100 chars, unique per user excluding the account's own current name). Updates `name` only. No other field is accepted by this mutation, by design.
  - `deleteBankAccount` — behind the existing `verifyUserBankAccountMiddleware`. Performs a hard delete of the `bankAccounts` row. No server-side "can this be deleted" guard is needed — the existing `onDelete: "cascade"` foreign keys remove the account's `transactions` and `allocations` rows automatically, and there is no blocking rule (see `docs/adr/0001-hard-delete-bank-accounts.md`).
- **Existing function to extend**: `validateBankAccountName` needs an optional "exclude this account id" parameter so the edit flow can validate uniqueness while still allowing a no-op save (submitting without changing the name).
- **Schema changes**: none. No `updatedAt` column is being added (explicitly deferred — no current driver for it).
- **UI — Create**: `AddBankAccountDialog` gets inline helper/description text under the Currency and Starting Balance fields stating they're permanent. No new step, no checkbox gate — the form's shape and submit flow are otherwise unchanged.
- **UI — Edit**: new dialog with a single Name field, pre-filled with the current value, using the same pattern as the Create dialog's name field (debounced async validation calling the extended `validateBankAccountName`). Wires into the currently-`disabled` "Edit" item in `BankAccountActionsDropdownMenu`.
- **UI — Delete**: new dedicated confirmation dialog — **not** the existing lightweight `confirm()` store used elsewhere in the app (that's a plain Yes/No dialog; there's no precedent in this codebase for typed confirmation, since `deleteTransaction`/`deleteAllocation` both use the plain version). This is a deliberate, one-off escalation in friction specific to Bank Account deletion, not a pattern to carry elsewhere without a separate discussion. The dialog body must state the exact count of transactions and allocations that will be destroyed, and the destructive action stays disabled until the typed input exactly matches the account's name. Wires into the currently-`disabled` "Delete" item in `BankAccountActionsDropdownMenu`.
- **Post-delete navigation**: deleting from the account detail page redirects to `/accounts`. Deleting from the accounts list just removes the row — no navigation needed.

## Testing Decisions

Deferred for this pass, by explicit request — the developer is new to this and doesn't want to take it on alongside everything else here. Recorded for whenever it's picked back up:

- The one clean seam in this module is `getBankAccountUnallocatedBalance` (`src/modules/bank-accounts/utils.ts`) — a pure function of `(startingBalance, transactions, allocations) → { balance, unallocated, totalAllocated }`, already isolated from the database and the Cloudflare Workers runtime. It's the natural starting point: plain Vitest, no mocking required.
- No test harness exists yet for the D1-backed server functions in this module (`addBankAccount`, and the new `editBankAccount`/`deleteBankAccount`). They call `getDB(env.db)` via `cloudflare:workers`, which needs `@cloudflare/vitest-pool-workers` (or equivalent) to exercise in a test. That's new infrastructure for the whole repo, not a one-module decision — intentionally not introduced here.

## Out of Scope

- Transfers between own bank accounts (captured in User Story 25; same-currency-only constraint already decided for whenever it's built).
- Account types / overdraft support — rejected outright for this entity; belongs to a future, unbuilt Debt module.
- `updatedAt` column / audit trail on `bankAccounts` — no current driver.
- Editing currency or starting balance after creation, in any form.
- Soft-delete / archive — explicitly rejected in favor of hard delete (see ADR 0001).
- Any automated tests for this pass (see Testing Decisions).
- The module rename (`accounts` → `bank-accounts` folder and identifiers) — already completed separately, prior to this spec.

## Further Notes

- Resolved vocabulary lives in `CONTEXT.md` (repo root). Full module rationale (entity shape, invariants, verified-correct behaviors) lives in `src/modules/bank-accounts/SPEC.md`. The delete-policy trade-off is recorded in `docs/adr/0001-hard-delete-bank-accounts.md`. Read those before implementing — this spec assumes their context rather than repeating it.
- An earlier version of this exact module (with working Edit and Delete) existed and was deleted in commit `bc77e36`. Its Delete policy _blocked_ deletion instead of cascading — that's a deliberate reversal here, not an oversight; see the ADR before "fixing" it back.
