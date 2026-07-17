# Delete Allocation

**Trigger:** User clicks "Delete" on an allocation from the bucket detail or account detail page.

**Behavior:**

1. Show confirmation dialog: "Delete allocation of [amount] from [account name] to [bucket name]? The money will return to [account name]'s unallocated pool."
2. On confirm → delete Allocation. Money is implicitly freed — no manual recalculation needed. Success toast.

**Design Decisions:**

- Deletion always allowed. Removing an allocation frees its amount back to the source account's unallocated pool, which can never cause negative unallocated. No constraint check needed.

**Edge cases:**

- Deleting the last allocation in a bucket → bucket still exists (empty). Not auto-deleted.
- Deleting an allocation in a different currency than the bucket's other allocations → the per-currency subtotals on the bucket update accordingly.

**UI States:**

- **Idle** — confirmation dialog visible.
- **Confirming** — "Delete" button shows spinner.
- **Server error** — toast: "Failed to delete allocation. Try again."
- **Success** — toast + dialog closes + views update.
