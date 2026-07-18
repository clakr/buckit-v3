# Module Spec: Buckets

## Overview

A Bucket is a logical envelope that holds allocated money. It has no currency — it can receive allocations from BankAccounts in any currency. Per-currency subtotals are computed by joining allocations through their source accounts.

## Entity

### Bucket

| Field       | Type     | Notes                             |
| ----------- | -------- | --------------------------------- |
| `id`        | string   | auto-generated                    |
| `userId`    | string   | FK → Users (ownership boundary)   |
| `name`      | string   | user-given label, unique per user |
| `createdAt` | datetime |                                   |

## Design Decisions

### Ownership Cascade

`userId` lives only on Bucket. Allocations derive the user through `bucketId → Bucket.userId`. This keeps a single source of truth for ownership without redundant data.

### No Currency on Bucket

A Bucket has no currency field. It accepts allocations from any account regardless of the account's currency. Per-currency subtotals (e.g., "500 QAR + 7800 PHP") are computed by joining allocations → accounts → currency and grouping.

This means a single Bucket can hold QAR from one account and PHP from another simultaneously.

### Name Uniqueness

Bucket name must be unique per user. Duplicate names are rejected on creation and edit.

### Delete Cascades Allocations

Deleting a Bucket cascade-deletes all its Allocations. Money in each allocation returns to the source account's unallocated pool. A warning dialog shows the number of allocations and total amount per currency being freed.

## Features

| #   | Feature            | File                                                             |
| --- | ------------------ | ---------------------------------------------------------------- |
| 1   | Create Bucket      | [specs/01-create-bucket.md](specs/01-create-bucket.md)           |
| 2   | View Buckets List  | [specs/02-view-buckets-list.md](specs/02-view-buckets-list.md)   |
| 3   | View Bucket Detail | [specs/03-view-bucket-detail.md](specs/03-view-bucket-detail.md) |
| 4   | Edit Bucket        | [specs/04-edit-bucket.md](specs/04-edit-bucket.md)               |
| 5   | Delete Bucket      | [specs/05-delete-bucket.md](specs/05-delete-bucket.md)           |
