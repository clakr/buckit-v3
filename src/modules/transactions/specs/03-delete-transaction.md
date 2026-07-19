# Delete Transaction

## Design Decisions

- The unallocated check prevents deleting an income transaction whose balance contribution is covering existing allocations. Without this, allocations could exceed available funds.
- Deleting an expense is always safe from an unallocated perspective (removing an expense increases balance) but still requires confirmation.

## Trigger

User clicks "Delete" on a transaction from the account detail page.

## Behavior

1. Compute what the account balance and unallocated would be if the transaction were removed.
2. If the resulting unallocated would be negative, block with a dialog: "Cannot delete this transaction. Removing it would result in a negative unallocated balance. Adjust allocations first."
3. If unallocated stays non-negative:
   - Show confirmation dialog: "Delete this [income/expense] of [amount] from [date]? This action cannot be undone."
   - On confirm → delete Transaction. Account detail updates.

## Toast

### Success Message

- **Title:** Transaction deleted
- **Description:** The [type] has been removed.

### Error Message

- **Title:** Failed to delete transaction
- **Description:** Please try again.

## Edge Cases

- Deleting the only income transaction when the account is fully allocated → blocked.
- Deleting an expense when there are no allocations → always allowed.
- Duplicate entry scenario → user deletes one of the duplicates. If this causes negative unallocated, allocations must be reduced first.
