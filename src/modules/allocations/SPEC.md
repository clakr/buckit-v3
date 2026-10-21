# Module spec: Allocations

## Overview

An Allocation is money earmarked from a Bank Account toward a Bucket. It stays in the Bank Account's Balance but reduces that account's computed Unallocated amount. It has no currency of its own, and the app always shows it in the owning Bank Account's currency. See [`CONTEXT.md`](../../../CONTEXT.md) for the glossary entry.

## Entity

### Allocation

| Field           | Type     | Notes                                                                                             |
| --------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `id`            | string   | generated (uuidv7)                                                                                |
| `bankAccountId` | string   | foreign key to BankAccount, `onDelete: cascade`                                                   |
| `bucketId`      | string   | foreign key to Bucket, `onDelete: cascade`                                                        |
| `amount`        | integer  | minor units (cents) through the Money module (`src/lib/money.ts`), in the Bank Account's currency |
| `note`          | string   | nullable                                                                                          |
| `date`          | datetime | the user can edit it, and it defaults to now on creation                                          |
| `createdAt`     | datetime |                                                                                                   |

It has no `updatedAt` column, for the same reason as every other entity in this app. No sync or API client exists, and a User's Sessions have no concurrent-edit conflict to detect. It has no `currency` column, for the same reason as Transaction (see below).

## Design decisions

### The `Unallocated ≥ 0` rule

Every mutation that could reduce a Bank Account's Unallocated balance enforces the rule. Those are `logAllocation` and `editAllocation`, where the edit recomputes Unallocated with the new amount in place of the old one. **The write runs the check.** Both call one private check, `checkAllocationAmount`, on the server right before writing, and throw `InsufficientFundsError` when it fails. The error message, from `describeInsufficientUnallocated` in `src/lib/money.ts`, names the Bank Account and its Available amount. For an edit, Available counts the edited Allocation as returned, so it is the most that Allocation can be.

The dialogs show the same Available figure under the amount field and compare against it as the user types, with the same message. The Log dialog takes the figure from the chosen Bank Account and checks again when the account changes. The Edit dialog takes it from `getAllocation`'s `available`. This check sends no request. If the figure is out of date because something changed the account in the meantime, the write rejects and the failure toast shows the reason. Delete needs no Unallocated check, because removing an Allocation can only increase Unallocated. Once Withdrawals are built, edit and delete will also have to pass a second check: what the Bucket holds from that Bank Account, its Allocations minus its Withdrawals, can't go negative. See [`docs/specs/withdrawal.md`](../../../docs/specs/withdrawal.md), story 25. Transaction's mutations enforce the same rule with the same check, `checkUnallocated` in `src/modules/bank-accounts/figures.server.ts`. See `transactions/SPEC.md`.

### No currency of its own

An Allocation's amount is stored in minor units of the owning Bank Account's currency (see the Money module, `src/lib/money.ts`), as with Transaction. `getAllocation` returns its Bank Account's `name` and `currency` so the UI can format the amount. Both come from the account's figures, which also give its `available`. It throws `NotFoundError` for a missing Allocation or someone else's, so the Edit dialog shows "Allocation not found" with Close instead of a Retry that can't help.

### Shown inside both parents, with no list of its own

A Transaction appears only on its Bank Account's detail page. An Allocation appears in **two** places: the Bucket detail page, as a flat table, and the Bank Account detail page, in an "Allocations" tab next to "Transactions". Both read through this module. `getAllocations({ bucketId?, bankAccountId? })` returns the user's Allocations, each with its Bank Account's `id`, `name` and `currency` and its Bucket's `id` and `name`. `getAllocationColumns({ omit })` returns one set of columns without the parent the page already shows. The query always goes through the user's own Bank Accounts, so someone else's Bucket or Bank Account comes back as an empty list, after the page's own query has already shown "not found". No list of Allocations across all accounts and buckets exists today. See Future considerations.

### Logging starts from either parent

The Log dialog opens from a Bank Account's menu or a Bucket's menu. Callers pass only that side's id, as `{ from: "bank-account", bankAccountId }` or `{ from: "bucket", bucketId }`. That side stays fixed, and the dialog shows a picker for the other side. Whichever side it opened from, it loads the user's Bank Accounts, with figures, and Buckets itself, so the account's Available always comes from the live list. While either list loads, it shows a loading state. If a list fails to load, it shows "Could not load …" with Retry. If the fixed side was deleted in the meantime, it shows "Bank account not found" or "Bucket not found" with Close. The Bank Account picker is the shared `BankAccountSelectField` (`src/modules/bank-accounts/components/bank-account-select-field.tsx`), the same one the Record Debt and Log Repayment dialogs use.

### No moving an Allocation, by design

`editAllocationSchema` only accepts `amount`, `date` and `note`. After creation, an Allocation can't move to a different Bucket or take its money from a different Bank Account. The only way is to delete it and log a new one. This boundary is permanent. It follows Bucket's rule that edit only renames. Moving an Allocation really means undoing one earmark and making another, and delete followed by log already does that without a dedicated flow.

### Delete uses a plain confirmation, not a typed one

The reason is the same as for Transaction. ADR 0001 and ADR 0002 use typed confirmation for Bank Account and Bucket, because deleting those cascades and destroys other records. Nothing references an Allocation as a parent, so deleting one cascades nowhere. `AllocationActionsDropdownMenu` uses the app's plain `confirm()` Yes/No dialog, which says the money returns to the account's unallocated pool. This needs no ADR, because it follows directly from having no cascade.

## Features

| #   | Feature           | Status                                                                                                                                                                                                                                |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Log Allocation    | **Implemented and correct.** Enforces `Unallocated ≥ 0`.                                                                                                                                                                              |
| 2   | View Allocation   | **Implemented and correct**, shown inside both the Bucket detail page and the Bank Account detail page. No list of its own (see Future considerations).                                                                               |
| 3   | Edit Allocation   | **Implemented and correct.** Only amount, date and note. It recomputes `Unallocated` with the edit applied before allowing it. Moving an Allocation to another Bucket or Bank Account will never be a feature (see Design decisions). |
| 4   | Delete Allocation | **Implemented and correct.** Hard delete, no cascade, plain confirmation. Withdrawals will add a held-amount check (see Future considerations).                                                                                       |

## Fixed during this session

Writing this spec turned up four bugs, all fixed:

- **`schemas.ts` had a date check that did nothing.** `date: z.date().min(1, "Date is required.")` had the same useless `.min(1)` bound already fixed in `transactions/schemas.ts`. No real date could fail it, so it was removed.
- **`schemas.ts` had an amount bound that contradicted its own error message.** `amount: z.coerce.number().min(1, "Amount must be greater than 0.")` appeared in four schemas: `validateLogAllocationAmountSchema`, `logAllocationSchema`, `validateEditAllocationAmountSchema` and `editAllocationSchema`. It rejected valid amounts under one unit, such as ₱0.50, that the message said were fine. Transaction had already had the same bug fixed. All four bounds became `.min(0.01, ...)`.
- **`log-allocation-dialog.tsx` and `edit-allocation-dialog.tsx` had a copy-pasted `aria-labelledby`.** Both amount fields pointed `aria-labelledby` at `"startingBalance-error"`, left over from the bank-accounts starting-balance field, instead of their own error id. Each now references its own `errorId`.
- **`middlewares.ts` had a broken ownership check, an IDOR.** `verifyUserAllocationMiddleware` checked `if (!result) throw`. But `result` came from `db.select()...limit(1)`, which always returns an array, even an empty one, so the check never threw. Any signed-in user who knew another user's `allocationId` could read, edit or delete it through `getAllocation`, `editAllocation` or `deleteAllocation`, and none of those check ownership again later. `verifyUserTransactionMiddleware` in `transactions/middlewares.ts` had the same bug, and the same commit fixed both. The Bucket and BankAccount middleware didn't have the bug. They use `.findFirst()`, which returns `undefined` when nothing matches, so their check already worked.

## Future considerations

### Allocation list across accounts and buckets

**Specified, not built.** Today there is no list or search of Allocations of its own, only the two views inside the Bucket detail page and the Bank Account detail tab. [`docs/specs/allocation-cross-account-and-bucket-list.md`](../../../docs/specs/allocation-cross-account-and-bucket-list.md) specifies one. It follows the Transaction list across accounts in [`docs/specs/transaction-list-and-transfer.md`](../../../docs/specs/transaction-list-and-transfer.md).

### Withdrawals (specified, not built)

A Withdrawal spends money out of a Bucket as an `expense` Transaction on one Bank Account ([ADR 0004](../../../docs/adr/0004-withdrawals-spend-from-buckets.md)). It never changes an Allocation, but it changes three things here. Unallocated becomes `Balance − Σ allocations + Σ withdrawals`. Editing or deleting an Allocation is blocked if it would leave the Bucket holding less than nothing from that Bank Account. And the delete confirmation can no longer promise that all of the money returns to the unallocated pool, only what hasn't been withdrawn. See [`docs/specs/withdrawal.md`](../../../docs/specs/withdrawal.md).

### `Distribution` (planned, undesigned)

A saved preset the User triggers by hand. It logs one `income` Transaction on a fixed Bank Account, then splits the amount through Allocations across Buckets, and across Goals and Debts once those exist. See the `Distribution` entry in [`CONTEXT.md`](../../../CONTEXT.md). It matters here because, once designed, triggering a Distribution would call this module's `logAllocation` from code.
