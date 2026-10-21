# Module spec: Buckets

## Overview

A Bucket is a user-defined savings category. Allocations earmark money into it from one or more Bank Accounts. It has no currency and no balance of its own. Its content is its Allocations minus its Withdrawals, shown as one subtotal per source currency. Money enters it through an Allocation. It leaves through a Withdrawal, which spends it as an `expense` Transaction on one Bank Account, or when an Allocation is edited or deleted. Transactions still always attach to a Bank Account and never to a Bucket. A Withdrawal points to its Transaction instead (see [ADR 0004](../../../docs/adr/0004-withdrawals-spend-from-buckets.md)). See [`CONTEXT.md`](../../../CONTEXT.md) for the glossary entry and the planned `Goal` entity.

## Entity

### Bucket

| Field       | Type     | Notes                                                         |
| ----------- | -------- | ------------------------------------------------------------- |
| `id`        | string   | generated (uuidv7)                                            |
| `userId`    | string   | foreign key to Users, which decides ownership                 |
| `name`      | string   | label the user gives, unique per user ignoring case, editable |
| `createdAt` | datetime |                                                               |

It has no currency, balance or target column. It has no `updatedAt`, for the same reason as Bank Account. No sync or API client exists, and a User's Sessions have no concurrent-edit conflict to detect (see `authentication/SPEC.md` on multi-device Sessions).

## Design decisions

### Saved up, then spent through a Withdrawal

**Revised 2026-10-21.** This section used to say a Bucket only accumulates and is never spent from. [ADR 0004](../../../docs/adr/0004-withdrawals-spend-from-buckets.md) relaxed that boundary on purpose. A Withdrawal spends any amount up to what the Bucket holds from one Bank Account, as an `expense` Transaction on that account. Part of the old boundary is still permanent. `transactions.bucketId` doesn't exist and never will. The Withdrawal holds the link, and the Transaction knows nothing about Buckets. What a Bucket holds from any one Bank Account must never go negative. See [`docs/specs/withdrawal.md`](../../../docs/specs/withdrawal.md). Tracking a target and progress on top of a Bucket, such as "$5,000 toward a trip", belongs to a separate, unbuilt `Goal` entity. See Future considerations below.

### No currency of its own

A Bucket can receive Allocations from Bank Accounts in different currencies. The app doesn't convert between currencies or show a single total. The Bucket figures module, `figures.server.ts`, groups the Subtotals by source currency and the UI shows each one. The "Verified during this spec pass" section in the bank-accounts `SPEC.md` checked the same thing from the Bank Account side.

### Name uniqueness

A name must be unique per user, ignoring case, after trimming, the same rule as Bank Account. The check compares SQLite's `lower()` of both names, which is the same folding the index uses. It only folds ASCII letters, so "Ñ" and "ñ" count as different names. Create and edit both run the check. The edit check excludes the bucket's own current name, so changing only its case is allowed.

One rule, `bucketNameRule` in `name.server.ts`, serves both the dialogs and the writes. It's built with `createUniqueNameRule` from `src/lib/unique-name.server.ts`, which Bank Account and Bucket share. The dialogs reach it through the `validateBucketName` server function, which takes an optional `excludeId` for the Bucket being renamed. The writes call it directly on the server.

The database enforces the same rule with a unique index on `(user_id, lower(name))`, from migration `20261015050303_bucket_name_case_insensitive`. Two requests at the same moment therefore can't create both "Trip" and "trip". When the index rejects a write, the write throws the same `ConflictError` as a failed check. The older case-sensitive `unique(userId, name)` constraint stays. Dropping a table-level constraint needs a table rebuild, and on D1, dropping `buckets` would cascade-delete every Allocation.

### Deletion destroys data instead of being blocked

**Implemented.** Deleting a Bucket hard-deletes it, and the existing `onDelete: "cascade"` foreign key on `allocations.bucketId` deletes all of its Allocations. The `onDelete: "cascade"` on `withdrawals.bucketId` deletes its Withdrawals, but their `expense` Transactions stay as plain expenses on their Bank Accounts, because that money really left (see `docs/specs/withdrawal.md`, stories 26 and 27). A typed confirmation guards it, where the user re-types the bucket name, instead of a check that blocks it. This copies the Bank Account decision. See [`docs/adr/0002-hard-delete-buckets.md`](../../../docs/adr/0002-hard-delete-buckets.md).

The app computes `Unallocated` on read, so once the cascade removes the Allocations, that money is back in each source Bank Account's unallocated pool. The confirmation dialog shows this before the user confirms, broken down by account and currency. The server computes the preview in `loadBucketDeletionImpact` (`deletion.server.ts`), through the `getBucketDeletionImpact` server function. It returns the Bucket's name, its Allocation and Withdrawal counts, and, for each Bank Account the Bucket holds money from, that account's Unallocated before and after. The after figure adds back only what the Bucket still holds from that account (allocated minus withdrawn). The description counts the Withdrawals and says their expenses stay. It reads both figures modules, so its Subtotal and Unallocated match every other screen.

### Edit only renames

**Implemented.** Edit only changes the name, with the same case-insensitive uniqueness check as create, excluding the bucket's own current name. The entity has no other field that can change.

## Features

| #   | Feature                    | Status                                                                                                                                                                                                                                                                                          |
| --- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Create Bucket              | **Implemented and correct.** Name only, validated as unique, 1 to 100 characters, and trimmed.                                                                                                                                                                                                  |
| 2   | View Buckets List          | **Implemented and correct**, with one deliberate limit. The per-currency subtotal column can't be sorted (see below).                                                                                                                                                                           |
| 3   | View Bucket Detail         | **Implemented and correct**, as a flat Allocations table with no summary header (see below).                                                                                                                                                                                                    |
| 4   | Edit Bucket                | **Implemented and correct.** Name only.                                                                                                                                                                                                                                                         |
| 5   | Delete Bucket              | **Implemented and correct.** Hard delete that cascades to Allocations and Withdrawals, keeping the Withdrawals' expense Transactions, behind a typed confirmation of the bucket name. The dialog counts both and shows how much returns to each account's Unallocated.                          |
| 6   | Log/Edit/Delete Allocation | **Implemented and correct**, in the sibling `allocations` module. Log and edit enforce `Unallocated ≥ 0` on the source Bank Account. Delete needs no Unallocated check, because removing an Allocation can only increase Unallocated, but it's blocked once any of the Allocation is withdrawn. |
| 7   | Withdraw From a Bucket     | **Implemented and correct.** See [`docs/specs/withdrawal.md`](../../../docs/specs/withdrawal.md). It replaces the old "rejected permanently" entry (ADR 0004).                                                                                                                                  |
| n/a | Goal / Target Tracking     | **Out of scope.** Deferred to a planned, undesigned `Goal` module. See Future considerations.                                                                                                                                                                                                   |

## Gaps found this session, deliberate and not bugs

- ~~**No shared subtotal utility.**~~ **Resolved 2026-10-15.** By then three places repeated the sum: the list's Subtotal cell, the Bucket delete preview and the Bank Account delete preview. The sum moved into the Bucket figures module, `figures.server.ts`. `getBucketsWithFigures(db, { userId, bucketId?, allocatedFrom? })` runs one grouped query scoped to the user. It returns each Bucket with its Subtotals, one per currency and sorted by currency code, and with what it holds from each Bank Account. `getBuckets` returns Subtotals instead of raw Allocation rows, and `getBucket` returns only the Bucket's own row. The detail table reads its Allocations through the Allocation module's `getAllocations({ bucketId })`. The delete preview reads what the Bucket holds from each Bank Account (see Deletion destroys data instead of being blocked).
- **The Subtotal column can't be sorted.** Sorting it correctly means converting each row's per-currency amounts at a current exchange rate, row by row, and nobody has built an efficient way to do that yet. The column stays unsortable instead of shipping a slow or naive version.
- **The Bucket detail page has no summary.** Today it is a flat Allocations table, like the Allocations table on the Bank Account detail page. It doesn't have the balance, unallocated and total header that the Bank Account page shows. That header is deferred until someone designs what it shows and how it handles several currencies. When that happens, its figures can come from the Bucket figures module.

## Future considerations

### `Goal` module (planned, undesigned)

Tracking a target and progress, such as "$5,000 toward a trip", doesn't exist today, and the app doesn't model it yet on purpose. When someone designs it, one question needs an answer. `Goal` could be a column on `buckets`, such as a nullable `targetAmount`, or a separate table that references one or more Buckets. Both are still possible, so don't assume either shape until it gets its own design pass. See the `Goal` entry in [`CONTEXT.md`](../../../CONTEXT.md).
