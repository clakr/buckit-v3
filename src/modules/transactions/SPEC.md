# Module spec: Transactions

## Overview

A Transaction is a record of money moving into (`income`) or out of (`expense`) a Bank Account. It always belongs to exactly one Bank Account and never to a Bucket, and it is the only input to that account's computed Balance. Transactions have no currency of their own. Amounts are stored in minor units of the owning Bank Account's currency. See [`CONTEXT.md`](../../../CONTEXT.md) for the glossary entry.

## Entity

### Transaction

| Field           | Type     | Notes                                                                                               |
| --------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `id`            | string   | generated (uuidv7)                                                                                  |
| `bankAccountId` | string   | foreign key to BankAccount, `onDelete: cascade`                                                     |
| `type`          | enum     | `income` \| `expense`                                                                               |
| `amount`        | integer  | minor units (cents) through the Money module (`src/lib/money.ts`), in the owning account's currency |
| `note`          | string   | nullable                                                                                            |
| `date`          | datetime | the user can edit it, and it defaults to now on creation                                            |
| `createdAt`     | datetime |                                                                                                     |

It has no `updatedAt` column, for the same reason as Bank Account and Bucket. No sync or API client exists, and a User's Sessions have no concurrent-edit conflict to detect. It has no `bucketId` column either, and that boundary is permanent (see Design decisions).

## Design decisions

### How a Transaction counts toward Balance

A Transaction's `type` sets its sign in the Balance formula: `Balance = startingBalance + Σ(income amounts) − Σ(expense amounts)`. The Bank Account figures module computes it on read. `getBankAccountFigures` in `src/modules/bank-accounts/utils.ts` does the arithmetic, and `src/modules/bank-accounts/figures.server.ts` supplies the SQL totals. A Transaction stores no balance of its own.

### No currency of its own

The amount is stored in minor units of the owning Bank Account's currency (see the Money module, `src/lib/money.ts`). A Transaction has no currency field, so `getTransaction` joins the Bank Account's `currency` column to format amounts.

### Permanent boundary: never attaches to a Bucket

`transactions.bucketId` doesn't exist and never will under this model. Spending and income always happen on a Bank Account, and a Bucket only changes through Allocations. `buckets/SPEC.md` documents the same boundary.

### The `Unallocated ≥ 0` rule

Every mutation that could reduce a Bank Account's Unallocated balance enforces the rule:

- `logTransaction`, for expenses only.
- `editTransaction`, which recomputes with the new amount and type in place of the old ones, through `assertTransactionEditAllowed`.
- `deleteTransaction`, which recomputes without the transaction.

All three call `checkUnallocated` (`src/modules/bank-accounts/figures.server.ts`). Allocation, Debt and Repayment use the same check, so the rule lives in one place. **The write runs the check.** Each mutation runs it on the server right before writing and throws `InsufficientFundsError` when it fails. The Log Transaction Drawer also flags an expense above Unallocated as the user types (see the 2026-10-21 entry below). The Edit Transaction Drawer has no separate check before submitting. When the write rejects, the failure toast shows the reason and the Drawer stays open with the user's input. Delete keeps `validateDeleteTransaction`, because the confirm dialog needs its preview before the user confirms: what will be removed, or why it can't be.

### Linked Transactions follow their Debt's or Bucket's rules

A Linked Transaction (see `CONTEXT.md`) follows the rules of the Debt or Withdrawal it backs, for edit and delete, from whichever page the user starts on. One module, `linked.server.ts`, holds the rules:

- `assertTransactionEditAllowed` rejects these changes with `ConflictError`:
  - changing a Linked Transaction's type;
  - changing an origination's amount;
  - dating a repayment before its Debt.

  For a Debt link it then runs the usual `Unallocated` check. A Withdrawal's Transaction skips that check, because it moves Balance and the earmark by the same amount, so Unallocated can't change. Instead, raising its amount runs the held check (`checkHeld` in `src/modules/buckets/figures.server.ts`) and throws `InsufficientFundsError` past what the Bucket holds from that Bank Account. The message names the most the amount can be.

- `editTransaction`, the Repayment storage module's `changeRepayment` and `editWithdrawal` all call it on the server.
- `getTransaction` returns the link and the fields it locks. The Edit Transaction Drawer disables those fields and says why.
- The Bank Account's Transactions table marks a Withdrawal's Transaction with a link to its Bucket.
- The database deletes a repayment along with its Transaction. `repayments.transactionId` is `ON DELETE CASCADE`, so deleting a Transaction deletes its repayment. So does deleting a Bank Account, which cascades to its Transactions. `isRepaymentBackedBy` only finds those repayments for the Bank Account deletion preview.

`withdrawals.transactionId` cascades the same way. Creating links, in `recordDebt`, `logRepayment` and `logWithdrawal`, stays in the Debts and Withdrawals modules, as does `deleteDebt`'s option to also delete the Transactions, because those are Debt actions.

### Delete uses a plain confirmation, not a typed one

Bank Account and Bucket deletion use typed confirmation, where the user re-types the entity's name. ADR 0001 and ADR 0002 justify that because those deletes cascade and destroy other records. Transaction deletion uses the app's plain `confirm()` Yes/No dialog instead, on purpose. The ADRs justify the stronger guard only for a delete that destroys other history, and deleting a Transaction destroys none.

Since the Debt and Withdrawal modules, three things can point at a Transaction, and none changes that:

- A repayment backed by the Transaction is the same money recorded twice. The foreign key cascade deletes it with the Transaction, and the Debt's outstanding goes back up.
- A Debt the Transaction funded stays, with no source account, through the foreign key's `SET NULL`. This matches story 25 in `docs/specs/debt-module.md`.
- The foreign key cascade deletes a Withdrawal backed by the Transaction, and the money goes back into the Bucket. This matches story 24 in `docs/specs/withdrawal.md`.

Before the confirm dialog opens, `validateDeleteTransaction` builds a specific message. It names the type and formatted amount being removed and whichever consequence above applies. If the delete would leave Unallocated negative, it returns a rejection instead.

### No list or search of its own

Transactions only appear on a Bank Account's detail page, in `TRANSACTIONS_COLUMNS`, sorted by date with the newest first. There is no list, filter or search across accounts today. See Future considerations.

## Features

| #   | Feature            | Status                                                                                                                                            |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Log Transaction    | **Implemented and correct.** Enforces `Unallocated ≥ 0` for expenses.                                                                             |
| 2   | View Transaction   | **Implemented and correct**, only on the owning Bank Account's detail page.                                                                       |
| 3   | Edit Transaction   | **Implemented and correct.** Recomputes `Unallocated` with the edit applied. A Linked Transaction keeps its Debt's or Bucket's rules (see above). |
| 4   | Delete Transaction | **Implemented and correct.** Hard delete with a plain confirmation. It also deletes a repayment or Withdrawal the Transaction backs (see above).  |

## Fixed during this session

Writing this spec turned up three small correctness bugs, all fixed:

- **`schemas.ts` had a date check that did nothing.** In `date: z.date().min(1, "Date is required.")`, the `.min(1)` bound means `1970-01-01T00:00:00.001Z`. No real date could fail it, and `z.date()` alone already rejects missing or invalid values. The `.min(1)` was removed.
- **`schemas.ts` had an amount bound that contradicted its own error message.** `amount: z.coerce.number().min(1, "Amount must be greater than 0.")` required at least 1 whole currency unit. It rejected valid amounts under one unit, such as ₱0.50, that the message said were fine. The bound became `.min(0.01, ...)`.
- **`forms.tsx` had a copy-pasted `aria-labelledby`.** The amount input pointed `aria-labelledby` at `"startingBalance-error"`, left over from the bank-accounts starting-balance field, instead of its own error id. It now references the field's own `errorId`.

No ADR covers the difference in delete confirmation described above. It follows from a Transaction delete destroying no other history.

- **2026-10-21. Log Transaction opens with an id and checks expenses as the user types.** It used to render a Bank Account row captured when the row menu opened. Only the write caught an expense larger than Unallocated, unlike Log Allocation, Log Repayment and Record Debt. Its store now holds `{ bankAccountId }`. The dialog reads the account from `bankAccountsQueryOption()`, the list the Accounts page has already loaded, and that page is the dialog's only opener. So it opens instantly with live figures. It shows a loading state, "Account not found" with Close, and "Could not load accounts" with Retry. For an expense, it shows "Available: …" under the amount and flags an amount above Unallocated as the user types, checking again when the type changes. Income can't overdraw, so it isn't checked. `logTransaction` rejects with the same `describeInsufficientUnallocated` message (`src/lib/money.ts`) instead of the generic "This would leave a negative unallocated balance" one. Since 2026-10-24 the store is gone. Log Transaction is a Drawer whose `logTransactionDrawerHandle` takes `{ bankAccountId }` as its payload (see `docs/specs/transaction-list-and-transfer.md`).

## Future considerations

### Categories and tags

Not implemented. Today a Transaction's only classification is its `income` or `expense` `type`. The user plans a category and tag system, such as "Groceries" and "Rent". It will be its own module, `categories`, with its own lifecycle for creating, renaming and deleting categories, not part of this module. It's noted here only because Transaction would gain a `categoryId` reference once it exists. It isn't designed yet, and this module's build leaves it out on purpose.

### Transaction list and search across accounts

**Specified, not built.** A view across all of a user's Bank Accounts, filterable by account, type and date, and searchable by note. See [`docs/specs/transaction-list-and-transfer.md`](../../../docs/specs/transaction-list-and-transfer.md).

### `Distribution` (planned, undesigned)

A saved preset the User triggers by hand. It logs one `income` Transaction on a fixed Bank Account, then splits the amount through Allocations across Buckets, and later across Debts too. Funding a Goal means funding its Bucket. See the `Distribution` entry in [`CONTEXT.md`](../../../CONTEXT.md) for the full definition. It matters here because triggering a Distribution partly means calling this module's `logTransaction` from code.

### Transfer between own accounts

**Specified, not built.** Both accounts must share a currency. A transfer is two ordinary Transactions, an expense on the source account and an income on the destination, connected only by generated notes, with no new schema. See [`docs/specs/transaction-list-and-transfer.md`](../../../docs/specs/transaction-list-and-transfer.md). `bank-accounts/SPEC.md` documents the same design.
