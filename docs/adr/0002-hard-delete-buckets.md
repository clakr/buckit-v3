---
status: accepted
---

# Bucket deletion is a hard, cascading delete

Deleting a Bucket permanently deletes all of its Allocations (matches the existing `onDelete: "cascade"` foreign key on `allocations.bucketId`), gated only by a typed confirmation (re-typing the bucket name) — not by blocking deletion when the bucket has Allocations.

This mirrors [ADR 0001](./0001-hard-delete-bank-accounts.md)'s decision for Bank Account, applied to a second entity. A Bucket has no data of its own beyond its Allocations — deleting one is really just deleting a set of earmarks. Because `Unallocated` is computed on read (`Balance − Σ allocation amounts`), cascading the Allocations away automatically returns that money to each source Bank Account's unallocated pool; nothing needs to be reconciled manually.

## Considered Options

- **Block deletion when non-empty**: forces the user to remove every Allocation first. Safer against accidental loss of savings history, but introduces a blocking pattern not used anywhere else in the app.
- **Archive/soft-delete**: preserves history, avoids the cascade risk, but requires new schema (a status/`archivedAt` column) — rejected for the same reason `updatedAt` was deferred on Bank Account: no driver (sync, conflict detection, "trash" UI) actually requires it yet.
- **Hard cascade delete + typed confirmation** (chosen): consistent with the precedent already set for Bank Account; the typed-confirmation gate is the app's established answer to "raise the bar without blocking."

## Consequences

A user who deletes a Bucket by mistake loses that Bucket's entire Allocation history with no recovery path — there is no soft-delete or trash/undo, same as Bank Account. The confirmation dialog must disclose that deleting the Bucket returns its earmarked money to each source Bank Account's unallocated balance, since that consequence is not obvious from the word "delete" alone.
