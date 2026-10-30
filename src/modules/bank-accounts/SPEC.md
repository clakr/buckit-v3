# Module spec: Bank Accounts

> A note on naming. This pass renamed the module folder and internal identifiers to `bank-accounts` and `BankAccount*`, to match the module's export names, such as `getBankAccount` and the `bankAccounts` table. The route paths `/accounts` and `/accounts/$accountId` stayed the same on purpose. See [`CONTEXT.md`](../../../CONTEXT.md) for why UI copy says "Account" while code says `BankAccount`.

## Overview

A Bank Account is a real-world container of liquid money, such as cash, checking or savings, owned by a user. It has one fixed currency, and the app computes its balance from transactions. Nobody sets the balance by hand after creation. It holds assets only, so it can never go negative. Debts, credit and liabilities don't belong in this entity. The Debt module tracks them.

## Entity

### BankAccount

| Field             | Type     | Notes                                                                                               |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `id`              | string   | generated (uuidv7)                                                                                  |
| `userId`          | string   | foreign key to Users, which decides ownership                                                       |
| `name`            | string   | label the user gives, unique per user ignoring case, editable                                       |
| `currency`        | string   | such as PHP or QAR. **Can't change after creation.**                                                |
| `startingBalance` | integer  | minor units (cents) through the Money module (`src/lib/money.ts`). **Can't change after creation.** |
| `createdAt`       | datetime |                                                                                                     |

It has no `updatedAt` column. That was considered and deferred on purpose (see Design decisions).

## Design decisions

### Never negative

A Bank Account's `Balance` must never go negative. Every mutation that could reduce it checks `Unallocated ≥ 0` on the server before writing, because `Unallocated ≤ Balance` always holds. Those mutations are `logTransaction`, `editTransaction`, `deleteTransaction`, the Allocation writes, and the Debt and Repayment writes. The check replays the account's whole history in date order with the change applied (`ledger.ts`, called from `figures.server.ts`), so it also rejects a change that would leave Balance or Unallocated negative at an earlier date, such as an expense backdated before the income that covers it. Within a day, income counts first, then everything else in the order it was logged, and days are UTC days. An account whose history was already negative before the change doesn't block unrelated writes. The rule is the same for every Bank Account, and no account type or flag allows an overdraft. Anything negative or owed, such as an IOU or a credit card balance, belongs in the Debt module, not in a Bank Account.

### Ownership through the Bank Account

Only BankAccount has a `userId`. Transactions and Allocations get their user through `bankAccountId → BankAccount.userId`. One file applies that rule, `src/modules/bank-accounts/ownership.server.ts`, through two functions:

- `findOwnedBankAccount`. `verifyUserBankAccountMiddleware` uses it, and so do the Debt and Repayment source-account checks, because `recordDebt` and `logRepayment` have no bank-account middleware of their own.
- `isOwnedThroughBankAccount`. The Transaction and Allocation middlewares use it.

A missing record and someone else's record both throw `NotFoundError`. Nobody can probe an id to learn whether it exists, and the client doesn't retry a not-found.

### Starting balance stored on the account

`startingBalance` is a plain field on BankAccount, not an opening income Transaction. An opening Transaction would cause a chicken-and-egg problem, because the opening balance would need a Bucket to allocate into before any Bucket exists.

### Currency can't change

After creation, `currency` can't change. Existing Transactions and Allocations are recorded in that currency, and changing it would change what every past amount means.

### Starting balance can't change

After creation, `startingBalance` can't change either, and that limit is permanent. It is a snapshot of one moment. If it's wrong, the only fixes are to enter it correctly at creation, or to delete the account, which destroys its history, and create it again. Neither field can be fixed later, so the creation form must say so in inline field descriptions before the user submits. See the Create Bank Account row in Features below.

### Balance formula

`Balance = startingBalance + Σ(income transaction amounts) − Σ(expense transaction amounts)`

The app computes it on every read and never stores it.

### Unallocated formula

`Unallocated = Balance − Σ(allocation amounts from this account)`

### Name uniqueness

A name must be unique per user, ignoring case, after trimming. The check compares SQLite's `lower()` of both names, which is the same folding the index uses. It only folds ASCII letters, so "Ñ" and "ñ" count as different names. Create and edit both run the check. The edit check excludes the account's own current name, so changing only its case is allowed.

One rule, `bankAccountNameRule` in `name.server.ts`, serves both the forms and the writes. It's built with `createUniqueNameRule` from `src/lib/unique-name.server.ts`, which Bank Account and Bucket share. The Register Account and Edit Account Drawers reach it through the `validateBankAccountName` server function. The writes call it directly on the server.

The database enforces the same rule with a unique index on `(user_id, lower(name))`, from migration `20261015044209_bank_account_name_case_insensitive`. Two requests at the same moment therefore can't create both "Savings" and "savings". When the index rejects a write, the write throws the same `ConflictError` as a failed check. The older case-sensitive `unique(userId, name)` constraint stays. Dropping a table-level constraint needs a table rebuild, and on D1, dropping `bank_accounts` would cascade-delete every Transaction and Allocation.

### Deletion destroys data instead of being blocked

**This reverses an earlier policy.** The old version blocked deleting any account with transactions or allocations. Run `git show bc77e36^:src/modules/accounts/specs/05-delete-account.md` to see it. Now, deleting a Bank Account hard-deletes it, and the existing `onDelete: "cascade"` foreign key deletes all of its Transactions and Allocations. Deleting the Transactions also cascades to the Withdrawals drawn from the account, through `withdrawals.transactionId`. A typed confirmation guards it, where the user re-types the account name, instead of a check that blocks it. We chose this so the user doesn't have to delete every Transaction and Allocation by hand before deleting the account. The cost is that a mistaken delete can't be undone. See [`docs/adr/0001-hard-delete-bank-accounts.md`](../../../docs/adr/0001-hard-delete-bank-accounts.md).

### `updatedAt` deferred

The other tables in the schema, `users`, `sessions`, `accounts` and `verifications`, have an `updatedAt` column, and `bankAccounts` doesn't. This was considered and deferred. The only editable field is `name`, and no sync or API client exists. A User may hold several Sessions across devices at once (see `authentication/SPEC.md`), but a single Bank Account's data has no concurrent-edit conflict to detect. Add the column when something needs it, such as a sync cursor, conflict detection or a "last edited" label, and not before.

### Transfers between accounts (specified, not built)

**A transfer must only be allowed between two Bank Accounts of the same currency**, because this ledger doesn't convert between currencies. [`docs/specs/transaction-list-and-transfer.md`](../../../docs/specs/transaction-list-and-transfer.md) specifies it as two ordinary Transactions, an expense on the source account and an income on the destination, connected only by generated notes, with no new schema.

### Money (`src/lib/money.ts`)

Since 2026-10-20, every amount goes through one module, which all modules share on both client and server. Amounts are stored as integer cents next to their currency.

- `amountSchema`, for amounts above 0, and `nonNegativeAmountSchema(message)`, for Starting Balance, which may be 0, take what the user typed. They allow at most 2 decimal places, with "Use at most 2 decimal places." as the field error, and parse the input to cents. Server functions receive cents, and no other code parses amounts.
- `formatMoney(cents, currency)` formats an amount, and the currency is required. `centsToAmountInput(cents)` gives an edit form its starting value.
- `exceedsAvailable(amountInput, availableCents)` is the Drawers' check, as the user types, for an amount above Unallocated. `describeInsufficientUnallocated({ bankAccount, availableCents, purpose })` builds its message, which the writes also use. `purpose`, either "loan" or "repayment", keeps each Drawer's own wording.

**Known limit.** Every currency is treated as having 2 decimal places. That's wrong for currencies such as JPY, with 0, or KWD, with 3, and the currency picker still offers them. Fixing it means storing minor units per currency and migrating any amounts already stored in such a currency.

## Features

| #   | Feature                       | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Create Bank Account           | **Implemented.** Takes a name, currency and starting balance, and validates that the name is unique and the starting balance isn't negative. **Gap found this session.** The form doesn't yet say that currency and starting balance are permanent. It needs inline field descriptions before submit, with no extra confirmation step.                                                                                                                                                                                                  |
| 2   | View Accounts List            | **Implemented and correct.** Sortable by name and last transaction date. Balance and Unallocated are deliberately not sortable, because the rows mix currencies and a numeric sort would rank ₱5,000 against $5,000. Each row also shows Net Change and a Trend over the last 90 days, and a ring beside Unallocated for the share already earmarked (see `docs/specs/bank-account-crud.md`, 2026-10-27).                                                                                                                               |
| 3   | View Account Detail           | **Implemented and correct.** One ledger of the account's Transactions and Allocations, newest first, ending in an Opening balance row. Each row shows the Balance and Unallocated after it, with what it changed beneath. Paged 10 rows at a time, with a Brought forward row carrying the figures from earlier pages. A line above the table gives the currency, Balance, Unallocated and Earmarked. Debt-linked and Withdrawal Transactions say so and link to the Debt or Bucket. See `docs/specs/bank-account-crud.md`, 2026-10-28. |
| 4   | Edit Bank Account             | **Implemented and correct.** Name only. Currency and starting balance are never editable, for the reasons above.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 5   | Delete Bank Account           | **Implemented and correct.** Hard delete that cascades to transactions, allocations and the Withdrawals drawn from the account, behind a typed confirmation of the account name that counts each.                                                                                                                                                                                                                                                                                                                                       |
| n/a | Transfer Between Own Accounts | **Specified, not built.** Same currency only. See `docs/specs/transaction-list-and-transfer.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| n/a | Overdraft / Account Types     | **Rejected for this entity.** The Debt module tracks liabilities and credit.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## Verified during this spec pass

- Allocating across currencies looked like a bug, because a Bucket has no currency and can receive Allocations from Bank Accounts in different currencies. A check of `src/modules/buckets/columns.tsx`, which became `src/modules/buckets/figures.server.ts` on 2026-10-15, showed that subtotals are grouped and shown per source currency. **Not a bug.**
- Every mutation that could break the `Unallocated ≥ 0` rule enforces it: logging, editing and deleting a transaction, and logging and editing an allocation. `deleteAllocation` has no check, and needs none, because deleting an allocation can only increase `Unallocated`.
- **2026-10-20. Register Account starts in PHP again.** Record Debt opens Register Account in the debt's currency, and nothing reset it afterward, so the Accounts page's "Register Account" kept the last debt's currency. Every dialog store now comes from `createDialogStore(defaultPayload)` (`src/stores/dialog-store.ts`). `open(payload?)` always sets the payload and falls back to the dialog's default, here `{ currency: "PHP" }`. `close()` keeps the payload, so a dialog can still render while it animates out. Openers make one call, such as `useEditBankAccountDialogStore.getState().open({ bankAccountId })`, instead of a setter followed by `openDialog()`. **Superseded 2026-10-24.** `createDialogStore` is gone. Register Account is a Drawer whose handle takes `{ currency }`, and the Accounts page passes `{ currency: "PHP" }` (see `docs/specs/bank-account-crud.md`).
