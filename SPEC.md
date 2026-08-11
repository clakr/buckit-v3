# Buckit v3 — SPEC

## Core Concepts

- **BankAccount** — A real-world bank account with a single currency. Balance is computed from transactions, never manually set.
- **Bucket** — A logical envelope that holds allocated money. Has no currency — it can receive allocations from accounts in any currency.
- **Transaction** — Money in or out of a BankAccount. Direction is determined by type (income/expense). Not linked to a Bucket.
- **Allocation** — Assigns a portion of a BankAccount's balance to a Bucket. Always references a source account.

## Data Models

### BankAccount

| Field             | Type     | Notes                                  |
| ----------------- | -------- | -------------------------------------- |
| `id`              | string   | auto-generated                         |
| `userId`          | string   | FK → Users (ownership boundary)        |
| `name`            | string   | user-given label, unique per user      |
| `currency`        | string   | e.g. QAR, PHP                          |
| `startingBalance` | number   | base value, stored directly on account |
| `createdAt`       | datetime |                                        |

### Bucket

| Field       | Type     | Notes                             |
| ----------- | -------- | --------------------------------- |
| `id`        | string   | auto-generated                    |
| `userId`    | string   | FK → Users (ownership boundary)   |
| `name`      | string   | user-given label, unique per user |
| `createdAt` | datetime |                                   |

### Transaction

| Field       | Type     | Notes                                       |
| ----------- | -------- | ------------------------------------------- |
| `id`        | string   | auto-generated                              |
| `accountId` | string   | FK → BankAccount (user derived via account) |
| `type`      | enum     | `income` / `expense`                        |
| `amount`    | number   | always positive                             |
| `note`      | string?  | optional                                    |
| `date`      | datetime | when the money moved, user-editable         |
| `createdAt` | datetime | system-generated audit trail                |

### Allocation

| Field       | Type     | Notes                                             |
| ----------- | -------- | ------------------------------------------------- |
| `id`        | string   | auto-generated                                    |
| `accountId` | string   | FK → BankAccount (user derived via account)       |
| `bucketId`  | string   | FK → Bucket                                       |
| `amount`    | number   | always positive, in the source account's currency |
| `note`      | string?  | optional                                          |
| `date`      | datetime | user-editable                                     |
| `createdAt` | datetime |                                                   |

## Design Decisions

### Dialogs for Small Forms

Forms for creating and editing (Account, Bucket, Transaction, Allocation) open as dialogs over the current page. Full-page views are reserved for detail-heavy pages (Account Detail, Bucket Detail).

### UI Labels

The frontend uses "Accounts" for Bank Accounts throughout. The database table is `bank_accounts` (to avoid collision with the auth provider's `accounts` table) but this is invisible to the user.

### No Third-Party Banking APIs

No automatic import from banks. The user enters all data manually.

## Priorities

| Priority | Done | Feature                   | Notes                                                                           |
| -------- | ---- | ------------------------- | ------------------------------------------------------------------------------- |
| P0       | [x]  | Add Account               | Dialog: name + currency + starting balance                                      |
| P0       | [x]  | Add Bucket                | Dialog: name only                                                               |
| P0       | [x]  | Log Transaction           | Dialog: type (income/expense), account, amount, date, note                      |
| P0       | [x]  | Log Allocation            | Dialog: source account, bucket, amount, date, note                              |
| P1       | [ ]  | Edit / Delete Transaction | Block if would cause negative unallocated                                       |
| P1       | [ ]  | Edit / Delete Allocation  | Amount increase blocked if negative unallocated; delete always allowed          |
| P1       | [x]  | View Accounts List        | Table with badge, currency, computed balance, unallocated                       |
| P1       | [x]  | View Account Detail       | Transactions tab + Allocations tab + Summary section                            |
| P1       | [x]  | View Buckets List         | List with per-currency subtotals                                                |
| P1       | [ ]  | View Bucket Detail        | Allocations grouped by account, per-currency subtotals, Convert button (future) |
| P2       | [ ]  | Dashboard                 | Accounts section + Buckets section with per-currency subtotals                  |
| P3       | [ ]  | Distributions             | One transaction auto-allocates across multiple buckets                          |
