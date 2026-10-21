---
status: ready-for-agent
module: transactions
---

# Spec: Transaction list across accounts, search and transfer

This project uses no issue tracker, so this file is the checklist. Its `status: ready-for-agent` frontmatter takes the place of a tracker's triage label. Update the status, for example to `in-progress` or `done`, as work goes on.

## Problem statement

Today a user can only see Transactions inside one Bank Account's detail page, in the `TRANSACTIONS_COLUMNS` tab. A user with more than one account can't see, filter or search their activity across accounts in one place. The seeded data already has two accounts, "Chase Checking" and "Wise EUR Account".

Moving money between two of a user's own Bank Accounts has its own problem. Today the user creates two unrelated Transactions by hand, an expense on one account and an income on the other, and nothing ties them together. It's easy to get wrong, with mismatched amounts or a forgotten side, and nothing shows that the two are related.

## Solution

Two additions to the Transactions module:

1. A Transactions list across all accounts, filterable by account, type and date range, with a text search over the note.
2. A **Transfer** action. The user picks a source and a destination Bank Account, which must share a currency (see Implementation decisions), and an amount. The app creates two Transactions in one atomic write, an expense on the source and an income on the destination, with notes that mark them as a transfer pair.

## User stories

### Existing behavior (already implemented)

_These aren't new work. They're recapped here so this file describes all of the Transactions module's behavior, not only what's changing. `src/modules/transactions/SPEC.md` has the full detail._

1. As a user, I want to log a new Transaction, income or expense, against one of my Bank Accounts with an amount, date, and optional note, so that I can record money moving in or out.
2. As a user, I want the app to stop me from logging an expense that would push the account's Unallocated balance below zero, so I can trust that number is really available.
3. As a user, I want to see each Transaction's type, amount, date, and note on its Bank Account's detail page, so I can review the account's activity.
4. As a user, I want to edit an existing Transaction's type, amount, date, or note, so I can correct a mistake.
5. As a user, I want editing a Transaction to follow the same Unallocated ≥ 0 rule as logging one, so I can't make the account's numbers invalid after the fact.
6. As a user, I want to delete a Transaction I logged by mistake, so it no longer counts toward the account's Balance.
7. As a user, I want to be told exactly what will be removed, the type and amount, before I delete a Transaction, so I understand what the action removes.
8. As a user, I want deletion blocked if removing the Transaction would leave the account's Unallocated balance negative, so the rule holds even when I undo history.
9. As a user, I want a plain yes/no confirmation when deleting a Transaction, not a typed confirmation, because deleting one Transaction doesn't delete any other records.
10. As a user, I want a Transaction's amount to always be in its Bank Account's currency, because a Transaction has no currency of its own.

### List and search across accounts

11. As a user with several Bank Accounts, I want to see all my Transactions from every account in one place, so I don't have to check each account's detail page separately.
12. As a user, I want each row in that list to show which Bank Account it belongs to, so I can tell rows apart.
13. As a user, I want to filter that list by Bank Account, so I can see only one account without leaving the list.
14. As a user, I want to filter that list by type, income or expense, so I can see only spending or only earnings.
15. As a user, I want to filter that list by a date range, so I can review a specific period, such as last month.
16. As a user, I want to search that list by note text, so I can find a specific Transaction I remember details about.
17. As a user, I want that list sorted by date with the most recent first by default, as the per-account Transactions tab already is, so both behave the same.
18. As a user, I want to open, edit, or delete a Transaction directly from that list, so I don't have to go to its account first.
19. As a user, I want to log a new Transaction directly from that list, picking the account it belongs to, so I don't have to find the account first.
20. As a user, I want the Transactions list to only ever show my own Transactions, never another user's, so my financial data stays private. Every other view in this app has the same ownership rule.

### Transfer between own accounts

21. As a user, I want to transfer money directly from one of my own Bank Accounts to another, so I don't have to fake it with two disconnected Transactions.
22. As a user, I want to pick the source account, destination account, and amount in one flow, so I don't have to visit each account separately to log the two halves.
23. As a user, I want the app to block transfers between two accounts of different currencies, so I never get an unconverted amount by mistake. `bank-accounts/SPEC.md` already documents this rule.
24. As a user, I want the app to block a transfer from an account into itself, so I can't create a pointless pair of Transactions by accident.
25. As a user, I want the app to block a transfer that would push the source account's Unallocated balance below zero, so a transfer gets the same protection as a normal expense.
26. As a user, I want the destination account's state to never block a transfer, because receiving money can't fail. Only the sending side can be invalid.
27. As a user, I want both halves of a transfer created together or not at all, so I never end up with only one side logged if something fails halfway.
28. As a user, I want the two Transactions a transfer creates to be recognizable as a pair, such as by their note, so I can tell a transfer apart from an unrelated expense and income that happen to share an amount.
29. As a user, I want a confirmation toast when a transfer succeeds, so I know both sides were logged.
30. As a user, I want to edit or delete either half of a transfer afterward through the normal Edit and Delete Transaction flow, so a transfer doesn't need its own special UI.

## Implementation decisions

- **Modules touched.** Only `transactions`. No schema changes to `bank-accounts`, `buckets` or `allocations`.
- **Schema: no new columns or tables.** As [`bank-accounts/SPEC.md`](../../src/modules/bank-accounts/SPEC.md) already notes, a transfer is **two ordinary Transaction rows**, an `expense` on the source account and an `income` on the destination. Only their generated notes connect them, such as `"Transfer to {destination account name}"` and `"Transfer from {source account name}"`. There is **no real link** between the two rows, such as a `transferGroupId`. That choice is deliberate, to avoid new schema for what is only a grouping in the UI. A stronger link is future work, if users turn out to need to undo a transfer as one action (see Out of scope).
- **New server function `transferBetweenAccounts`.** A new `transferSchema` validates its input: `sourceBankAccountId`, `destinationBankAccountId`, `amount`, an optional `note`, and `date`. It rejects the transfer if `sourceBankAccountId === destinationBankAccountId` or if the two accounts' `currency` differs. It reuses the existing unallocated-balance check, as `validateLogTransaction`'s expense path does, on the **source account only**. The destination never needs a check, because income can never make a balance invalid. On success, it inserts both Transaction rows in one database transaction, so the write is atomic (story 27).
- **New UI.** A `TransferDialog` with a source account select, a destination account select that leaves out the chosen source, an amount, an optional note, and a date. `_protected.tsx` mounts it for the whole app, following the existing dialog-store pattern such as `useLogTransactionDialogStore`. It opens from a "Transfer" item on `BankAccountActionsDropdownMenu`, which pre-fills that account as the source, and from a toolbar action on the new Transactions list.
- **New route.** A top-level `/transactions` route, next to `/accounts` and `/buckets`. A new `getTransactions({ filters })` server function backs it and queries across all of the user's Bank Accounts. It checks ownership the same way `getBankAccounts` does, by scoping to `userId`, not by a single `bankAccountId`. It returns each Transaction with its Bank Account's `name` and `currency`. Its filters are `bankAccountId`, `type`, `dateFrom` and `dateTo`, and a `search` string matched against `note`.
- **New columns.** `UNIFIED_TRANSACTIONS_COLUMNS` has Date, Account, Type, Amount, Note and Actions, and reuses the existing `TransactionActionsDropdownMenu` unchanged. The existing per-account `TRANSACTIONS_COLUMNS` stays as it is.
- **The list needs no pure function for tests.** `getTransactions` is a plain filtered read, the same shape as `getBankAccounts` and `getBuckets`, so the only thing to test is the query itself.
- **Route wiring.** This route's query key comes from its filters, which `validateSearch` reads as `bankAccountId`, `type`, `dateFrom`, `dateTo` and `search`. Use `loaderDeps` and the route's `context()` to build the filtered `getTransactions` queryOptions once, and share them between the loader and the component. If each built them from the search params on its own, the two could differ. TkDodo's post [reliable query prefetching with TanStack Router](https://tkdodo.eu/blog/reliable-query-prefetching-with-tanstack-router) describes that bug.
- **One check for Transfer.** Call `checkUnallocated` with an `add-transaction` expense on the source account, exactly as `logTransaction` does for a plain expense. No new check is needed, because checking a transfer's source is the same as checking an expense.

## Testing decisions

Deferred, for the reason `docs/specs/bank-account-crud.md` and `docs/specs/bucket-crud.md` already give. The repo has no test setup yet. `vitest` is a dependency, but there is no config, no test files, and no D1 test runner for `transferBetweenAccounts` and `getTransactions`, which call `getDB(env.db)` from `cloudflare:workers`. One thing stands out. `transferBetweenAccounts`'s validation, meaning the same-currency check, the self-transfer check and the source's unallocated check, can be a small pure function apart from the database insert, as `getBankAccountFigures` already is. It's a good first candidate once the repo picks a way to run Vitest.

## Out of scope

- **Categories and tags.** A Category is metadata on a Transaction, but it needs its own module with its own lifecycle for creating, renaming and deleting named categories. It doesn't belong in the Transaction module. It is related future work, and this spec doesn't specify it.
- **`Distribution`**, a saved preset the User triggers by hand that logs an income Transaction and splits it through Allocations. It is a separate module, not designed yet. See the `Distribution` entry in [`CONTEXT.md`](../../CONTEXT.md) and the Future considerations section of [`src/modules/transactions/SPEC.md`](../../src/modules/transactions/SPEC.md). This spec doesn't touch it.
- **A real link between a transfer's two Transaction rows**, such as a `transferGroupId` column. It would allow undoing a transfer as one action, or stop one half from being edited or deleted without the other. The shared note is a weak link on purpose (see Implementation decisions). Revisit only if users clearly need it.
- **Transfers between currencies, with conversion.** Rejected for this pass, matching the rule `bank-accounts/SPEC.md` already documents.
- **Scheduled or recurring transfers.** A separate idea nobody has considered yet.
- Any change to the Bank Account, Bucket or Allocation modules.
- Automated tests for this pass. See Testing decisions.

## Further notes

- `CONTEXT.md` defines `Transaction`, and `src/modules/transactions/SPEC.md` holds the full module rationale. This spec assumes both instead of repeating them.
- Categories and `Distribution` are named future work right next to this module, but this spec leaves them out on purpose. Each needs its own module and its own pass (see Out of scope).
- **2026-10-15. Delete and edit failures say what went wrong.** Stories 6 and 7 still hold. Story 7's message also names anything that goes with the Transaction. A Debt repayment it backs is deleted with it, so the Debt's outstanding goes back up. A Debt it funded stays, with no source account. Deleting a Transaction that is already gone shows "Can't Delete This Transaction" with the reason, where before the click did nothing. For a missing Transaction, the Edit dialog shows "Transaction not found" with Close, instead of "check your connection" with Retry. Its submit check shows the real reason, such as the Transaction having been deleted in the meantime, instead of a generic message.
- **2026-10-15. Editing a Linked Transaction follows its Debt.** Story 5 still holds, so every edit keeps Unallocated at or above zero. An ordinary Transaction's type, amount, date and note stay editable. For a Transaction a Debt depends on (see **Linked Transaction** in `CONTEXT.md`), the type is fixed, an origination's amount is fixed, and a repayment can't be dated before its Debt. The Edit dialog disables those fields and says why, and the server rejects the change with the reason.
- **2026-10-15. Log and Edit check once, at the write.** Stories 4 and 5 still hold. The dialogs no longer call a separate `validateLogTransaction` or `validateEditTransaction` before submitting, and both functions are gone. The write runs the Unallocated check, plus the Linked Transaction rules for an edit, and rejects with the reason. The failure toast shows that reason, such as "Failed to Log Transaction: This change would result in a negative unallocated balance…", and the dialog stays open with the input. Each submit is one request instead of two.
