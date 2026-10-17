# Buckit

A personal finance tracker: money sits in Bank Accounts, gets earmarked to Buckets via Allocations, and is tracked in and out via Transactions.

## Language

**User**:
The account holder, authenticated via Better-Auth (email/password today). Owns every other entity — Bank Account, Bucket, Session, Auth Account — through a `userId` foreign key, and all of an entity's data is scoped to exactly one User. The app is built to support multiple independent, isolated Users by design (a free alternative to paid budgeting apps), not a single-operator tool — don't read "single-user" elsewhere in this repo's docs as "only one User account will ever exist." A User may hold several concurrent Sessions (e.g. phone and laptop signed in at once); see `modules/authentication/SPEC.md`.

**Bank Account**:
A money-holding container owned by a user. Has a currency (fixed at creation) and a starting balance, and accrues Transactions (income/expense) and Allocations (money earmarked to Buckets). Its Balance may never go negative — it models liquid assets only (cash, checking, savings), not credit or liabilities. In code, always `BankAccount` / `bankAccounts`. In user-facing UI copy, the shorter "Account" is used instead — intentional, not an inconsistency, since there is currently no user-facing surface for Auth Account (below). Revisit this if that ever changes.
_Avoid_: Wallet, Ledger

**Transaction**:
A record of money moving into (`income`) or out of (`expense`) a Bank Account. Always attaches to a Bank Account — never to a Bucket, and never split across Buckets. Its amount is stored in the owning Bank Account's currency; a Transaction has no currency of its own. Contributes to Balance: income adds, expense subtracts.

**Auth Account**:
A Better-Auth implementation detail (the `accounts` DB table): links a User to a credential or OAuth provider (issuer, tokens, provider id). Has no user-facing UI today. Unrelated to Bank Account — do not conflate the two despite the shared "account" name.
_Avoid_: Account (too ambiguous with Bank Account to use unqualified in code or docs)

**Balance**:
A Bank Account's current holdings: `startingBalance + Σ income transactions − Σ expense transactions`. Computed on read, never stored. Must never go negative.

**Unallocated**:
The portion of a Bank Account's Balance not yet earmarked to any Bucket: `Balance − Σ allocation amounts`. Must never go negative; enforced on every Transaction and Allocation mutation (log, edit, delete).

**Bucket**:
A user-defined savings category that receives money via Allocations from one or more Bank Accounts. Has no currency of its own — displays one Subtotal per source currency. Money only ever enters a Bucket (via Allocation) or leaves it (by editing/deleting an Allocation) — a Bucket is never spent from directly. Transactions always attach to a Bank Account, never to a Bucket; this is a permanent boundary, not a gap. See the planned `Goal` entity below for target/progress tracking.

**Subtotal**:
The sum of a Bucket's Allocations whose source Bank Accounts share one currency. A Bucket has one Subtotal per currency it holds and never a single total, since there is no cross-currency conversion.

**Linked Transaction**:
A Transaction a Debt depends on: a `receivable`'s origination, or a repayment logged through a Bank Account. Its type, and an origination's amount, are fixed by the Debt, and a repayment's can't be dated before its Debt — whether it's edited from the Bank Account or from the Debt. Deleting one removes its repayment; a Debt it funded survives with no source account.

**Allocation**:
Money earmarked from a Bank Account toward a Bucket. Does not leave the Bank Account's Balance, but reduces its Unallocated amount.

**Debt**:
A record of money owed to or by another person, referenced only by a free-text counterparty name — there is no dedicated Counterparty/Contact entity. Has a permanent `direction`: `receivable` (owed _to_ the User) or `payable` (owed _by_ the User). Deliberately separate from Bank Account: a Bank Account's Balance can never go negative, so credit/liability/IOU tracking belongs here instead. Touches Bank Account **asymmetrically by direction**: a `receivable` can optionally be tied to a single source Bank Account at creation, immediately debiting it as a real Transaction — picking one is optional, so a receivable can also be recorded with no Bank Account at all (cash lent, or money that moved outside this app); a `payable` never has a Bank Account at creation, which only enters the picture once repayment begins. Either direction's repayments — many, partial, over time — can likewise optionally be tied to a Bank Account: picking one records the repayment as a real Transaction; leaving it empty keeps the repayment a pure record against the Debt, same reasoning as a `payable`'s creation. Has its own `currency` (unlike Transaction/Allocation, which always inherit one from a Bank Account), since a `payable` has no Bank Account to inherit from at creation. Can be manually forgiven — an all-or-nothing, reversible write-off of whatever remains outstanding, independent of how much was actually repaid. See [`docs/specs/debt-module.md`](docs/specs/debt-module.md) for the full resolved design.
_Avoid_: modeling the counterparty as its own entity (Contact, Person); assuming a `receivable` always has a source Bank Account — it's optional; funding a single Debt from more than one Bank Account at once — considered and rejected as not worth the complexity, see the spec's Further Notes.

**Repayment**:
A payment against a Debt: an amount, date and optional note. Logged through a Bank Account, its Linked Transaction holds those values and moves the money; logged without one, the repayment holds them itself as a pure record. Which form a repayment takes is known only to `src/modules/repayments/storage.server.ts`; everything else sees the resolved values.

**Outstanding**:
What's left of a Debt: its amount minus every Repayment. Computed on read, never stored. Goes negative when overpaid, which isn't an error. Forgiving a Debt doesn't change it; the Debt's status says it was written off.

**Goal** (planned, not yet implemented):
A future entity for target/progress tracking on top of savings (e.g. "$5,000 toward a trip"). Undesigned beyond one open fork: whether it ends up as a column added directly to `buckets` (e.g. a nullable `targetAmount`) or as a wholly separate model/table referencing one or more Buckets. Do not assume either shape until this is actually designed.

**Distribution** (planned, not yet implemented):
A future entity for a saved, reusable, manually-triggered preset: a fixed Bank Account plus a fixed amount (e.g. "Payday — ₱15,000") which, when triggered, logs one `income` Transaction on that account and then splits the amount via Allocations across one or more Buckets (and, once they exist, Goals/Debts). Trigger is always manual — salary can land early or late, so no scheduled/automatic recurrence is part of this. Undesigned beyond this shape: the split plan's structure, and how it interacts with Goal/Debt once those exist, are open.
