# Module Spec: Allocations

## Overview

An Allocation is money earmarked from a Bank Account toward a Bucket. It does not leave the Bank Account's Balance, but reduces that account's computed Unallocated amount. It has no currency of its own — it's always rendered in the owning Bank Account's currency. See [`CONTEXT.md`](../../../CONTEXT.md) for the glossary entry.

## Entity

### Allocation

| Field           | Type     | Notes                                                            |
| ---------------- | -------- | ------------------------------------------------------------------ |
| `id`             | string   | auto-generated (uuidv7)                                            |
| `bankAccountId`  | string   | FK → BankAccount, `onDelete: cascade`                               |
| `bucketId`       | string   | FK → Bucket, `onDelete: cascade`                                     |
| `amount`         | integer  | minor units (cents) via `currencyCodec`, in the Bank Account's currency |
| `note`           | string   | nullable                                                            |
| `date`           | datetime | user-editable, defaults to now on creation                          |
| `createdAt`      | datetime |                                                                      |

No `updatedAt` column — same reasoning as every other entity in this app (no sync/API client, no per-User concurrent-edit conflict scenario to detect). No `currency` column — same reasoning as Transaction (see below).

## Design Decisions

### `Unallocated ≥ 0` Invariant

Enforced on every mutation that could reduce a Bank Account's Unallocated balance: `validateLogAllocationAmount` (log) and `validateEditAllocationAmount` (edit, recomputes with the edited amount substituted in). Both are called twice — once client-side as an async form validator (debounced 500ms), once server-side inside `logAllocation`/`editAllocation` itself, so the check can't be bypassed by calling the server function directly. Delete needs no guard: removing an Allocation only ever increases Unallocated. This is the same invariant, and largely the same shared seam (`getBankAccountUnallocatedBalance`), that Transaction's mutations enforce — see `transactions/SPEC.md`.

### No Currency of Its Own

An Allocation's amount is stored in minor units of the owning Bank Account's currency (`currencyCodec`), same pattern as Transaction. `getAllocation` joins the Bank Account's `currency` column specifically to render the amount correctly.

### Visible From Both Parents, No Standalone View

Unlike Transaction (embedded only in its Bank Account's detail page), an Allocation is embedded in **two** places: the Bucket detail page (a flat table, `ALLOCATIONS_COLUMNS` in `buckets/columns.tsx`) and the Bank Account detail page (an "Allocations" tab alongside "Transactions", `ALLOCATIONS_COLUMNS` in `bank-accounts/columns.tsx` — a separate column-def despite the shared name). There is no standalone, cross-account/cross-bucket Allocation list today. See Future Considerations.

### Reassignment Is Not Supported — By Design

`editAllocationSchema` only accepts `amount`, `date`, and `note`. There is no way to move an existing Allocation to a different Bucket or fund it from a different Bank Account after creation — the only path is delete, then log a new one. This is a permanent boundary, not a gap: it mirrors Bucket's "edit is name-only" precedent, and re-parenting an Allocation is really "undo this earmark, make a new one," which delete + log already covers without a dedicated flow.

### Delete Uses Plain Confirmation, Not Typed Confirmation

Same reasoning as Transaction (per ADR 0001/0002's typed-confirmation precedent for Bank Account/Bucket, which cascade and destroy other records): nothing references an Allocation as a parent, so deleting one has no cascade. `AllocationActionsDropdownMenu` uses the app's plain `confirm()` Yes/No dialog, which states that the money returns to the account's unallocated pool. No ADR needed — this is a direct, unsurprising consequence of "no cascade," not an independent trade-off.

## Features

| #   | Feature           | Status                                                                                     |
| --- | ------------------ | ---------------------------------------------------------------------------------------------- |
| 1   | Log Allocation     | **Implemented and correct.** Enforces `Unallocated ≥ 0`.                                        |
| 2   | View Allocation    | **Implemented and correct**, embedded in both the Bucket detail page and the Bank Account detail page. No standalone list (see Future Considerations). |
| 3   | Edit Allocation     | **Implemented and correct.** Amount/date/note only; recomputes `Unallocated` with the edit applied before allowing it. Reassigning Bucket/Bank Account is a permanent non-feature (see Design Decisions). |
| 4   | Delete Allocation  | **Implemented and correct.** Hard delete, no cascade, plain confirmation.                        |

## Fixed During This Session

Four bugs were found and fixed while writing this spec:

- **`schemas.ts` — dead date validation.** `date: z.date().min(1, "Date is required.")` had the exact same no-op `.min(1)` bound already found and fixed in `transactions/schemas.ts` — no real date could ever fail it. Removed.
- **`schemas.ts` — amount bound didn't match its own error message.** `amount: z.coerce.number().min(1, "Amount must be greater than 0.")`, present in four places (`validateLogAllocationAmountSchema`, `logAllocationSchema`, `validateEditAllocationAmountSchema`, `editAllocationSchema`), silently rejected valid sub-unit amounts (e.g. ₱0.50) the error message claimed were fine. Same bug already fixed once in Transaction; changed all four bounds to `.min(0.01, ...)`.
- **`log-allocation-dialog.tsx` and `edit-allocation-dialog.tsx` — copy-pasted `aria-labelledby`.** Both amount fields pointed `aria-labelledby` at `"startingBalance-error"` (a leftover from the bank-accounts starting-balance field) instead of their own error id. Fixed to reference each field's own `errorId`.
- **`middlewares.ts` — broken ownership check (IDOR).** `verifyUserAllocationMiddleware` guarded with `if (!result) throw`, but `result` came from `db.select()...limit(1)`, which is always an array — even empty — so the guard never fired. Any authenticated user who knew another user's `allocationId` could read/edit/delete it via `getAllocation`/`editAllocation`/`deleteAllocation`, none of which re-check ownership downstream. The identical bug existed in `transactions/middlewares.ts` (`verifyUserTransactionMiddleware`) and was fixed in the same pass, committed together. Bucket/BankAccount's equivalent middleware were unaffected — they use `.findFirst()`, which returns `undefined` on no match, so their falsy check already worked.

## Future Considerations

### Cross-Account/Cross-Bucket Allocation List

**Undesigned, deliberately out of scope.** No standalone Allocation list/search exists today — only the two embedded views (Bucket detail, Bank Account detail tab). Could eventually mirror the cross-account Transaction list ([`docs/specs/transaction-list-and-transfer.md`](../../../docs/specs/transaction-list-and-transfer.md)) once/if that pattern is wanted here — same shape of feature, not yet spec'd for Allocation.

### `Distribution` (Planned, Undesigned)

A saved, reusable, manually-triggered preset that logs one `income` Transaction on a fixed Bank Account and then splits the amount via Allocations across Buckets (and, once they exist, Goals/Debts). See the `Distribution` entry in [`CONTEXT.md`](../../../CONTEXT.md). Relevant here because triggering a Distribution would call into this module's `logAllocation` programmatically, once designed.
