---
module: withdrawals
---

# Spec: Withdrawal

The work is tracked as GitHub issues on `clakr/buckit-v3`, which hold its status. This file holds the design.

| Issue                                             | Ticket                                                                 | Stories    | Blocked by |
| ------------------------------------------------- | ---------------------------------------------------------------------- | ---------- | ---------- |
| [#1](https://github.com/clakr/buckit-v3/issues/1) | Log a Withdrawal and see it on the Bucket                              | 9 to 18    | none       |
| [#2](https://github.com/clakr/buckit-v3/issues/2) | Make a Withdrawal's linked Transaction behave on the Bank Account page | 19, 23, 24 | #1         |
| [#3](https://github.com/clakr/buckit-v3/issues/3) | Edit and delete a Withdrawal from the Bucket page                      | 20 to 22   | #1         |
| [#4](https://github.com/clakr/buckit-v3/issues/4) | Block Allocation edits and deletes that leave a Bucket below zero      | 25         | #1         |
| [#5](https://github.com/clakr/buckit-v3/issues/5) | Account for Withdrawals when deleting a Bucket or Bank Account         | 26 to 28   | #1         |

## Problem statement

A User sets money aside in a Bucket, such as a tithe saved every payday, and eventually spends all or part of it. The app has no way to do that. Before this spec, a Bucket only accumulated, and money left it only when an Allocation was edited or deleted. To spend the tithe, the User had to delete or shrink each Allocation and then log an `expense` Transaction on the Bank Account, in that order, because logging the expense first fails the `Unallocated ≥ 0` rule. That route takes several steps, fails if done in the wrong order, and erases the record that the money was ever set aside.

## Solution

A **Withdrawal** spends money out of a Bucket in one action. The User picks the Bucket, one Bank Account that holds money in it, an amount up to what the Bucket holds from that account, a date and an optional note. The app writes an `expense` Transaction on the Bank Account and a Withdrawal that points to it. The Bucket's Subtotal drops by the amount, the Bank Account's Balance drops by the amount, and its Unallocated stays the same. Allocations are untouched, so the Bucket keeps the full history of what was set aside and what was spent.

[ADR 0004](../adr/0004-withdrawals-spend-from-buckets.md) records why this relaxes the old "never spend from a Bucket" boundary, and why Transactions still never attach to a Bucket. `CONTEXT.md` defines `Withdrawal`.

A grilling and domain-modeling session on 2026-10-21 produced this spec. Story 29 (ownership) applies to every ticket.

## User stories

### Existing behavior (already implemented)

_These aren't new work. They're recapped here so this file describes all the behavior a Withdrawal touches. `src/modules/allocations/SPEC.md`, `src/modules/buckets/SPEC.md` and `src/modules/transactions/SPEC.md` have the full detail. Where this spec changes one, the change is a new story further down._

1. As a user, I want to log an Allocation from one of my Bank Accounts into a Bucket, with an amount, date and optional note, so I can set money aside.
2. As a user, I want the app to stop any Allocation or Transaction log, edit or delete that would push a Bank Account's Unallocated below zero.
3. As a user, I want to edit an Allocation's amount, date or note, and delete one behind a plain yes/no confirmation.
4. As a user, I want it to stay true that an Allocation can't move to a different Bucket or Bank Account. Delete it and log a new one instead.
5. As a user, I want a Bucket to show one Subtotal per currency, never a single total, because the app doesn't convert currencies.
6. As a user, I want the Bucket detail page to list every Allocation into that Bucket.
7. As a user, I want deleting a Bucket to sit behind a typed confirmation of its name, and to preview how much returns to each Bank Account's Unallocated.
8. As a user, I want a Transaction that a Debt depends on to show that link, keep its type fixed, and say what deleting it does to the Debt.

### Logging a Withdrawal

9. As a user, I want a "Withdraw" action in a Bucket's menu, so I can spend money I set aside in one step.
10. As a user, I want the Withdraw dialog to let me pick only Bank Accounts this Bucket holds money from, each shown with how much it holds, so I can't withdraw from an account that put nothing in.
11. As a user, I want to withdraw any amount up to what the Bucket holds from the chosen Bank Account, so I can give part of the tithe now and the rest later.
12. ~~As a user, I want a "Take all" shortcut that fills in everything the Bucket holds from the chosen Bank Account.~~ _Dropped after #1 shipped, because the button looked out of place. The dialog shows the held figure next to the amount, so the user types it instead._
13. As a user, I want a Withdrawal to draw from exactly one Bank Account. To empty a Bucket funded from two accounts, I log two Withdrawals. This way one Withdrawal never mixes currencies.
14. As a user, I want to give a Withdrawal a date, defaulting to today, and an optional note, such as "Tithe, October".
15. As a user, I want the dialog to stop me as I type if the amount is more than the Bucket holds from that Bank Account, and the server to check again on save, with a message naming the Bucket, the Bank Account and the most I can withdraw.
16. As a user, I want logging a Withdrawal to write an `expense` Transaction on the Bank Account, so my Balance shows the money left, and to leave the account's Unallocated unchanged, because the money leaves the Balance and the earmark together.

### Seeing Withdrawals

17. As a user, I want the Bucket detail page to have "Allocations" and "Withdrawals" tabs, so I can see what I set aside and what I spent from it separately.
18. As a user, I want a Bucket's Subtotals, on its detail page and in the Buckets list, to show what it holds now (allocated minus withdrawn), so the figure matches what I can still withdraw.
19. As a user, I want a Withdrawal's Transaction to appear in the Bank Account's Transactions tab like any `expense`, marked with a link to the Bucket it came from, so I can tell where it came from.

### Editing and deleting a Withdrawal

20. As a user, I want to edit a Withdrawal's amount, date or note from the Bucket page, with the same limit as logging it (story 15), so I can correct a mistake.
21. As a user, I want it to stay true that a Withdrawal can't move to a different Bucket or Bank Account. I delete it and log a new one, as with an Allocation.
22. As a user, I want to delete a Withdrawal from the Bucket page behind a plain yes/no confirmation that says its expense Transaction will be deleted too and the money goes back into the Bucket, because nothing else depends on it.
23. As a user, I want editing the linked Transaction from the Bank Account page to keep its type fixed at `expense`, and an amount change to run the same check as story 15, so the two sides can never disagree.
24. As a user, I want deleting the linked Transaction from the Bank Account page to delete the Withdrawal too, and its confirmation to say the money goes back into the Bucket.

### How Withdrawals change existing rules

25. As a user, I want the app to stop an Allocation edit or delete that would leave a Bucket holding less than nothing from a Bank Account. For example: I allocate ₱10,000 from Savings, withdraw ₱10,000, then try to delete the Allocation. The message names the Bucket and Bank Account and says how much of that Allocation is already withdrawn. _(This changes story 3: deleting an Allocation used to always succeed.)_
26. As a user, I want deleting a Bucket to delete its Withdrawals but keep their `expense` Transactions as plain expenses on my Bank Accounts, because that money left the account. The typed confirmation says how many Withdrawals will be removed and that their expenses stay. _(This changes story 7.)_
27. As a user, I want the Bucket delete preview to show each Bank Account getting back only what the Bucket still holds from it (allocated minus withdrawn), not everything ever allocated. _(This changes story 7.)_
28. As a user, I want deleting a Bank Account to also delete the Withdrawals drawn from it, along with its Transactions and Allocations, and its typed confirmation to count them.

### Ownership

29. As a user, I want every Withdrawal view and action limited to my own Withdrawals, never another user's, as everywhere else in this app.

## Implementation decisions

- **Modules touched.** A new `withdrawals` module. Small changes in `allocations`, `buckets`, `bank-accounts` and `transactions`, described below. The `transactions` table is **not** changed and gains no `bucketId` (ADR 0004).
- **New table `withdrawals`.** Its columns:
  - `id`, generated (uuidv7).
  - `bucketId`, a foreign key to `buckets.id`, `NOT NULL`, `ON DELETE CASCADE`.
  - `transactionId`, a foreign key to `transactions.id`, `NOT NULL`, `UNIQUE`, `ON DELETE CASCADE`. A Withdrawal always has a Bank Account, so it always has a Transaction. No case leaves it null. Deleting the Transaction deletes the Withdrawal, and deleting a Bank Account removes its Transactions and so its Withdrawals.
  - `createdAt`.

  It has no `amount`, `date`, `note` or `bankAccountId`. They live only on the linked Transaction, which keeps one form of Repayment's storage (`src/modules/repayments/storage.server.ts`) without the second, unlinked form. Reads join through `transactions` for the amount, date, note and Bank Account, and through `bankAccounts` for the currency.

- **Logging writes both rows together.** `logWithdrawal` inserts the `expense` Transaction and the `withdrawals` row in one D1 `batch`, so neither can exist without the other. Like `logAllocation`, it attaches both `verifyUserBucketMiddleware` and `verifyUserBankAccountMiddleware` (ADR 0003).
- **New rule: what a Bucket holds from a Bank Account can't go negative.** For each (Bucket, Bank Account) pair: `Σ allocations − Σ withdrawals ≥ 0`. One server-side check in the Bucket figures module enforces it, and runs before the write in:
  - `logWithdrawal` and `editWithdrawal`. This is also the limit in story 15.
  - `editTransaction`, when the Transaction backs a Withdrawal (story 23).
  - `editAllocation` and `deleteAllocation` (story 25). `deleteAllocation` used to need no check. `src/modules/allocations/SPEC.md` has to drop the statement that delete can only increase Unallocated and so needs no check.

  Its error message names the Bucket, the Bank Account and the most the change can be. The dialogs show the same figure and compare against it as the user types, like the Available figure for Allocations.

- **Unallocated formula.** `Balance − Σ allocations + Σ withdrawals`, per Bank Account. In `src/modules/bank-accounts/figures.server.ts`, net Withdrawals against the allocated total (join `withdrawals` through `transactions` on `bankAccountId`), so every caller of `getBankAccountFigures` agrees. A Withdrawal log, edit or delete moves Balance and the net allocated total by the same amount, so it never changes Unallocated and needs no Unallocated check. Make sure the existing `replace-transaction` and `remove-transactions` checks don't reject a Withdrawal's Transaction edit or delete because they only see the Balance side. Either teach `BankAccountChange` about Withdrawals or skip the Unallocated check for a Transaction that backs a Withdrawal.
- **Bucket figures.** `getBucketsWithFigures` returns `allocatedByBankAccount`, and its Subtotals, as allocated minus withdrawn per Bank Account. Rename it to something like `heldByBankAccount` so the name stays accurate. The Buckets list, the detail page, the delete preview and the Withdraw dialog's picker all read it.
- **Linked Transaction.** Extend `TransactionLink` in `src/modules/transactions/linked.server.ts` with a third kind, `{ kind: "withdrawal"; bucket: Pick<Bucket, "id" | "name"> }`. `getTransactionLocks` locks the type and leaves the amount editable. `describeLinkedTransactionDeletion` says the money goes back into the Bucket. The Bank Account's Transactions table shows the link (story 19).
- **Editing.** `editWithdrawalSchema` is a `strictObject` of `withdrawalId`, `amount`, `date` and `note`, with no `bucketId` or `bankAccountId` (story 21). It edits the linked Transaction through the Transaction module's own update path, as `editRepayment` does. It looks the Withdrawal up by both `withdrawalId` **and** `bucketId`, so `verifyUserBucketMiddleware` alone can't be used to edit someone else's Withdrawal. That is the same IDOR shape as the 2026-10-12 `editRepayment` note in `docs/specs/debt-module.md`. Alternatively, add a `verifyUserWithdrawalMiddleware`.
- **Deleting.** `deleteWithdrawal` deletes the linked Transaction, and the cascade removes the Withdrawal. Plain `confirm()`, because nothing references a Withdrawal. The Bucket and the Bank Account's Unallocated can only gain, so it needs no check.
- **Bucket deletion.** `withdrawals.bucketId` cascades, and the linked Transactions stay. `loadBucketDeletionImpact` adds a `withdrawalCount`, and its per-account `unallocatedAfter` uses what the Bucket holds (story 27). ADR 0002 still holds for everything the Bucket owns.
- **Bank Account deletion.** It already cascades Transactions, which now cascade Withdrawals. Its deletion impact preview (`src/modules/bank-accounts/deletion.server.ts`) adds a Withdrawal count (story 28).
- **UI.**
  - `WithdrawDialog` opens only from a Bucket's menu, on the list and the detail page.
  - Its Bank Account picker lists the accounts in `heldByBankAccount` with a positive amount. Reuse `BankAccountSelectField` if it can show "held" instead of "available". If it can't, don't stretch it with defaults, because a shared field takes what callers pass (see the repo's field-component convention).
  - The Bucket detail page gets "Allocations" and "Withdrawals" tabs, matching the Bank Account page.
  - `getWithdrawalColumns({ omit })` mirrors `getAllocationColumns`.
- **Dates.** No ordering rule. A Withdrawal may be dated before the Allocations it draws from, because no figure in the app is computed as of a date. This matches how Allocation and Transaction dates already work.

## Testing decisions

Deferred, for the reason the other specs in `docs/specs/` give: the repo has no test setup yet. Once it has one, cover these first, because they're the most valuable:

- The held-amount rule across all five places it runs, especially deleting an Allocation after a Withdrawal (story 25).
- Unallocated staying unchanged across a Withdrawal's log, edit and delete, from both the Bucket side and the Bank Account side.
- Bucket deletion keeping the linked Transactions (story 26).

## Out of scope

- **Moving money from one Bucket to another.** No scenario needs it yet. Delete-and-relog of Allocations still covers reassigning. If it's ever designed, it isn't a Withdrawal, because no money leaves a Bank Account.
- **One Withdrawal across several Bank Accounts or currencies.** Rejected on purpose (story 13).
- **Logging a Withdrawal from the Bank Account side**, such as an "expense from a Bucket" option in `LogTransactionDialog`. The only entry point is the Bucket's menu (story 9).
- **A Withdrawal with no Bank Account**, like an unlinked Repayment. A Withdrawal always spends from a real account.
- **A Withdrawal list across Buckets**, like the one `docs/specs/allocation-cross-account-and-bucket-list.md` specifies for Allocations.
- **How `Distribution` or `Goal` relate to Withdrawals.** Both are still undesigned. A Goal's progress will need to decide whether withdrawn money counts toward the target.

## Further notes

- `CONTEXT.md` defines `Withdrawal` and holds the updated `Bucket`, `Subtotal`, `Unallocated` and `Linked Transaction` entries. This spec assumes them.
- We picked the name over "Disbursement", "Spend" and "Payout". Taking cash out at an ATM would be a transfer between Bank Accounts in this app, not a Withdrawal, so the two shouldn't be confused.
- **2026-10-24. Withdraw and Edit Withdrawal open in Drawers.** Stories 9 to 16 and 20 to 22 are unchanged. Withdraw and Edit Withdrawal are now `WithdrawDrawer` in `withdraw-drawer.tsx` and `EditWithdrawalDrawer` in `edit-withdrawal-drawer.tsx`, built on `ResponsiveDrawer` like the Bucket Drawers (`docs/specs/bucket-crud.md`, 2026-10-24). Each slides in from the right on desktop and up from the bottom with a swipe handle below 768px. The form scrolls, and Submit and a new Cancel stay pinned at the bottom. `withdrawDrawerHandle` (payload `{ bucketId }`) and `editWithdrawalDrawerHandle` (payload `{ withdrawalId }`) replace the `createDialogStore` stores, so none are left in the Withdrawals module. The bucket page's Withdraw button is a `DrawerTrigger`, so focus returns to it. The Buckets row menu's Withdraw Money calls `withdrawDrawerHandle.openWithPayload({ bucketId })`, and the Withdrawals row menu's Edit calls `editWithdrawalDrawerHandle.openWithPayload({ withdrawalId })`. Each body (`WithdrawForm`, `EditWithdrawalForm`) mounts inside the popup with its payload field as a prop and unmounts once the close animation ends, so the `enabled: isOpen` flags are gone. Withdraw's bucket and sources queries stay disabled while the withdrawal saves and after it succeeds. That way, withdrawing everything a Bucket holds doesn't refetch and flash "Nothing to withdraw" while the Drawer closes. A dirty dismiss of either Drawer, including by swipe, still asks "Discard new withdrawal?" or "Discard editing withdrawal?". "Keep Editing" keeps the input, and "Discard" resets the form and then closes. The "Bucket not found", "Nothing to withdraw" and "Withdrawal not found" Close buttons are `DrawerClose`. Delete Withdrawal is unchanged and still uses plain `confirm()`.
- **2026-10-27. The detail page's Withdraw button disables when the Bucket holds no money.** Stories 9 to 16 are unchanged. The page loads `withdrawalSourcesQueryOption` beside its other queries, and `holdsMoney` is true when the sources list isn't empty, so it follows the same rule as the Drawer (an amount above 0 in at least one Bank Account). With nothing held, the button stays in place, dimmed, and a tooltip reads "Allocate money into this bucket first". It is still the same `DrawerTrigger`, now with `focusableWhenDisabled`, so keyboard users can reach it, the tooltip shows on focus, and focus returns to it after a withdrawal empties the Bucket. The global invalidation refetches the sources after any mutation, so allocating into an empty Bucket enables the button and withdrawing everything disables it, with no reload. The Drawer keeps its "Nothing to withdraw" state for the Buckets row menu's Withdraw Money, money that leaves while the Drawer is open, and a stale page. Because the page now watches the sources query too, `WithdrawForm` holds the sources it had before the save, so the refetch can't flash "Nothing to withdraw" while the Drawer closes.
- **2026-10-28. What a Bucket holds can't go below zero on any date.** Stories 15 and 25 used to check only the current total, so a Withdrawal backdated to before its Allocation, or an Allocation moved to after its Withdrawal, passed and left a stretch of history where the Bucket held a negative amount. `checkHeld` now replays the Bucket's Allocations and Withdrawals from the Bank Account in date order with the change applied, and rejects it if the total is below zero at any point. It runs for logging and editing a Withdrawal (including the linked Transaction's edit), and for editing or deleting an Allocation, so a date-only change is checked too. Within one UTC day Allocations apply first, then the rest by `createdAt`, the same order the Account ledger uses. The message names the first date. A Bucket that was already negative on some earlier date doesn't block unrelated writes. Stories 9 to 16 and 20 to 28 are otherwise unchanged.
