# Module Spec: Accounts

## Overview

An Account represents a real-world bank account. It has a single currency and its balance is computed from transactions — the user does not manually update it.

## Entity

### BankAccount

| Field             | Type     | Notes                                  |
| ----------------- | -------- | -------------------------------------- |
| `id`              | string   | auto-generated                         |
| `userId`          | string   | FK → Users (ownership boundary)        |
| `name`            | string   | user-given label, unique per user      |
| `currency`        | string   | e.g. QAR, PHP                          |
| `startingBalance` | number   | base value, stored directly on account |
| `createdAt`       | datetime |                                        |

## Design Decisions

### Ownership Cascade

`userId` lives only on BankAccount. Transactions and Allocations derive the user through `accountId → BankAccount.userId`. This keeps a single source of truth for ownership without redundant data.

### Starting Balance Stored on Account

The starting balance is stored as a plain field on BankAccount, not as an initial income transaction. This avoids a chicken-and-egg problem where the starting balance would need a Bucket to be assigned to before any Bucket exists.

### Immutable Currency

Once an Account is created, its `currency` cannot be changed. Existing transactions were recorded in that currency and changing it would corrupt the ledger.

### Immutable Starting Balance

Once an Account is created, its `startingBalance` cannot be changed. It represents a frozen point-in-time snapshot. To adjust, the user logs income/expense transactions.

### Balance Formula

Balance = `startingBalance + sum(income amounts) − sum(expense amounts)`

### Unallocated Formula

Unallocated = `account balance − sum(allocations from this account)`

### Name Uniqueness

Account name must be unique per user. Duplicate names are rejected on creation and edit.

### Transfers

Transfers between accounts are logged as two Transactions: an expense from Account A and an income to Account B, linked via note.

## Features

| #   | Feature             | File                                                               |
| --- | ------------------- | ------------------------------------------------------------------ |
| 1   | Create Account      | [specs/01-create-account.md](specs/01-create-account.md)           |
| 2   | View Accounts List  | [specs/02-view-accounts-list.md](specs/02-view-accounts-list.md)   |
| 3   | View Account Detail | [specs/03-view-account-detail.md](specs/03-view-account-detail.md) |
| 4   | Edit Account        | [specs/04-edit-account.md](specs/04-edit-account.md)               |
| 5   | Delete Account      | [specs/05-delete-account.md](specs/05-delete-account.md)           |
