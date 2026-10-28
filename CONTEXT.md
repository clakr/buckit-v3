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
A user-defined savings category that receives money through Allocations from one or more Bank Accounts. It has no currency of its own and shows one Subtotal per source currency. Money enters a Bucket only through an Allocation. It leaves when the User spends it through a Withdrawal, or when an Allocation is edited or deleted. Transactions always attach to a Bank Account and never to a Bucket, and this boundary is permanent. A Withdrawal points to its Transaction, never the other way round. The money a Bucket holds from any one Bank Account (its Allocations from that account minus its Withdrawals from it) must never go negative. See the planned Goal entity below for target and progress tracking.

**Subtotal**:
What a Bucket holds in one currency: its Allocations minus its Withdrawals, across the Bank Accounts that share that currency. A Bucket has one Subtotal per currency it holds and never a single total, because the app doesn't convert between currencies.

**Linked Transaction**:
A Transaction a Debt or a Withdrawal depends on. For a Debt, it is either a `receivable`'s origination or a repayment logged through a Bank Account. A Withdrawal's Linked Transaction is always an `expense`, and deleting it deletes the Withdrawal. The Debt fixes its type, and an origination's amount too. A repayment can't be dated before its Debt, whether someone edits it from the Bank Account or from the Debt. Deleting a repayment's Transaction deletes the repayment. Deleting an origination leaves the Debt in place with no source account.

**Allocation**:
Money earmarked from a Bank Account toward a Bucket. It stays in the Bank Account's Balance but reduces its Unallocated amount.

**Withdrawal**:
Money the User spends out of a Bucket, such as giving the tithe set aside over several months. It is one action that draws any amount, up to what the Bucket holds from one Bank Account, and moves that money out of the account as an `expense` Transaction. That Transaction is its Linked Transaction and holds the amount, date and note. A Withdrawal always has one. Deleting the Transaction deletes the Withdrawal, and so does deleting the Withdrawal's Bank Account. Deleting the Withdrawal deletes its Transaction, except when its Bucket is deleted. The Transaction then stays as a plain `expense`, because that money left the account. A Withdrawal can't move to a different Bucket or Bank Account. Moving money from one Bucket to another is not a Withdrawal, and no such feature exists.
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

**Goal**:
A savings target set on a Bucket, such as "₱150,000 for the Japan trip by March 2027." It has a target amount, one currency fixed at creation, and an optional target date. A Bucket has at most one Goal, and many Buckets have none, such as an ongoing tithe Bucket. A Goal never holds money itself. Money reaches it only through Allocations to its Bucket, and only the Bucket's Subtotal in the Goal's currency counts as progress. Money the Bucket holds in other currencies stays there but doesn't count. Its currency is one of the currencies the User's Bank Accounts use. The User can add a Goal to a Bucket, edit its target amount and date, or remove it without touching the Bucket's money. Deleting the Bucket deletes its Goal. A Goal's status is always calculated and never stored: **Reached** while Progress is at or above 100%, **Overdue** when its target date has passed and it isn't Reached, and **In progress** otherwise. Spending a Reached Goal's money makes it In progress again, and the User removes the Goal when they're done with it. A Goal appears only on Bucket screens, on its Bucket's page and as a Progress bar in the Bucket list, and has no screen of its own. See [`docs/specs/goal-module.md`](docs/specs/goal-module.md) and [ADR 0006](docs/adr/0006-goal-is-a-target-on-a-bucket.md).

**Progress**:
How far a Goal has come: its Bucket's Subtotal in the Goal's currency, measured against the target amount. It counts what the Bucket holds right now, so Withdrawals and edited or deleted Allocations reduce it. It can pass 100%, because a Goal measures saving and never limits Allocations.
_Avoid_: allocating to a Goal directly, or one Goal spanning several Buckets. Both were rejected because they would duplicate everything a Bucket already enforces.

**Distribution** (planned, not yet implemented):
A future saved preset that the User triggers by hand to split one amount, such as "Payday, ₱15,000," across the Buckets and Debts of one Bank Account. It names that Bank Account, and only one per Distribution, and a default amount. The Bank Account is fixed once the Distribution is saved. To use another account, the User duplicates it and picks the account for the copy. A Distribution needs at least one line. The User can overwrite the amount each time they trigger it, such as ₱13,500 after a short pay period. Its plan is a list of lines. Each line points at a Bucket or a Debt and holds either a fixed amount or a percentage of the amount triggered. A percentage is of the whole amount, not of what is left after other lines, and rounds to the centavo. A Distribution has at most one line per Bucket or Debt, and its Debt lines are limited to Debts in its Bank Account's currency. A Bucket line becomes an Allocation. A Distribution can't be saved or triggered when its Bucket and `payable` lines add up to more than the amount, or when its `receivable` lines do. Whatever the lines don't take stays Unallocated in the Bank Account. Funding a Goal means funding its Bucket. A line toward a `receivable` Debt is carved out of the income. The Distribution logs the amount minus those lines as one `income` Transaction, and logs each such line as a Repayment with its own `income` Transaction, so the Bank Account gains the full amount exactly once. A line toward a `payable` Debt logs its Repayment with an `expense` Transaction, and the income stays whole. When the User triggers a Distribution, the amount is the only thing they can change, and changing any line means editing the Distribution itself. A line never caps itself at what the Debt has outstanding. If it would overpay a Debt, or its Debt is Settled or Forgiven, the trigger warns the User first. The app doesn't remember a trigger as a record of its own. Each record it writes is an ordinary Transaction, Allocation or Repayment, and the Distribution's name in the note is the only trace. A trigger writes everything or nothing. Deleting a Bucket or Debt removes its line from every Distribution, and deletes any Distribution it leaves with no lines. Deleting the Bank Account deletes the Distribution. A Distribution's name is unique per User, ignoring case. The trigger is always manual, because salary can land early or late, so it has no schedule or automatic recurrence. See [`docs/specs/distribution.md`](docs/specs/distribution.md) and [ADR 0007](docs/adr/0007-distribution-writes-only-ordinary-records.md).
