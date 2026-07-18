# Module Spec: Transactions

## Overview

A Transaction represents money moving in or out of a BankAccount. It is always linked to an account and has no direct relationship to a Bucket — allocations handle bucket assignment separately.

## Entity

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

User ownership is derived through `accountId → BankAccount.userId`. Transactions do not store `userId` directly.

## Design Decisions

### Amount Always Positive

`amount` is always stored as a positive number. Direction is indicated by `type` (income/expense). This keeps validation simple (amount > 0) and avoids signed-number confusion in formulas.

### User-Editable Date

`date` is set by the user, defaulting to today. This allows backdating transactions (e.g., logging yesterday's expense today). `createdAt` is the system-generated audit trail and is never user-editable.

### Unallocated Constraint on Edit/Delete

Editing a transaction's amount or type changes the account's computed balance. If the change would cause the account's unallocated balance to go negative, the operation is blocked. This prevents allocations from exceeding available funds.

## Features

| #   | Feature            | File                                                             |
| --- | ------------------ | ---------------------------------------------------------------- |
| 1   | Log Transaction    | [specs/01-log-transaction.md](specs/01-log-transaction.md)       |
| 2   | Edit Transaction   | [specs/02-edit-transaction.md](specs/02-edit-transaction.md)     |
| 3   | Delete Transaction | [specs/03-delete-transaction.md](specs/03-delete-transaction.md) |
