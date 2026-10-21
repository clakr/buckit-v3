# Buckit

A personal finance tracker. Money sits in Bank Accounts, Allocations earmark it to Buckets, and Transactions track it coming in and going out.

## Language

**User**:
The account holder, authenticated via Better-Auth with email and password. Every other entity, including Bank Account, Bucket, Session and Auth Account, belongs to a User through a `userId` foreign key, and each entity's data belongs to exactly one User. The app supports many independent, isolated Users by design, as a free alternative to paid budgeting apps. Where other docs in this repo say "single-user", don't read it as "only one User account will ever exist." A User may hold several Sessions at once, such as a phone and a laptop signed in together. See `modules/authentication/SPEC.md`.

**Bank Account**:
A money-holding container owned by a User. It has a currency, fixed at creation, and a starting balance, and it accrues Transactions (income or expense) and Allocations (money earmarked to Buckets). Its Balance may never go negative, because it models liquid assets only, such as cash, checking and savings, and never credit or liabilities. Code always says `BankAccount` or `bankAccounts`. UI copy says the shorter "Account" on purpose, because no screen shows an Auth Account today. Revisit this if a screen ever shows one.
_Avoid_: Wallet, Ledger

**Transaction**:
A record of money moving into (`income`) or out of (`expense`) a Bank Account. It always belongs to one Bank Account. It never attaches to a Bucket and never splits across Buckets. Its amount is in the owning Bank Account's currency, and a Transaction has no currency of its own. Income adds to Balance and expense subtracts from it.

**Auth Account**:
A Better-Auth implementation detail, stored in the `accounts` table. It links a User to a credential or OAuth provider, with the issuer, tokens and provider id. No UI shows it today. It is unrelated to Bank Account, so don't conflate the two because they share the word "account."
_Avoid_: Account on its own, because code and docs can't tell it apart from Bank Account

**Balance**:
A Bank Account's current holdings: `startingBalance + Σ income transactions − Σ expense transactions`. The app computes it on read and never stores it. It must never go negative.

**Unallocated**:
The part of a Bank Account's Balance not yet earmarked to any Bucket: `Balance − Σ allocation amounts + Σ withdrawal amounts`. It must never go negative. Every Transaction and Allocation log, edit and delete checks it. A Withdrawal leaves it unchanged, because the money leaves the Balance and the earmark at once.

**Bucket**:
A user-defined savings category that receives money through Allocations from one or more Bank Accounts. It has no currency of its own and shows one Subtotal per source currency. Money enters a Bucket only through an Allocation. It leaves when the User spends it through a Withdrawal, or when an Allocation is edited or deleted. Transactions always attach to a Bank Account and never to a Bucket, and this boundary is permanent: a Withdrawal points to its Transaction, never the other way round. The money a Bucket holds from any one Bank Account (its Allocations from that account minus its Withdrawals from it) must never go negative. See the planned Goal entity below for target and progress tracking.

**Subtotal**:
What a Bucket holds in one currency: its Allocations minus its Withdrawals, across the Bank Accounts that share that currency. A Bucket has one Subtotal per currency it holds and never a single total, because the app doesn't convert between currencies.

**Linked Transaction**:
A Transaction a Debt or a Withdrawal depends on. For a Debt, it is either a `receivable`'s origination or a repayment logged through a Bank Account. A Withdrawal's Linked Transaction is always an `expense`, and deleting it deletes the Withdrawal. The Debt fixes its type, and an origination's amount too. A repayment can't be dated before its Debt, whether someone edits it from the Bank Account or from the Debt. Deleting a repayment's Transaction deletes the repayment. Deleting an origination leaves the Debt in place with no source account.

**Allocation**:
Money earmarked from a Bank Account toward a Bucket. It stays in the Bank Account's Balance but reduces its Unallocated amount.

**Withdrawal**:
Money the User spends out of a Bucket, such as giving the tithe set aside over several months. It is one action that draws any amount, up to what the Bucket holds from one Bank Account, and moves that money out of the account as an `expense` Transaction. That Transaction is its Linked Transaction and holds the amount, date and note. A Withdrawal always has one. Deleting either one deletes the other. A Withdrawal can't move to a different Bucket or Bank Account. Moving money from one Bucket to another is not a Withdrawal, and no such feature exists.
_Avoid_: Spend, Payout. Don't confuse it with taking cash out of a bank, which would be a transfer between Bank Accounts.

**Debt**:
A record of money owed to or by another person. The counterparty is only a free-text name, and no Counterparty or Contact entity exists. A Debt has a permanent `direction`, either `receivable` (owed _to_ the User) or `payable` (owed _by_ the User). It is separate from Bank Account on purpose. A Bank Account's Balance can never go negative, so credit, liability and IOU tracking live here instead.

How a Debt touches a Bank Account depends on its direction. A `receivable` may name one source Bank Account at creation, and the app debits that account right away with a real Transaction. The source is optional, so a receivable can also exist with no Bank Account, for cash lent or money that moved outside the app. A `payable` never has a Bank Account at creation. One only appears once repayment begins.

A Debt in either direction can have many partial repayments over time, and each one may name a Bank Account. With an account, the repayment becomes a real Transaction. Without one, the repayment is only a record against the Debt, for the same reason a `payable` starts without an account. A Debt has its own `currency`, unlike Transaction and Allocation, which take theirs from a Bank Account, because a `payable` has no Bank Account to take it from at creation. The User can forgive a Debt. Forgiving writes off everything still outstanding, all at once and reversibly, regardless of how much was repaid. See [`docs/specs/debt-module.md`](docs/specs/debt-module.md) for the full design.
_Avoid_: modeling the counterparty as its own entity, such as Contact or Person. Don't assume a `receivable` always has a source Bank Account, because it's optional. Don't fund one Debt from more than one Bank Account. That idea was rejected as not worth the complexity, and the spec's Further notes explain why.

**Repayment**:
A payment against a Debt, with an amount, a date and an optional note. When it's logged through a Bank Account, its Linked Transaction holds those values and moves the money. When it's logged without one, the repayment holds the values itself as a record. Only `src/modules/repayments/storage.server.ts` knows which form a repayment takes. All other code sees the resolved values.

**Outstanding**:
What's left of a Debt, which is its amount minus every Repayment. The app computes it on read and never stores it. It goes negative when the Debt is overpaid, and that isn't an error. Forgiving a Debt doesn't change it. The Debt's status records the write-off instead.

**Goal** (planned, not yet implemented):
A future entity for tracking progress toward a savings target, such as "$5,000 toward a trip." One question is still open: it could be a column on `buckets`, such as a nullable `targetAmount`, or a separate table that references one or more Buckets. Don't assume either shape until someone designs it.

**Distribution** (planned, not yet implemented):
A future saved preset that the User triggers by hand. It pairs a fixed Bank Account with a fixed amount, such as "Payday, ₱15,000." Triggering it logs one `income` Transaction on that account, then splits the amount through Allocations across one or more Buckets, and later across Goals and Debts too. The trigger is always manual, because salary can land early or late, so it has no schedule or automatic recurrence. The rest is undesigned, including the structure of the split plan and how it works with Goal and Debt once those exist.
