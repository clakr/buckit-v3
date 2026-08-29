---
status: accepted
---

# Bank Account deletion is a hard, cascading delete

Deleting a Bank Account permanently deletes all of its Transactions and Allocations (matches the existing `onDelete: "cascade"` foreign keys), gated only by a typed confirmation (re-typing the account name) — not by blocking deletion when the account has history.

This reverses a previously-implemented policy: an earlier version of this module (removed in `bc77e36`, see `src/modules/accounts/specs/05-delete-account.md` in that commit's parent) blocked deletion entirely unless the account had zero transactions and zero allocations, forcing the user to manually delete all related records first.

## Considered Options

- **Block deletion when non-empty** (the old behavior): safer against accidental data loss, but pushes tedious manual cleanup onto the user before they can remove an account they no longer want.
- **Archive/soft-delete**: preserves history and avoids the cascade risk entirely, but requires a schema change (a status/`archivedAt` column) and its own set of "what does an archived account look like" decisions.
- **Hard cascade delete + typed confirmation** (chosen): simplest to use and to implement; typed confirmation raises the bar enough to prevent a stray click, but a deliberate delete is unrecoverable.

## Consequences

A user who deletes a Bank Account by mistake loses that account's entire transaction and allocation history with no recovery path — there is no soft-delete or trash/undo. If that turns out to be a real problem in practice, revisit toward archiving rather than re-adding a blocking check.
