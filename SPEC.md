# Buckit v3 — SPEC

> Concluded from a grilling session on 2026-07-08.

## Core Concepts

- **Account** — A real-world bank account with a single currency. Balance is computed, not manually entered.
- **Bucket** — A logical envelope that holds allocated money. Can span multiple accounts and currencies.
- **Account Entry** — Money in or out of an account. No bucket required.
- **Allocation** — Assigns a portion of an account's balance to a bucket. Always references an account.

## Data Model

### Account

| Field             | Type     | Notes                                                 |
| ----------------- | -------- | ----------------------------------------------------- |
| `id`              | string   | auto-generated                                        |
| `userId`          | string   | FK → Users (ownership boundary)                       |
| `name`            | string   | user-given label                                      |
| `currency`        | string   | e.g. QAR, PHP                                         |
| `startingBalance` | number   | base value, stored directly on account (not an entry) |
| `createdAt`       | datetime |                                                       |

### Bucket

| Field       | Type     | Notes                           |
| ----------- | -------- | ------------------------------- |
| `id`        | string   | auto-generated                  |
| `userId`    | string   | FK → Users (ownership boundary) |
| `name`      | string   | user-given label                |
| `createdAt` | datetime |                                 |

### Account Entry

| Field       | Type     | Notes                                     |
| ----------- | -------- | ----------------------------------------- |
| `id`        | string   | auto-generated                            |
| `accountId` | string   | FK → Account (user derived via account)   |
| `type`      | enum     | `income` / `expense`                      |
| `amount`    | number   | positive for income, negative for expense |
| `note`      | string?  | optional                                  |
| `date`      | datetime | when the money moved                      |
| `createdAt` | datetime |                                           |

### Allocation

| Field               | Type     | Notes                                                                                        |
| ------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `id`                | string   | auto-generated                                                                               |
| `accountId`         | string   | FK → Account (user derived via account)                                                      |
| `bucketId`          | string   | FK → Bucket                                                                                  |
| `amount`            | number   | always positive                                                                              |
| `convertedAmount`   | number?  | present when allocating from an account whose currency differs from the allocation reference |
| `convertedCurrency` | string?  | target currency of the conversion                                                            |
| `note`              | string?  | optional                                                                                     |
| `date`              | datetime |                                                                                              |
| `createdAt`         | datetime |                                                                                              |

## Design Decisions

1. **Separated entry & allocation** — Income/expense moves money in/out of an account. Allocation assigns existing money to a bucket. Two distinct actions, two distinct entities.
2. **Manual conversion** — No third-party banking APIs. On cross-currency allocations, the user inputs the converted amount.
3. **Account balance is computed** — `startingBalance + sum(income amounts) − sum(expense amounts)`.
4. **Unallocated balance** — Computed as `account balance − sum(allocations from this account)`.
5. **Bucket totals** — Shown per currency on the dashboard. A button on the bucket detail page calls a currency converter API on demand.
6. **Starting balance** — Stored as a field on Account, not as an Account Entry.
7. **Transfers between accounts** — Logged as two Account Entries: an expense from Account A and an income to Account B (linked via note).
8. **User ownership cascade** — `userId` lives only on `Account` and `Bucket`. `Account Entry` and `Allocation` derive the user through `accountId → Account.userId`. This avoids redundant data while keeping a single ownership source of truth. Every query scoped to a user joins through `Account`.
9. **Inline forms in dialogs** — Small forms (Add Account, Add Bucket, Edit Account, Edit Bucket) open as dialogs over the current page instead of navigating to a separate route. This keeps the list/context visible and reduces friction. Full-page views are reserved for detail-heavy pages (Account Detail, Bucket Detail).

## Priorities

| Priority | Feature           | Notes                                                                                                                     |
| -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| P0       | Add Account       | name + currency + starting balance                                                                                        |
| P0       | Add Bucket        | just a name                                                                                                               |
| P0       | Log Account Entry | pick type (income/expense), account, amount                                                                               |
| P0       | Log Allocation    | pick account, pick bucket, enter amount                                                                                   |
| P1       | Dashboard         | accounts list (name, currency, balance, unallocated) + buckets list with per-currency subtotals and per-account breakdown |
| P2       | Bucket detail     | allocation history grouped by account; a button to convert totals via external API                                        |
| P3       | Distributions     | one entry auto-allocates across multiple buckets                                                                          |

## Account Entry Types

- **Income** — Money comes in from outside. Increases the account balance.
- **Expense** — Money goes out. Decreases the account balance.

Transfers between accounts are two entries: expense from source, income to destination.

## User Flows (in priority order)

### 1. Add Account

1. User clicks "Add Account". A dialog opens.
2. Enters name (e.g. "QNB Savings"), picks currency (QAR), enters starting balance (e.g. 5000)
3. App creates the account with the starting balance field (no initial entry created)
4. Close dialog. Account appears in the list. Show success toast.

### 2. Add Bucket

1. User clicks "Add Bucket". A dialog opens.
2. Enters name (e.g. "Emergency Fund")
3. App creates the bucket
4. Close dialog. Bucket appears in the list. Show success toast.

### 3. Log Account Entry

1. User clicks "New Entry"
2. Selects type: Income / Expense
3. Picks account from dropdown
4. Enters amount
5. Optionally adds a note
6. Submits; app recalculates account balance
7. Shows success and stays on the log page for quick entry chaining

### 4. Log Allocation

1. User clicks "Allocate"
2. Picks account (the source of the money)
3. Picks bucket from dropdown
4. Enters amount (and converted amount + target currency if cross-currency allocation)
5. Optionally adds a note
6. Submits; app recalculates bucket totals per account and account's unallocated balance
7. Shows success and stays on the allocation page

### 5. Dashboard

1. User lands on dashboard
2. Sees two sections:
   - **Accounts** — a list/table with name, currency, computed balance, unallocated amount
   - **Buckets** — a list/table with name and subtotals per currency (e.g. "500 QAR + 7800 PHP")
3. (Future) Click a button to convert all bucket totals to a preferred currency via API

### 6. Bucket Detail

1. User clicks a bucket from the dashboard
2. Sees allocation history grouped by account (e.g. "QNB: 2000 QAR, BDO: 7800 PHP")
3. Sees per-currency subtotals at the top
4. A "Convert Totals" button that calls a currency converter API and displays the combined total in QAR and PHP
