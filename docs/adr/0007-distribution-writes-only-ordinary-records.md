---
status: accepted
---

# A Distribution writes only ordinary records, and carves a receivable's Repayment out of the income

Triggering a Distribution writes plain Transactions, Allocations and Repayments, and nothing else. The app keeps no record of the trigger, so the only trace is the Distribution's name in each record's note. When a line repays a `receivable` Debt, the Distribution subtracts that amount from the income it logs and writes the Repayment as its own `income` Transaction, so the Bank Account gains the full amount exactly once.

## Considered options

- **Remember each trigger as a run record.** Rejected. A run table would let the app show a history and offer "undo this run". But every record it wrote stays editable and deletable on its normal screen, so an undo would have to cope with a run whose records the User has since edited, moved or deleted. A history nobody asked for would also need a new table, a new screen and a cascade rule for every deletion that touches it.
- **Log the whole amount as income, and record a `receivable` line as a Repayment with no Transaction.** Rejected. It leaves the Repayment with no Bank Account, which is the form a Repayment takes only when the money moved outside the app. Here the money did move through the account.
- **Log the whole amount as income, and also give the `receivable` Repayment its own `income` Transaction.** Rejected. The account would gain the Repayment twice.
- **Subtract the Repayment from the income, and write it as its own `income` Transaction.** Chosen. Every Repayment keeps the normal, Transaction-backed form, and the Balance and Unallocated figures come out right with no special case in Debt or Repayment.

## Consequences

- One payday with a `receivable` line makes two `income` Transactions, such as ₱12,500 for the salary and ₱2,500 for the Repayment. Both carry the Distribution's name as their note, and the User can edit either one like any other record.
- A `payable` line is not carved out. Its Repayment is an `expense`, so the income stays whole and the `expense` is added next to it.
- Because nothing links the records, editing or deleting one never touches the others. Deleting the Distribution deletes no records.
- Adding run records later is possible but means a new table and a backfill that can't recover past triggers, so the trade-off is not free to reverse.
