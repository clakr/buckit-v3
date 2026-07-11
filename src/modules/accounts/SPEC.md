# Module Spec: Accounts

## Overview

An Account represents a real-world bank account. It has a single currency and its balance is computed from account entries — the user does not manually update it.

## Design Decisions

### User Ownership

`userId` is stored directly on the Account (FK → Users). Account Entries and Allocations do **not** store `userId` — they derive it through `accountId → Account.userId`. This keeps a single source of truth for ownership without redundant data.

### Starting Balance

The starting balance is stored **directly on the Account** as a plain field, **not** as an initial income transaction. This avoids a chicken-and-egg problem where the starting balance would need a Bucket to be assigned to before any Bucket exists.

**Balance formula:** `startingBalance + sum(income amounts) − sum(expense amounts)`

**Unallocated balance:** `account balance − sum(allocations from this account)`

A future "distribute starting balance" flow can auto-create allocations from the account's implicit unallocated pool into specific buckets, but that is P3.

### Immutable Currency

Once an Account is created, its `currency` cannot be changed. Existing entries were recorded in that currency and changing it would corrupt the ledger. If a user needs to track an account in a different currency, they should create a new Account.

### Immutable Starting Balance

Once an Account is created, its `startingBalance` cannot be changed. It represents a frozen point-in-time snapshot when the account was first added. To adjust, the user logs income/expense entries.

## User Flows

| #   | Feature             | File                                                               |
| --- | ------------------- | ------------------------------------------------------------------ |
| 1   | Create Account      | [specs/01-create-account.md](specs/01-create-account.md)           |
| 2   | View Accounts List  | [specs/02-view-accounts-list.md](specs/02-view-accounts-list.md)   |
| 3   | View Account Detail | [specs/03-view-account-detail.md](specs/03-view-account-detail.md) |
| 4   | Edit Account        | [specs/04-edit-account.md](specs/04-edit-account.md)               |
| 5   | Delete Account      | [specs/05-delete-account.md](specs/05-delete-account.md)           |

## Additional Topics

| Topic                 | File                                                               |
| --------------------- | ------------------------------------------------------------------ |
| Currency & Formatting | [specs/06-currency-formatting.md](specs/06-currency-formatting.md) |
| Suggested Routes      | [specs/07-suggested-routes.md](specs/07-suggested-routes.md)       |
