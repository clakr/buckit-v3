---
status: accepted
---

# Bucket deletion is a hard, cascading delete

Deleting a Bucket permanently deletes all of its Allocations, matching the existing `onDelete: "cascade"` foreign key on `allocations.bucketId`. The only gate is a typed confirmation, where the user re-types the bucket name. The app doesn't block deletion when the bucket has Allocations.

This applies [ADR 0001](./0001-hard-delete-bank-accounts.md)'s decision for Bank Account to Buckets. A Bucket holds no data beyond its Allocations, so deleting one deletes a set of earmarks. The app computes `Unallocated` on read as `Balance − Σ allocation amounts`, so once the cascade removes the Allocations, the money is back in each source Bank Account's unallocated pool. Nothing needs reconciling by hand.

## Considered options

- **Block deletion when non-empty.** The user would have to remove every Allocation first. It protects savings history from accidental loss, but no other part of the app blocks deletion this way.
- **Archive or soft-delete.** This keeps history and avoids the cascade risk, but needs a new status or `archivedAt` column. Rejected for the same reason Bank Account has no `updatedAt` yet. No feature needs it, such as sync, conflict detection or a trash screen.
- **Hard cascade delete with typed confirmation.** Chosen. Bank Account already works this way, and a typed confirmation is how the app guards a destructive action without blocking it.

## Consequences

A user who deletes a Bucket by mistake loses its whole Allocation history and can't get it back. As with Bank Account, no soft-delete, trash or undo exists. The confirmation dialog must say that deleting the Bucket returns its earmarked money to each source Bank Account's unallocated balance, because the word "delete" alone doesn't tell the user that.
