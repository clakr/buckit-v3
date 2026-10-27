---
status: ready-for-agent
module: bank-accounts
---

# Spec: Bank Account edit, delete, and creation disclosures

This project uses no issue tracker, so this file is the checklist. Its `status: ready-for-agent` frontmatter takes the place of a tracker's triage label. Update the status, for example to `in-progress` or `done`, as work goes on.

## Problem statement

A user can create and view Bank Accounts but can't fix a mistake afterward. They can't rename an account, even to correct a typo, because the "Edit" menu item exists but is disabled. They can't remove an account they no longer use either, because "Delete" is disabled too. A user also only learns that an account's currency and starting balance can never change _after_ creating it and logging transactions against it. Nothing warns them at the point where they could still avoid the mistake.

## Solution

Make Edit and Delete work on a Bank Account. Edit only renames. Delete permanently removes an account and everything logged against it, behind a typed confirmation. Add inline text to the Create Account form, so a user knows before submitting that currency and starting balance can never change afterward.

## User stories

1. As a user, I want to see a list of all my bank accounts with their current balance and unallocated balance, so that I can get an overview of my finances at a glance.
2. As a user, I want to see each account's currency, so that I know what currency its numbers are in.
3. As a user, I want to see when an account last had a transaction, so that I can spot stale or unused accounts.
4. As a user, I want to open an account's detail page and see its transactions and allocations, so that I can review its full history.
5. As a user, I want to see an account's computed balance, total allocated, and unallocated amount on its detail page, so that I know exactly where my money stands.
6. As a user, I want to create a new bank account with a name, currency, and starting balance, so that I can start tracking a new source of money.
7. As a user, I want the app to stop me from creating two accounts with the same name, ignoring case, so that I don't confuse similarly named accounts.
8. As a user, I want to be warned, before I submit, that an account's currency can never be changed later, so that I choose the right one the first time.
9. As a user, I want to be warned, before I submit, that an account's starting balance can never be edited later, so that I enter the correct opening amount the first time.
10. As a user, I want those warnings to be plain inline field text instead of an extra confirmation step or checkbox, so that creating an account stays quick.
11. As a user, I want to be stopped from entering a negative starting balance, so that I can't create an account that breaks the "balance can never be negative" rule from day one.
12. As a user, I want to rename an existing bank account, so that I can fix a typo or change how I label it, such as "Savings" to "Emergency Fund".
13. As a user, I want renaming to follow the same uniqueness rule as creation, ignoring case and excluding the account's own current name, so that I can't create a duplicate and can still save without changing anything.
14. As a user, I want the edit form to show that Currency and Starting Balance can't be edited, so that I'm not confused about why those fields are missing.
15. As a user, I want a confirmation toast when I successfully rename an account, so that I know the change was saved.
16. As a user, I want to delete a bank account I no longer use, so that closed or abandoned accounts don't clutter my accounts list.
17. As a user, I want to be told exactly how many transactions and allocations will be destroyed before I delete an account, so that I understand what the action removes.
18. As a user, I want to type the account's name to confirm deletion, so that I can't destroy an account's entire history with a single accidental click.
19. As a user, I want deleting an account to also remove all of its transactions and allocations, so that no orphaned data clutters buckets or reports.
20. As a user, I want to be redirected back to the accounts list after deleting the account I was viewing, so that I'm not left on a broken detail page for an account that no longer exists.
21. As a user, I want a confirmation toast when an account is deleted, so that I know the action completed.
22. As a user, I want my bank account's balance computed from its starting balance and its transactions, so that I never have to keep it in sync by hand.
23. As a user, I want the app to block any change that would push my unallocated balance below zero, such as logging, editing or deleting a transaction, or editing an allocation, so that I can trust the "unallocated" number is available.
24. As a user, I want a bank account's balance to never go negative, so that this module represents cash-like money I have, not credit or debt.
25. As a user, I want to eventually transfer money directly between two of my own bank accounts of the same currency, so that I don't have to fake a transfer with two unrelated transactions. This is recorded for a future pass and is not part of this spec's build.

## Implementation decisions

- **Modules touched.** Only `src/modules/bank-accounts`, in `functions.ts`, `schemas.ts`, `mutations.ts` and `components/`. No other module changes.
- **New server functions.**
  - `editBankAccount` runs behind the existing `verifyUserBankAccountMiddleware`. It validates `name`: trimmed, required, at most 100 characters, and unique per user, excluding the account's own current name. It updates `name` only. By design, this mutation accepts no other field.
  - `deleteBankAccount` runs behind the existing `verifyUserBankAccountMiddleware` and hard-deletes the `bankAccounts` row. It needs no server-side "can this be deleted" check. The existing `onDelete: "cascade"` foreign keys remove the account's `transactions` and `allocations` rows, and no rule blocks deletion (see `docs/adr/0001-hard-delete-bank-accounts.md`).
- **Existing function to extend.** `validateBankAccountName` needs an optional parameter for an account id to exclude. The edit flow can then check uniqueness while still letting the user submit without changing the name.
- **Schema changes.** None. This spec adds no `updatedAt` column, because nothing needs one yet.
- **Create dialog.** `RegisterBankAccountDialog` gets description text under the Currency and Starting Balance fields saying they're permanent. It adds no step and no checkbox, and the form's fields and submit flow stay the same.
- **Edit dialog.** A new dialog with a single Name field, pre-filled with the current value. It follows the Create dialog's name field, with debounced async validation through the extended `validateBankAccountName`. It replaces the disabled "Edit" item in `BankAccountActionsDropdownMenu`.
- **Delete dialog.** A new, dedicated confirmation dialog. It does **not** use the app's existing `confirm()` store, which is a plain Yes/No dialog. Nothing in this codebase uses typed confirmation yet, because `deleteTransaction` and `deleteAllocation` both use the plain dialog. This extra friction is a one-off for Bank Account deletion, and other features shouldn't copy it without a separate discussion. The dialog must state exactly how many transactions and allocations the delete destroys. The delete button stays disabled until the typed input matches the account's name exactly. It replaces the disabled "Delete" item in `BankAccountActionsDropdownMenu`.
- **Navigation after delete.** Deleting from the account detail page redirects to `/accounts`. Deleting from the accounts list removes the row, with no navigation.

## Testing decisions

Deferred for this pass, because the developer asked to. They are new to testing and don't want to take it on alongside everything else here. Recorded for whenever someone picks it up:

- `getBankAccountFigures` in `src/modules/bank-accounts/utils.ts` is the one part of this module that is easy to test in isolation. It is a pure function that takes the totals and a pending addition and returns `{ balance, unallocated, totalEarmarked }`. It doesn't touch the database or the Cloudflare Workers runtime, so plain Vitest works with no mocking. It replaced `getBankAccountUnallocatedBalance` on 2026-10-14, and the SQL totals it receives come from `figures.server.ts`.
- This module's D1-backed server functions, `registerBankAccount` plus the new `editBankAccount` and `deleteBankAccount`, have no test setup yet. They call `getDB(env.db)` from `cloudflare:workers`, so testing them needs `@cloudflare/vitest-pool-workers` or something like it. That would be new tooling for the whole repo, not a decision for one module, so this spec doesn't add it.

## Out of scope

- Transfers between the user's own bank accounts. User Story 25 records them, and it's already decided that both accounts must share a currency.
- Account types and overdrafts. These are rejected for this entity and belong to a future Debt module.
- An `updatedAt` column or audit trail on `bankAccounts`, because nothing needs one yet.
- Editing currency or starting balance after creation, in any form.
- Soft-delete or archive. ADR 0001 rejects it in favor of hard delete.
- Automated tests for this pass. See Testing decisions.
- Renaming the module folder and identifiers from `accounts` to `bank-accounts`. That was done separately, before this spec.

## Further notes

- `CONTEXT.md` at the repo root holds the resolved vocabulary. `src/modules/bank-accounts/SPEC.md` holds the full module rationale, including the entity shape, invariants and behaviors verified as correct. `docs/adr/0001-hard-delete-bank-accounts.md` records the delete-policy trade-off. Read those before implementing, because this spec assumes them instead of repeating them.
- An earlier version of this module, with working Edit and Delete, existed until commit `bc77e36` deleted it. Its Delete _blocked_ deletion instead of cascading. Cascading here is a deliberate reversal, so read the ADR before "fixing" it back.
- **2026-10-24. Register and Edit Account open in Drawers, and Delete Account uses a Dialog handle.** Stories 6 to 21 are unchanged. Register Account and Edit Account are now `RegisterBankAccountDrawer` in `register-bank-account-drawer.tsx` and `EditBankAccountDrawer` in `edit-bank-account-drawer.tsx`. Like Record Debt (`docs/specs/debt-module.md`, 2026-10-22 and 2026-10-23), each slides in from the right on desktop and up from the bottom with a swipe handle below 768px. The form scrolls, and Submit and Cancel stay pinned at the bottom. With four Drawers repeating the `useIsMobile` wiring, it moved into `ResponsiveDrawer` in `drawer.tsx`, which Record Debt and Edit Debt now use too. Delete Account stays a Dialog, driven by `deleteBankAccountDialogHandle` from `createDialogHandle()`. None of the three has a `createDialogStore` store, so none are left in the Bank Accounts module. Openers pass the payload to the handle. The Accounts page's Register Account buttons and the account page's Edit button are `DrawerTrigger`s, so focus returns to them. The row menu, Record Debt and Add Goal call `openWithPayload`. Register Account's payload is `{ currency }`, and the Accounts page passes `{ currency: "PHP" }`, which replaces the store's default from 2026-10-20. Each body (`RegisterBankAccountForm`, `EditBankAccountForm`, `DeleteBankAccountForm`) mounts inside the popup with its payload fields as props and unmounts once the close animation ends, so the open-state flags and resets on close are gone. A dirty dismiss of either Drawer, including by swipe, still asks "Discard new account?" or "Discard editing account?". "Discard" resets the form and then closes. Delete Account's impact query stays disabled after a successful delete, so the closing Dialog doesn't refetch the deleted account and flash "Account not found". The "Account not found" Close buttons are `DrawerClose` and `DialogClose`. Opened from Record Debt, Register Account stacks on top of it as a second Drawer, and closing it returns to Record Debt with its form intact. The two are sibling Roots, not Base UI nested drawers, so Record Debt doesn't scale back behind it.
- **2026-10-27. Register Account nests inside Record Debt and Add Goal.** Stories 6 to 21 are unchanged. This replaces the 2026-10-24 note that the two call `openWithPayload` and open Register as a sibling Root. Base UI only nests a Drawer whose Root renders inside the parent's tree, so `NestedRegisterBankAccountDrawer` takes a `handle` and each parent renders it inside its own Root on a local handle (Record Debt inside its `DrawerContent`, Add Goal beside it), opened by a `DrawerTrigger` with `{ currency }`. The parent scales back and peeks behind Register, and closing Register returns focus to the button. It takes an optional `finalFocus` for when that button is gone after a save. Add Goal uses it, and Record Debt lets focus land in its form (`docs/specs/debt-module.md` and `docs/specs/goal-module.md`, 2026-10-27). The Accounts page keeps the global `RegisterBankAccountDrawer` on `registerBankAccountDrawerHandle`.
