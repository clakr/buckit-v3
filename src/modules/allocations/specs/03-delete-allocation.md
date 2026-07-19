# Delete Allocation

## Design Decisions

- Deletion always allowed. Removing an allocation frees its amount back to the source account's unallocated pool, which can never cause negative unallocated. No constraint check needed.

## Trigger

User clicks "Delete" on an allocation from the bucket detail or account detail page.

## Behavior

1. Show confirmation dialog: "Delete allocation of [amount] from [account name] to [bucket name]? The money will return to [account name]'s unallocated pool."
2. On confirm → delete Allocation. Money is implicitly freed — no manual recalculation needed.

## Toast

### Success Message

- **Title:** Allocation deleted
- **Description:** [amount] has returned to [account name].

### Error Message

- **Title:** Failed to delete allocation
- **Description:** Please try again.

## Edge Cases

- Deleting the last allocation in a bucket → bucket still exists (empty). Not auto-deleted.
- Deleting an allocation in a different currency than the bucket's other allocations → the per-currency subtotals on the bucket update accordingly.
