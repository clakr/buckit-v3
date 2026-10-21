---
status: accepted
---

# A Withdrawal spends from a Bucket through a linked Transaction

The User can spend money out of a Bucket in one action, called a Withdrawal. It writes an `expense` Transaction on one Bank Account and a `withdrawals` row that points to that Transaction and to the Bucket. Before this, the glossary and `buckets/SPEC.md` both called "nobody spends from a Bucket directly" a permanent boundary. This decision relaxes that boundary on purpose, and only partly. Transactions still never attach to a Bucket. `transactions` gains no `bucketId`, and the Withdrawal is the side that holds the link.

## Why

The motivating case is a User who sets aside a tithe in a Bucket every payday, then gives the whole amount at once. Before Withdrawals, the only way was to delete or shrink each Allocation and then log an `expense`. The order mattered. Logging the expense first fails, because the account's Unallocated would go negative. Deleting the Allocations also erased the record that the money was ever set aside. Neither problem is specific to tithing. Any Bucket that gets saved up and then spent hits them.

## Considered options

- **Keep the boundary and only remove the earmark.** A "release" action returns money to Unallocated, and the User logs the expense separately. Rejected. It's still two steps for one real event, and it doesn't keep a record of the spending against the Bucket.
- **A linked record that points to an `expense` Transaction.** Chosen. It is one action for the User and one write for the code. It reuses the Linked Transaction pattern Repayment already has, so the amount, date and note live only on the Transaction. The rule that "Transactions belong only to Bank Accounts" survives.
- **`transactions.bucketId`.** Rejected. It removes the boundary entirely. Every Transaction query and rule would then have to consider Buckets, for a link only one kind of expense needs.

## Consequences

- A new rule says that what a Bucket holds from one Bank Account, its Allocations from that account minus its Withdrawals from it, can never go negative. It blocks some Allocation edits and deletes that used to always succeed. For example, you can't delete an Allocation whose money has already been withdrawn.
- Unallocated becomes `Balance − Σ allocations + Σ withdrawals`. A Withdrawal lowers the Balance and the earmark by the same amount, so it never changes Unallocated.
- Deleting a Bucket deletes its Withdrawals but keeps their `expense` Transactions as plain expenses. The money really left, so deleting a Bucket must not rewrite Bank Account history. This narrows [ADR 0002](./0002-hard-delete-buckets.md). The cascade still removes everything the Bucket owns, but a Withdrawal's Transaction belongs to the Bank Account.
- Moving money between Buckets is still not a feature. A Withdrawal always means money leaving a Bank Account.
