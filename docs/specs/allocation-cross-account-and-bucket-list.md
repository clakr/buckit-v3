---
status: ready-for-agent
module: allocations
---

# Spec: Allocation list across accounts and buckets

This project uses no issue tracker, so this file is the checklist. Its `status: ready-for-agent` frontmatter takes the place of a tracker's triage label. Update the status, for example to `in-progress` or `done`, as work goes on.

## Problem statement

Today a user can only see an Allocation inside one of its two parents. The Bucket detail page has a flat table of every Allocation into that Bucket, and the Bank Account detail page has an "Allocations" tab next to "Transactions". A user with more than one Bank Account and more than one Bucket can't see, filter or search their earmarking across both at once. To review "everything I allocated last month", they have to visit every Bucket or every Account detail page one by one.

## Solution

One Allocations list across all accounts and buckets, filterable by Bank Account, by Bucket and by date range, with a text search over the note. The user can log, edit and delete an Allocation directly from this list, the same as from either embedded view today.

## User stories

### Existing behavior (already implemented)

_These aren't new work. They're recapped here so this file describes all the behavior, not only what's changing. `src/modules/allocations/SPEC.md` has the full detail._

1. As a user, I want to log a new Allocation from one of my Bank Accounts into a Bucket, with an amount, date, and optional note, so that I can set money aside toward it.
2. As a user, I want the app to stop me from logging an Allocation that would push the source Bank Account's Unallocated balance below zero, so that number stays trustworthy.
3. As a user, I want to see every Allocation into a Bucket on that Bucket's detail page, so I can review its full funding history.
4. As a user, I want to see every Allocation out of a Bank Account in the "Allocations" tab of that account's detail page, so I can review what I've earmarked from it.
5. As a user, I want to edit an existing Allocation's amount, date, or note, so I can correct a mistake.
6. As a user, I want editing an Allocation to follow the same Unallocated ≥ 0 rule as logging one, so I can't make the account's numbers invalid after the fact.
7. As a user, I want to delete an Allocation I logged by mistake, so its money returns to the source account's unallocated pool.
8. As a user, I want a plain yes/no confirmation when deleting an Allocation, not a typed confirmation, because deleting one Allocation doesn't delete any other records.
9. As a user, I want an Allocation's amount to always be in its Bank Account's currency, because an Allocation has no currency of its own.
10. As a user, I want it to stay true that I can't move an existing Allocation to a different Bucket or Bank Account. If I earmarked money to the wrong place, I delete it and log a new one. _(This confirms an existing, permanent boundary. It isn't new work.)_

### List across accounts and buckets

11. As a user with several Bank Accounts and Buckets, I want to see all my Allocations in one place, so I don't have to check each Bucket's or each Account's detail page separately.
12. As a user, I want each row in that list to show both the Bank Account it came from and the Bucket it went into, so I can tell rows apart without a parent page around them.
13. As a user, I want to filter that list by Bank Account, so I can see only the money leaving one account without leaving the list.
14. As a user, I want to filter that list by Bucket, so I can see only the money entering one Bucket without leaving the list.
15. As a user, I want to filter that list by a date range, so I can review a specific period, such as last month.
16. As a user, I want to search that list by note text, so I can find a specific Allocation I remember details about.
17. As a user, I want that list sorted by date with the most recent first by default, as the embedded Allocations tables already are, so both behave the same.
18. As a user, I want to open, edit, or delete an Allocation directly from that list, so I don't have to go to its Bucket or Account first.
19. As a user, I want to log a new Allocation directly from that list, picking both the Bank Account it comes from and the Bucket it goes into, so I don't have to find the account first.
20. As a user, I want the Allocations list to only ever show my own Allocations, never another user's, so my financial data stays private. Every other view in this app has the same ownership rule.

## Implementation decisions

- **Modules touched.** Only `allocations`. No schema changes to `bank-accounts`, `buckets` or `transactions`.
- **Schema.** None. No new columns or tables, because this feature only reads and filters the existing `allocations` table.
- **Server function `getAllocations({ filters })`.** Not built. A first version with `bucketId` and `bankAccountId` fed the two detail tables until 2026-10-28, when the ledgers replaced them and it was removed with its columns and query options. The plan is a query across all of the user's Bank Accounts and Buckets. It checks ownership the same way `getBankAccounts` and `getBuckets` do, by scoping to `userId` through a join on `bankAccounts`, not by a single `bankAccountId` or `bucketId`. It returns each Allocation with its Bank Account's `name` and `currency` and its Bucket's `name`. Its filters are `bankAccountId`, `bucketId`, `dateFrom` and `dateTo`, and a `search` string matched against `note`. It has the same shape as `getTransactions` in `docs/specs/transaction-list-and-transfer.md`, which is specified but not built. It needs nothing new to test in isolation, because it is a plain filtered read like `getBankAccounts` and `getBuckets`.
- **New route.** A top-level `/allocations` route, next to `/accounts` and `/buckets`.
- **Columns.** Date, Bucket, Bank Account, Amount, Note and Actions. A `getAllocationColumns()` built on 2026-10-15 served the detail tables and was removed on 2026-10-28 with them, so this list needs its columns written again.
- **`LogAllocationDialog` needs a way to open with nothing fixed.** Since 2026-10-15 it opens from either side by id, as `{ from: "bank-account", bankAccountId }` or `{ from: "bucket", bucketId }`. It loads both lists itself. It shows a Bank Account picker when opened from a Bucket and a Bucket picker when opened from a Bank Account. The new list needs a third way to open it that shows both pickers.
- **Entry point.** A "Log Allocation" toolbar action on the new list opens `LogAllocationDialog` with no account preset.
- **Route wiring.** This route's query key comes from its filters, which `validateSearch` reads as `bankAccountId`, `bucketId`, `dateFrom`, `dateTo` and `search`. Use `loaderDeps` and the route's `context()` to build the filtered `getAllocations` queryOptions once, and share them between the loader and the component. If each built them from the search params on its own, the two could differ. TkDodo's post [reliable query prefetching with TanStack Router](https://tkdodo.eu/blog/reliable-query-prefetching-with-tanstack-router) describes that bug.

## Testing decisions

Deferred, for the reason `docs/specs/bank-account-crud.md`, `docs/specs/bucket-crud.md` and `docs/specs/transaction-list-and-transfer.md` already give. The repo has no test setup yet. `vitest` is a dependency, but there is no config, no test files, and no D1 test runner for server functions like `getAllocations`, which calls `getDB(env.db)` from `cloudflare:workers`. Apart from that tooling question, nothing here needs to be testable on its own. `getAllocations` is a plain filtered read with the same shape as `getBankAccounts` and `getBuckets`, and it adds no validation logic. Logging and editing from the new list reuse, unchanged, the dialogs' local Available check and the check each write runs on the server.

## Out of scope

- **`Distribution`**, a saved preset the User triggers by hand that logs an income Transaction and splits it through Allocations. It is a separate module, not designed yet, and it waits on the undesigned shapes of `Goal` and `Debt`. See the `Distribution` entry in [`CONTEXT.md`](../../CONTEXT.md) and the Future considerations section of [`src/modules/allocations/SPEC.md`](../../src/modules/allocations/SPEC.md). This spec doesn't touch it.
- **Moving an Allocation** to a different Bucket or Bank Account. `src/modules/allocations/SPEC.md` confirms this will never be a feature. The user deletes the Allocation and logs a new one instead.
- **A grid of Bank Accounts by Buckets**, such as a table of Account × Bucket subtotals. That is a different and bigger feature than a filterable list, and this spec doesn't consider it.
- Any change to the Bank Account, Bucket or Transactions modules.
- Automated tests for this pass. See Testing decisions.

## Further notes

- `CONTEXT.md` defines `Allocation`, and `src/modules/allocations/SPEC.md` holds the full module rationale. This spec assumes both instead of repeating them.
- This spec copies the structure of the list half of `docs/specs/transaction-list-and-transfer.md` on purpose. Both are filtered views across parents, and both conclude that nothing new needs isolating for tests. Allocation's version adds a second filter, Bucket, next to Bank Account, because an Allocation has two parents and a Transaction has one.
- `docs/specs/transaction-list-and-transfer.md` doesn't mention that its `LogTransactionDialog` would need the same account picker inside the dialog for the list's "log new transaction" entry point, its story 19. The gap applies there too. Check it when that spec gets built.
- **2026-10-24. Log Allocation and Edit Allocation open in Drawers.** Stories 1 to 10 are unchanged. Log Allocation and Edit Allocation are now `LogAllocationDrawer` in `log-allocation-drawer.tsx` and `EditAllocationDrawer` in `edit-allocation-drawer.tsx`, built on `ResponsiveDrawer` like the Withdrawal Drawers (`docs/specs/withdrawal.md`, 2026-10-24). Each slides in from the right on desktop and up from the bottom with a swipe handle below 768px. The form scrolls, and Submit and a new Cancel stay pinned at the bottom. `logAllocationDrawerHandle` (payload `{ start }`) and `editAllocationDrawerHandle` (payload `{ allocationId }`) replace the `createDialogStore` stores, so none are left in the Allocations module. The Bank Accounts and Buckets row menus' Allocate Money call `logAllocationDrawerHandle.openWithPayload({ start })` with their side fixed, and the Allocations row menu's Edit calls `editAllocationDrawerHandle.openWithPayload({ allocationId })`. Each body (`LogAllocationForm`, `EditAllocationForm`) mounts inside the popup with its payload field as a prop and unmounts once the close animation ends, so the `enabled: isOpen` flags and the `start: null` guard are gone. A dirty dismiss of either Drawer, including by swipe, still asks "Discard new allocation?" or "Discard editing allocation?". "Keep Editing" keeps the input, and "Discard" resets the form and then closes. The "Bank account not found", "Bucket not found" and "Allocation not found" Close buttons are `DrawerClose`. Delete Allocation is unchanged and still uses plain `confirm()`. The `LogAllocationDialog` mentions under Implementation decisions now mean `LogAllocationDrawer`.
- **2026-10-27. Log Allocation offers Set Up Bucket when there are no buckets.** Stories 1 to 10 are unchanged. Opened from a bank account with no buckets, the Bucket field was a disabled "Select bucket" with no explanation, so the user hit a dead end. With no buckets, the field now shows "You have no buckets to allocate into yet." and a Set Up Bucket button instead of the select, the way `BankAccountSelectField` handles its empty case. The button is a `DrawerTrigger` on Log Allocation's own `nestedSetUpBucketDrawerHandle`, and Log Allocation renders `NestedSetUpBucketDrawer` beside its `DrawerContent`, inside its Root, as Record Debt and Add Goal do with Register Account (`docs/specs/debt-module.md` and `docs/specs/goal-module.md`, 2026-10-27). While Set Up Bucket is open, Log Allocation scales back and peeks, and its swipe handle hides on mobile. Cancel, the backdrop, and "Discard" after a dirty Escape close only Set Up Bucket, leave Log Allocation's form as it was, and return focus to the button. A saved bucket refetches the buckets list, so the select replaces the empty state and lists it without reopening the drawer. The button is gone after that, so Log Allocation passes `finalFocus` with the button while it exists and its own popup otherwise, and focus lands in its form. Opened from a bucket, Log Allocation has no Bucket field, so none of this applies.
- **2026-10-27. Log Allocation offers Register Account when there are no bank accounts.** Stories 1 to 10 are unchanged. Opened from a bucket with no bank accounts, the Bank Account field showed only "You have no bank accounts to allocate from yet.", a dead end. A Register Bank Account button now sits under that text. Like Set Up Bucket above, Log Allocation renders `NestedRegisterBankAccountDrawer` beside its `DrawerContent`, inside its Root, on its own `nestedRegisterBankAccountDrawerHandle`, and the button is a `DrawerTrigger` with `{ currency: "PHP" }`. PHP is intended: the user has no accounts, so no currency is implied, PHP matches the Accounts page, and Register's currency picker can change it. While Register is open, Log Allocation scales back and peeks, and its swipe handle hides on mobile. Cancel, the backdrop, and "Discard" after a dirty Escape close only Register, leave Log Allocation's form as it was, and return focus to the button. A registered account refetches the bank accounts list, so the select replaces the empty state and lists it without reopening the drawer. The button is gone after that, so Log Allocation passes `finalFocus` with the button while it exists and its own popup otherwise, and focus lands on the select. Opened from a bank account, Log Allocation has no Bank Account field, so none of this applies.
