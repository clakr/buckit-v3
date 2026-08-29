# Buckit

A personal finance tracker: money sits in Bank Accounts, gets earmarked to Buckets via Allocations, and is tracked in and out via Transactions.

## Language

**Bank Account**:
A money-holding container owned by a user. Has a currency (fixed at creation) and a starting balance, and accrues Transactions (income/expense) and Allocations (money earmarked to Buckets). Its Balance may never go negative — it models liquid assets only (cash, checking, savings), not credit or liabilities. In code, always `BankAccount` / `bankAccounts`. In user-facing UI copy, the shorter "Account" is used instead — intentional, not an inconsistency, since there is currently no user-facing surface for Auth Account (below). Revisit this if that ever changes.
_Avoid_: Wallet, Ledger

**Auth Account**:
A Better-Auth implementation detail (the `accounts` DB table): links a User to a credential or OAuth provider (issuer, tokens, provider id). Has no user-facing UI today. Unrelated to Bank Account — do not conflate the two despite the shared "account" name.
_Avoid_: Account (too ambiguous with Bank Account to use unqualified in code or docs)

**Balance**:
A Bank Account's current holdings: `startingBalance + Σ income transactions − Σ expense transactions`. Computed on read, never stored. Must never go negative.

**Unallocated**:
The portion of a Bank Account's Balance not yet earmarked to any Bucket: `Balance − Σ allocation amounts`. Must never go negative; enforced on every Transaction and Allocation mutation (log, edit, delete).

**Bucket**:
A user-defined savings category that receives money via Allocations from one or more Bank Accounts. Has no currency of its own — displays subtotals grouped per source currency. Money only ever enters a Bucket (via Allocation) or leaves it (by editing/deleting an Allocation) — a Bucket is never spent from directly. Transactions always attach to a Bank Account, never to a Bucket; this is a permanent boundary, not a gap. See the planned `Goal` entity below for target/progress tracking.

**Allocation**:
Money earmarked from a Bank Account toward a Bucket. Does not leave the Bank Account's Balance, but reduces its Unallocated amount.

**Debt** (planned, not yet implemented):
A future entity for tracking money owed to or by other people. Deliberately separate from Bank Account: a Bank Account's Balance can never go negative, so credit/liability/IOU tracking belongs in Debt instead.

**Goal** (planned, not yet implemented):
A future entity for target/progress tracking on top of savings (e.g. "$5,000 toward a trip"). Undesigned beyond one open fork: whether it ends up as a column added directly to `buckets` (e.g. a nullable `targetAmount`) or as a wholly separate model/table referencing one or more Buckets. Do not assume either shape until this is actually designed.
