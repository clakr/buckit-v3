# Module Spec: Allocations

## Overview

An Allocation assigns a portion of a BankAccount's balance to a Bucket. The amount is always in the source account's currency. Buckets have no currency, so a bucket can receive allocations from accounts in different currencies.

## Entity

### Allocation

| Field       | Type     | Notes                                             |
| ----------- | -------- | ------------------------------------------------- |
| `id`        | string   | auto-generated                                    |
| `accountId` | string   | FK → BankAccount (currency derived through join)  |
| `bucketId`  | string   | FK → Bucket                                       |
| `amount`    | number   | always positive, in the source account's currency |
| `note`      | string?  | optional                                          |
| `date`      | datetime | user-editable                                     |
| `createdAt` | datetime |                                                   |

User ownership is derived through `accountId → BankAccount.userId` or `bucketId → Bucket.userId`. Allocations do not store `userId` directly.

## Design Decisions

### No Currency Conversion Fields

Allocations store `amount` in the source account's currency only. There is no `convertedAmount` or `convertedCurrency` field. Per-currency subtotals on the bucket are computed by joining through the source account.

### Amount Always Positive

`amount` is always a positive number. It represents money moving from the account's unallocated pool into the bucket.

### User-Editable Date

`date` is set by the user, defaulting to today. This allows backdating allocations. `createdAt` is the system-generated audit trail.

### Unallocated Constraint on Edit

Editing an allocation's amount (increase) is blocked if it would cause the source account's unallocated balance to go negative. Decreasing the amount is always allowed (it frees money back to unallocated). Date and note edits have no balance impact and are always allowed.

### Delete Always Allowed

Deleting an allocation frees its amount back to the source account's unallocated pool. This can never cause negative unallocated, so deletion is always permitted.

## Features

| #   | Feature           | File                                                           |
| --- | ----------------- | -------------------------------------------------------------- |
| 1   | Log Allocation    | [specs/01-log-allocation.md](specs/01-log-allocation.md)       |
| 2   | Edit Allocation   | [specs/02-edit-allocation.md](specs/02-edit-allocation.md)     |
| 3   | Delete Allocation | [specs/03-delete-allocation.md](specs/03-delete-allocation.md) |
