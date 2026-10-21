---
status: accepted
---

# Bank Account deletion is a hard, cascading delete

Deleting a Bank Account permanently deletes all of its Transactions and Allocations, matching the existing `onDelete: "cascade"` foreign keys. The only gate is a typed confirmation, where the user re-types the account name. The app doesn't block deletion when the account has history.

This reverses an earlier policy. A previous version of this module blocked deletion unless the account had no transactions and no allocations, so the user had to delete every related record by hand first. Commit `bc77e36` removed that version, and `src/modules/accounts/specs/05-delete-account.md` in that commit's parent describes it.

## Considered options

- **Block deletion when non-empty.** This was the old behavior. It protects against accidental data loss, but the user must clean up by hand before removing an account they no longer want.
- **Archive or soft-delete.** This keeps history and avoids the cascade risk. It needs a schema change, such as a status or `archivedAt` column, plus decisions about how an archived account looks and behaves.
- **Hard cascade delete with typed confirmation.** Chosen. It is the simplest to use and to build. The typed confirmation stops a stray click, but a deliberate delete can't be recovered.

## Consequences

A user who deletes a Bank Account by mistake loses its whole transaction and allocation history, and can't get it back. No soft-delete, trash or undo exists. If that becomes a real problem, move toward archiving instead of bringing back the blocking check.
