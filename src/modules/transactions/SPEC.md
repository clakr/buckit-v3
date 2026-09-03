# Module Spec: Transactions

## Overview

A Transaction is a record of money moving into (`income`) or out of (`expense`) a Bank Account. It always attaches to exactly one Bank Account — never to a Bucket — and is the sole input to that account's computed Balance. Transactions have no currency of their own; amounts are stored in minor units of the owning Bank Account's currency. See [`CONTEXT.md`](../../../CONTEXT.md) for the glossary entry.

## Entity

### Transaction

| Field           | Type     | Notes                                                                     |
| --------------- | -------- | ------------------------------------------------------------------------- |
| `id`            | string   | auto-generated (uuidv7)                                                   |
| `bankAccountId` | string   | FK → BankAccount, `onDelete: cascade`                                     |
| `type`          | enum     | `income` \| `expense`                                                     |
| `amount`        | integer  | minor units (cents) via `currencyCodec`, in the owning account's currency |
| `note`          | string   | nullable                                                                  |
| `date`          | datetime | user-editable, defaults to now on creation                                |
| `createdAt`     | datetime |                                                                           |

No `updatedAt` column and no `bucketId` column — same reasoning as Bank Account/Bucket for the former (no sync/API client, no per-User concurrent-edit conflict scenario to detect), and a permanent design boundary for the latter (see Design Decisions).

## Design Decisions

### Balance Contribution

A Transaction's `type` determines its sign in the Balance formula: `Balance = startingBalance + Σ(income amounts) − Σ(expense amounts)`, computed on read via `getBankAccountUnallocatedBalance` (`src/modules/bank-accounts/utils.ts`). Transaction itself has no derived/stored balance field.

### No Currency of Its Own

Amount is stored in minor units of the owning Bank Account's currency (`currencyCodec`). There is no per-Transaction currency field — `getTransaction` joins the Bank Account's `currency` column specifically to render amounts correctly.

### Permanent Boundary: Never Attaches to a Bucket

`transactions.bucketId` does not exist and never will under this model. Spending/income always happens at the Bank Account level; Buckets only ever change via Allocations. This mirrors the boundary already documented in `buckets/SPEC.md`.

### `Unallocated ≥ 0` Invariant

Enforced on every mutation that could reduce a Bank Account's Unallocated balance: `validateLogTransaction` (log, expense only), `validateEditTransaction` (edit, recomputes with the edited amount/type substituted in), and `validateDeleteTransaction` (delete, recomputes with the transaction removed). All three call the same `getBankAccountUnallocatedBalance` used by Allocation's validators — the single shared seam for this rule across the app.

### Delete Uses Plain Confirmation, Not Typed Confirmation

Unlike Bank Account and Bucket deletion (per ADR 0001/0002: typed confirmation — re-type the entity's name — because those deletes cascade and destroy other records), Transaction deletion uses the app's plain `confirm()` Yes/No dialog. **This is intentional and correct, not an inconsistency**: nothing references a Transaction as a parent, so deleting one has no cascade — exactly the condition the ADRs use to justify the stronger gate for Bank Account/Bucket. `validateDeleteTransaction` still computes and surfaces a specific message (the type and formatted amount that will be removed, or a rejection if it would leave Unallocated negative) before the confirm dialog opens.

### No Standalone List/Search View

Transactions are only ever viewed embedded in a Bank Account's detail page (`TRANSACTIONS_COLUMNS`, sorted by date desc). There is no cross-account list, filter, or search today — see Future Considerations.

## Features

| #   | Feature            | Status                                                                                          |
| --- | ------------------ | ----------------------------------------------------------------------------------------------- |
| 1   | Log Transaction    | **Implemented and correct.** Enforces `Unallocated ≥ 0` for expenses.                           |
| 2   | View Transaction   | **Implemented and correct**, embedded in the owning Bank Account's detail page only.            |
| 3   | Edit Transaction   | **Implemented and correct.** Recomputes `Unallocated` with the edit applied before allowing it. |
| 4   | Delete Transaction | **Implemented and correct.** Hard delete, no cascade, plain confirmation (see above).           |

## Fixed During This Session

Three small correctness bugs were found and fixed while writing this spec:

- **`schemas.ts` — dead date validation.** `date: z.date().min(1, "Date is required.")` had a `.min(1)` bound that resolves to `1970-01-01T00:00:00.001Z` — no real date could ever fail it, and `z.date()` alone already rejects missing/invalid values. Removed the no-op `.min(1)`.
- **`schemas.ts` — amount bound didn't match its own error message.** `amount: z.coerce.number().min(1, "Amount must be greater than 0.")` actually required the amount to be ≥ 1 whole currency unit, silently rejecting valid sub-unit amounts (e.g. ₱0.50) the error message claimed were fine. Changed the bound to `.min(0.01, ...)`.
- **`forms.tsx` — copy-pasted `aria-labelledby`.** The amount field's input pointed `aria-labelledby` at `"startingBalance-error"` (a leftover from the bank-accounts starting-balance field) instead of its own error id. Fixed to reference the field's own `errorId`.

No ADR was written for the delete-confirmation asymmetry noted above — it's a direct, unsurprising consequence of "no cascade," not an independent trade-off.

## Future Considerations

### Categorization / Tags

Not implemented. Today a Transaction's only classification is the binary `income`/`expense` `type`. A category/tag system (e.g. "Groceries", "Rent") is a planned feature the user intends to build — but as its own module (`categories`) with its own CRUD lifecycle, not as part of this one. Noted here only because Transaction would gain a `categoryId` reference once it exists; not designed yet, and deliberately not scoped into this module's build.

### Cross-Account Transaction List/Search

**Spec'd, not yet built.** A view across all of a user's Bank Accounts, filterable by account/type/date and searchable by note. See [`docs/specs/transaction-list-and-transfer.md`](../../../docs/specs/transaction-list-and-transfer.md).

### `Distribution` (Planned, Undesigned)

A saved, reusable, manually-triggered preset that logs one `income` Transaction on a fixed Bank Account and then splits the amount via Allocations across Buckets (and, once they exist, Goals/Debts). See the `Distribution` entry in [`CONTEXT.md`](../../../CONTEXT.md) for the full definition. Relevant here because triggering a Distribution is, in part, a programmatic call into this module's `logTransaction`.

### Transfer Between Own Accounts

**Spec'd, not yet built.** Same-currency-only, modeled as two ordinary Transactions (an expense on the source account, an income on the destination account) connected only by a shared, auto-generated note — no new schema. See [`docs/specs/transaction-list-and-transfer.md`](../../../docs/specs/transaction-list-and-transfer.md), which also documents this in `bank-accounts/SPEC.md`.
