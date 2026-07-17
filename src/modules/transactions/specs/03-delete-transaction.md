# Delete Transaction

**Trigger:** User clicks "Delete" on a transaction from the account detail page.

**Behavior:**

1. Compute what the account balance and unallocated would be if the transaction were removed.
2. If the resulting unallocated would be negative, block with a dialog: "Cannot delete this transaction. Removing it would result in a negative unallocated balance. Adjust allocations first."
3. If unallocated stays non-negative:
   - Show confirmation dialog: "Delete this [income/expense] of [amount] from [date]? This action cannot be undone."
   - On confirm → delete Transaction. Account detail updates. Success toast.

**Design Decisions:**

- The unallocated check prevents the same class of problem as edit: deleting an income transaction removes its contribution to the balance, potentially leaving allocations uncovered.
- Deleting an expense is always safe from an unallocated perspective (removing an expense increases balance) but still requires confirmation.

**Edge cases:**

- Deleting the only income transaction when the account is fully allocated → blocked.
- Deleting an expense when there are no allocations → always allowed.
- Duplicate entry scenario → user deletes one of the duplicates. If this causes negative unallocated, allocations must be reduced first.

**UI States:**

- **Idle** — confirmation dialog visible.
- **Confirming** — "Delete" button shows spinner.
- **Blocked** — blocking dialog with explanation.
- **Server error** — toast: "Failed to delete transaction. Try again."
- **Success** — toast + dialog closes + list updates.
