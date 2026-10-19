# Module Spec: Bank Accounts

> Note on naming: the module folder and internal identifiers were renamed to `bank-accounts`/`BankAccount*` in this pass, matching the module's actual export names (`getBankAccount`, `bankAccounts` table, etc.). Route paths (`/accounts`, `/accounts/$accountId`) were deliberately left unchanged — see [`CONTEXT.md`](../../../CONTEXT.md) for why "Account" is the intentional user-facing term while code says `BankAccount`.

## Overview

A Bank Account represents a real-world, liquid money container (cash, checking, savings) owned by a user. It has a single, fixed currency, and its balance is computed from transactions — never manually set after creation. It models assets only; it can never go negative. Debts, credit, and liabilities are explicitly out of scope for this entity and belong to a separate (planned, unbuilt) Debt module.

## Entity

### BankAccount

| Field             | Type     | Notes                                                                  |
| ----------------- | -------- | ---------------------------------------------------------------------- |
| `id`              | string   | auto-generated (uuidv7)                                                |
| `userId`          | string   | FK → Users (ownership boundary)                                        |
| `name`            | string   | user-given label, unique per user (case-insensitive), editable         |
| `currency`        | string   | e.g. PHP, QAR — **immutable after creation**                           |
| `startingBalance` | integer  | minor units (cents) via the Money module (`src/lib/money.ts`) — **immutable after creation** |
| `createdAt`       | datetime |                                                                        |

No `updatedAt` column — considered and deliberately deferred (see Design Decisions).

## Design Decisions

### Never Negative

A Bank Account's `Balance` must never go negative. This is enforced today for every mutation that could reduce it (`logTransaction`, `editTransaction`, `deleteTransaction`, the Allocation writes, and the Debt and Repayment writes, each checking in-process before it writes) by checking `Unallocated ≥ 0`, since `Unallocated ≤ Balance` always holds. The rule is uniform across every Bank Account — there is no account type or flag that permits overdraft. Anything that needs to represent a negative or liability position (an IOU, a credit card balance) belongs in the future Debt module instead, not as a Bank Account.

### Ownership Cascade

`userId` lives only on BankAccount. Transactions and Allocations derive the user through `bankAccountId → BankAccount.userId`. That rule is applied in one place, `src/modules/bank-accounts/ownership.server.ts`: `findOwnedBankAccount` (used by `verifyUserBankAccountMiddleware` and by the Debt and Repayment source-account checks, since `recordDebt` and `logRepayment` have no bank-account middleware of their own) and `isOwnedThroughBankAccount` (used by the Transaction and Allocation middlewares). A missing record and someone else's record both throw `NotFoundError`, so an ID can't be probed for existence and a not-found isn't retried.

### Starting Balance Stored on Account

`startingBalance` is a plain field on BankAccount, not an initial income Transaction. This avoids a chicken-and-egg problem where an opening balance would need a Bucket to allocate into before any Bucket exists.

### Immutable Currency

Once created, `currency` cannot be changed. Existing Transactions and Allocations are recorded in that currency; changing it would silently reinterpret historical amounts.

### Immutable Starting Balance

Once created, `startingBalance` cannot be changed either — accepted as a permanent limitation. It represents a frozen point-in-time snapshot. If it's wrong, the only corrections are (a) get it right at creation, or (b) delete the account (destroying its history) and recreate it. Because both immutable fields can't be fixed later, the creation form must clearly disclose this via inline field descriptions before submission — see Create Account behavior below.

### Balance Formula

`Balance = startingBalance + Σ(income transaction amounts) − Σ(expense transaction amounts)`

Computed on every read, never stored.

### Unallocated Formula

`Unallocated = Balance − Σ(allocation amounts from this account)`

### Name Uniqueness

Name must be unique per user, case-insensitive (SQLite's `lower()` on both sides, the same folding the index uses; it folds ASCII letters only, so "Ñ" and "ñ" count as different names), trimmed. Enforced on create and edit; the edit check excludes the account's own current name, so changing only its case is allowed. One rule, `bankAccountName` in `functions.ts` (built with `createUniqueNameRule` from `src/lib/unique-name.server.ts`, shared by Bank Account and Bucket), serves the dialogs (through the `validateBankAccountName` server function) and the writes, which call it in-process. The database enforces the same rule with a unique index on `(user_id, lower(name))` (migration `20261015044209_bank_account_name_case_insensitive`), so two simultaneous requests can't both create "Savings" and "savings"; a write the index rejects throws the same `ConflictError` as a failed check. The older case-sensitive `unique(userId, name)` constraint stays: dropping a table-level constraint needs a table rebuild, and on D1 dropping `bank_accounts` would cascade-delete every Transaction and Allocation.

### Deletion Is Destructive, Not Blocked

**This reverses a previously-implemented policy** (see `git show bc77e36^:src/modules/accounts/specs/05-delete-account.md` for the old behavior, which blocked deletion of any account with transactions or allocations). The current decision: deleting a Bank Account is a hard delete that cascades to all of its Transactions and Allocations (matches the existing `onDelete: "cascade"` FK), gated by a typed confirmation (user must re-type the account name) rather than a blocking check. Chosen for simplicity and lower day-to-day friction, at the cost of making a mistaken delete unrecoverable. See [`docs/adr/0001-hard-delete-bank-accounts.md`](../../../docs/adr/0001-hard-delete-bank-accounts.md).

### `updatedAt` Deferred

Every other table in the schema (`users`, `sessions`, `accounts`, `verifications`) has an `updatedAt` column; `bankAccounts` doesn't. Considered and explicitly deferred: the only editable field is `name`, there's no sync/API client, and — while a User may hold multiple concurrent Sessions across devices (see `authentication/SPEC.md`) — there's no concurrency-conflict scenario to detect on a single Bank Account's own data. Add it if one of those drivers (sync cursor, conflict detection, "last edited" UI) actually materializes — not speculatively.

### Transfers Between Accounts — Out of Scope, Constraint Captured for Later

Not building this now. When it is built: **a transfer must only be allowed between two Bank Accounts of the same currency** — no exchange-rate conversion is in scope for this ledger. (Prior art: the old, deleted spec modeled a transfer as two linked Transactions — an expense on the source account and an income on the destination account, connected via a shared note. Worth reconsidering as a starting point rather than adding new schema, since it fits the existing Transaction model as-is — but this needs its own design pass.)

### Money (`src/lib/money.ts`)

Since 2026-10-20, every amount goes through one module, shared by all modules on client and server. Amounts are stored as integer cents next to their currency.

- `amountSchema` (more than 0) and `nonNegativeAmountSchema(message)` (Starting Balance, which may be 0) take what the user typed, enforce at most 2 decimal places ("Use at most 2 decimal places." as a field error), and parse to cents. Server functions receive cents; nothing else decodes.
- `formatMoney(cents, currency)` shows an amount, and the currency is required. `centsToAmountInput(cents)` gives an edit form its starting value.
- `exceedsAvailable(amountInput, availableCents)` is the dialogs' as-you-type "more than Unallocated" check. `describeInsufficientUnallocated({ bankAccount, available, purpose })` is its message, shared with the writes; `purpose` ("loan", "repayment") keeps each dialog's wording.

**Known limit:** every currency is treated as having 2 decimal places. That's wrong for currencies like JPY (0) or KWD (3), which the currency picker still offers. Changing it means per-currency minor units, and migrating any amounts already stored in such a currency.

## Features

| #   | Feature                       | Status                                                                                                                                                                                                                                                                                                                                                  |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Create Bank Account           | **Implemented.** Name + currency + starting balance, validated (name uniqueness, non-negative starting balance). **Gap identified this session:** form does not yet disclose that currency/starting balance are permanent — needs inline field descriptions before submit (deliberately kept passive/low-friction, no extra confirmation step or gate). |
| 2   | View Accounts List            | **Implemented and correct.** Sortable by name/balance/unallocated/last transaction date.                                                                                                                                                                                                                                                                |
| 3   | View Account Detail           | **Implemented and correct.** Shows transactions, allocations, unallocated/total allocated/computed balance.                                                                                                                                                                                                                                             |
| 4   | Edit Bank Account             | **Implemented and correct.** Name only. Currency and starting balance are never editable, for the reasons above.                                                                                                                                                                                                                                        |
| 5   | Delete Bank Account           | **Implemented and correct.** Hard delete, cascades transactions/allocations, gated by typed confirmation (re-type account name).                                                                                                                                                                                                                        |
| —   | Transfer Between Own Accounts | **Out of scope for now**, explicitly deferred. Constraint captured: same-currency only.                                                                                                                                                                                                                                                                 |
| —   | Overdraft / Account Types     | **Rejected as a concept for this entity.** Liability/credit tracking is deferred to a separate, unbuilt Debt module.                                                                                                                                                                                                                                    |

## Verified During This Spec Pass

- Cross-currency allocation was suspected as a bug (a Bucket has no currency of its own and can receive Allocations from Bank Accounts in different currencies) — checked `src/modules/buckets/columns.tsx` (since 2026-10-15, `src/modules/buckets/figures.server.ts`): subtotals are correctly grouped and displayed per source currency. **Not a bug.**
- The `Unallocated ≥ 0` invariant is consistently enforced across every mutation that could violate it (log/edit/delete transaction, log/edit allocation). `deleteAllocation` has no guard because deleting an allocation only ever increases `Unallocated` — correctly needs none.
- **2026-10-20 — Register Account starts in PHP again.** Record Debt opens Register Account in the currency it's using, and nothing reset it, so the Accounts page's "Register Account" kept the last debt's currency. Every dialog store now comes from `createDialogStore(defaultPayload)` (`src/stores/dialog-store.ts`): `open(payload?)` always sets the payload, falling back to the dialog's default (`{ currency: "PHP" }` here), and `close()` keeps it so a dialog can still render while it animates out. Openers make one call, e.g. `useEditBankAccountDialogStore.getState().open({ bankAccountId })`, instead of a setter followed by `openDialog()`.
