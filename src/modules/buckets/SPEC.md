# Module Spec: Buckets

## Overview

A Bucket is a user-defined savings category that money gets earmarked into from one or more Bank Accounts via Allocations. It has no currency of its own and no balance of its own — its only content is the sum of its Allocations, displayed as a subtotal per source currency. A Bucket is a permanent goal-style accumulator: money only ever enters it (Allocation) or leaves it (editing/deleting an Allocation). It is never spent from directly — Transactions always attach to a Bank Account, never to a Bucket. See [`CONTEXT.md`](../../../CONTEXT.md) for the glossary entry and the planned `Goal` entity.

## Entity

### Bucket

| Field       | Type     | Notes                                                                    |
| ----------- | -------- | ------------------------------------------------------------------------ |
| `id`        | string   | auto-generated (uuidv7)                                                  |
| `userId`    | string   | FK → Users (ownership boundary)                                          |
| `name`      | string   | user-given label, unique per user (case-insensitive), editable (planned) |
| `createdAt` | datetime |                                                                          |

No currency, no balance/target column. No `updatedAt` — same reasoning as Bank Account: no sync/API client, no per-User concurrent-edit conflict scenario to detect (see `authentication/SPEC.md` on multi-device Sessions).

## Design Decisions

### Savings Goal, Not a Spending Envelope

A Bucket only ever accumulates or gives back earmarked money — there is no schema path for recording "$20 spent from Groceries" as a Bucket-scoped expense. `transactions.bucketId` does not exist and never will under this model; spending always happens at the Bank Account level via Transactions, disconnected from any Bucket. This is a permanent design boundary, not a gap to be filled later. Target/progress tracking on top of this (e.g. "$5,000 toward a trip") is deferred to a separate, unbuilt `Goal` entity — see Future Considerations below.

### No Currency of Its Own

A Bucket can receive Allocations from Bank Accounts in different currencies. There is no cross-currency conversion or a single "total" — subtotals are grouped and displayed per source currency (verified in `columns.tsx`; see bank-accounts `SPEC.md`'s "Verified During This Spec Pass" note, which checked the same thing from the other side).

### Name Uniqueness

Name must be unique per user, case-insensitive (compared via `lower()`), trimmed — same pattern as Bank Account. Enforced today only on create, via the dialog's async validator (`validateBucketName`) calling the server; the DB has a plain (case-sensitive) `unique(userId, name)` constraint as a backstop, matching Bank Account's existing (accepted) inconsistency between app-level case-insensitive checks and a case-sensitive DB constraint.

### Deletion Will Be Destructive, Not Blocked

Not yet built (menu item exists but is `disabled`). When built: hard delete, cascading to all of the Bucket's Allocations (matches the existing `onDelete: "cascade"` FK on `allocations.bucketId`), gated by a typed confirmation (user must re-type the bucket name) rather than a blocking check — mirrors the Bank Account precedent exactly. See [`docs/adr/0002-hard-delete-buckets.md`](../../../docs/adr/0002-hard-delete-buckets.md). Because `Unallocated` is computed on read, cascading the Allocations away automatically returns that money to each source Bank Account's unallocated pool — the confirmation dialog must disclose this consequence when built.

### Edit Will Be Name-Only

Not yet built (menu item exists but is `disabled`). When built: rename only, same case-insensitive uniqueness check as create. There is no other mutable field on the entity.

## Features

| #   | Feature                    | Status                                                                                                                                                                                                                                                 |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Create Bucket              | **Implemented and correct.** Name only, validated (uniqueness, 1–100 chars, trimmed).                                                                                                                                                                  |
| 2   | View Buckets List          | **Implemented and correct**, with one deliberate limitation: the per-currency subtotal column is not sortable (see below).                                                                                                                             |
| 3   | View Bucket Detail         | **Implemented and correct**, as a flat Allocations table only — no aggregate/summary header (see below).                                                                                                                                               |
| 4   | Edit Bucket                | **Not implemented** (UI menu item exists but is `disabled`). Scope for when built: **name only**.                                                                                                                                                      |
| 5   | Delete Bucket              | **Not implemented** (UI menu item exists but is `disabled`). Scope for when built: hard delete, cascades Allocations, gated by typed confirmation (re-type bucket name).                                                                               |
| 6   | Log/Edit/Delete Allocation | **Implemented and correct** — lives in the sibling `allocations` module, not this one. Enforces `Unallocated ≥ 0` against the source Bank Account on log and edit; delete needs no guard since removing an Allocation only ever increases Unallocated. |
| —   | Spend From a Bucket        | **Rejected as a concept for this entity**, permanently. Spending is always recorded as a Bank Account Transaction.                                                                                                                                     |
| —   | Goal / Target Tracking     | **Out of scope, deferred** to a planned, undesigned `Goal` module. See Future Considerations.                                                                                                                                                          |

## Gaps Identified This Session (Deliberate, Not Bugs)

- **No shared subtotal utility.** Unlike Bank Account's `getBankAccountUnallocatedBalance` (a pure function reused by both a server validator and the UI columns), the Bucket's per-currency subtotal is computed inline inside `columns.tsx` only. Deliberately not extracted: project convention is to wait until a calculation is needed in three or more places before pulling it into a shared file.
- **Subtotal column is unsortable.** Sorting it correctly requires converting each row's per-currency amounts using a current exchange rate, computed row-by-row — an efficient, well-designed approach for that conversion hasn't been built yet. Left unsortable rather than shipping a naive/slow version.
- **Bucket detail page has no aggregate summary.** It's a flat Allocations table today, matching the Bank Account detail page's Allocations table but without the equivalent balance/unallocated/total summary header Bank Account shows. Deliberately deferred until the summary's design (what to show, per-currency handling) is worked out, rather than bolting one on ad hoc.

## Future Considerations

### `Goal` Module (Planned, Undesigned)

Target/progress tracking (e.g. "$5,000 toward a trip") does not exist today and is intentionally not modeled yet. One concrete question to resolve when it's designed: does `Goal` end up as a column added directly to `buckets` (e.g. a nullable `targetAmount`), or as a wholly separate model/table that references one or more Buckets? Both are live options — do not assume either shape until this gets its own design pass. See the `Goal` entry in [`CONTEXT.md`](../../../CONTEXT.md).
