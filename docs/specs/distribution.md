---
status: ready-for-agent
module: distributions
---

# Spec: Distribution module

## Problem statement

Every payday follows the same routine. The User logs the salary as income on a Bank Account, earmarks a tithe to a Bucket through an Allocation, and records what they put toward a Debt. Each of those is a separate form, repeated every cutoff, with amounts worked out by hand. The app has no way to save that routine. Until now, `Distribution` was only a placeholder in `CONTEXT.md`, with its shape left open.

## Solution

A Distribution is a saved preset that the User triggers by hand. It names one Bank Account, a default amount, and a list of lines. Each line points at one Bucket or one Debt and holds a fixed amount or a percentage of the amount triggered. Triggering it, with the amount optionally overwritten, writes the income, the Allocations and the Repayments in one go.

A grilling and domain-modeling session on 2026-10-28 produced this spec. No Distribution code exists yet. [ADR 0007](../adr/0007-distribution-writes-only-ordinary-records.md) records why a Distribution writes only ordinary records and carves a `receivable` Repayment out of the income.

## Worked examples

These are the agreed figures. They double as the first test cases once the repo has a test setup.

| #   | Setup                                                                                                                           | Records written                                                                                                      | Effect on the Bank Account                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | "Payday", ₱15,000. Tithes 10%. Parents (`receivable`, ₱25,000 outstanding) ₱2,500 fixed.                                        | `income` ₱12,500; Repayment with `income` ₱2,500; Allocation ₱1,500 to Tithes. Parents' Outstanding goes to ₱22,500. | Balance +₱15,000. Unallocated +₱13,500.                                                   |
| 2   | Same preset, triggered with ₱13,500.                                                                                            | `income` ₱11,000; Repayment with `income` ₱2,500; Allocation ₱1,350. Percentages scale, the fixed line doesn't.      | Balance +₱13,500. Unallocated +₱12,150.                                                   |
| 3   | ₱15,000. Tithes 10%. Sister (`payable`, ₱5,000 outstanding) ₱2,000 fixed.                                                      | `income` ₱15,000; Repayment with `expense` ₱2,000; Allocation ₱1,500. Sister's Outstanding goes to ₱3,000.           | Balance +₱13,000. Unallocated +₱11,500.                                                   |
| 4   | Example 1, but Parents only has ₱1,000 outstanding.                                                                             | Same records as example 1. The trigger warns "overpays by ₱1,500" first. Outstanding ends at −₱1,500.                | Same as example 1.                                                                        |
| 5   | Amount ₱2,000. Tithes 10% (₱200). Sister `payable` ₱2,500 fixed.                                                                | Nothing. Confirm is blocked, because Bucket and `payable` lines total ₱2,700, more than ₱2,000.                      | None.                                                                                     |
| 6   | Amount ₱2,000. Parents `receivable` ₱2,500 fixed.                                                                               | Nothing. Confirm is blocked, because `receivable` lines total ₱2,500, more than the amount.                          | None.                                                                                     |
| 7   | Amount ₱2,500. Parents `receivable` ₱2,500 fixed.                                                                               | Repayment with `income` ₱2,500 only. The salary `income` would be ₱0, so it is skipped.                             | Balance +₱2,500. Unallocated +₱2,500.                                                     |
| 8   | Amount ₱13,333.33. One line, 12.5%.                                                                                             | `income` ₱13,333.33; Allocation ₱1,666.67 (₱1,666.66625, rounded to the nearest centavo).                            | Balance +₱13,333.33. Unallocated +₱11,666.66.                                             |

## User stories

### Already implemented: what a Distribution is built from

These are recapped so test cases can be written against the whole flow later. They are covered in full by `src/modules/transactions/SPEC.md`, `src/modules/allocations/SPEC.md`, `docs/specs/debt-module.md` and `docs/specs/bucket-crud.md`.

1. As a user, I want to log `income` on a Bank Account, and I want its Balance to rise by that amount and never to go negative.
2. As a user, I want to allocate money from a Bank Account to a Bucket, blocked if it would push that account's Unallocated below zero.
3. As a user, I want to log a Repayment against a Debt of either direction, optionally through a Bank Account in the Debt's currency. A `receivable` Repayment through an account is `income`, and a `payable` one is an `expense`.
4. As a user, I want logging a Repayment against a Forgiven Debt to reopen it, and I want to be warned first.
5. As a user, I want overpaying a Debt to be allowed, so its Outstanding can go negative.
6. As a user, I want a Debt's currency to be fixed, and a Bank Account's currency to be fixed, with no conversion anywhere.
7. As a user, I want Bucket names unique per user, ignoring case, and the same for Bank Accounts.
8. As a user, I want every view and action limited to my own records (ADR 0003).

### Creating a Distribution

9. As a user, I want to create a Distribution with a name, one Bank Account and a default amount, such as "Payday", Main Account, ₱15,000.
10. As a user, I want a Distribution's name unique per user, ignoring case, so the note it writes is never ambiguous.
11. As a user, I want to add lines to a Distribution, each pointing at one of my Buckets or one of my Debts.
12. As a user, I want each line to be either a fixed amount or a percentage of the amount triggered, so I can say "Tithes 10%" and "Parents ₱2,500".
13. As a user, I want a Distribution to have at most one line per Bucket and at most one per Debt.
14. As a user, I want the Debt picker to list only Debts in the chosen Bank Account's currency, and I want choosing a Bank Account in a different currency, in a form that hasn't been saved yet, to warn me first that it resets the lines. If I confirm, the lines are cleared. If I cancel, the account stays as it was. Fixed amounts are typed in the old currency and a Debt line must match the account's currency, so the lines can't carry over.
15. As a user, I want a Distribution to need at least one line, so one with nothing to split can't be saved. Logging only income is what logging a Transaction is for.
16. As a user, I want to be stopped from saving a Distribution whose Bucket and `payable` lines add up to more than its default amount, and the same for its `receivable` lines, because triggering it could never succeed.
17. As a user, I want to create a Bucket or a Debt from inside the line editor, without leaving the Distribution drawer, and I want it picked for that line when I'm done. If I have no Bank Account yet, I want to register one the same way.

### Triggering a Distribution

18. As a user, I want to trigger a Distribution by hand, seeing its default amount, and I want to overwrite the amount, such as ₱13,500 after a short pay period. The amount is the only thing I can change at trigger time. To change a line, I edit the Distribution.
19. As a user, I want a live preview of every record the trigger will write, with each line's computed value, before I confirm.
20. As a user, I want a percentage line to be that percentage of the whole amount, rounded to the nearest centavo, and a fixed line to stay as written when I overwrite the amount.
21. As a user, I want a line that rounds to ₱0.00 to be left out.
22. As a user, I want the trigger to log the amount minus all `receivable` lines as one `income` Transaction, and to skip it when that is ₱0.
23. As a user, I want a `receivable` line to be written as a Repayment with its own `income` Transaction on the same account, so the account gains the full amount exactly once.
24. As a user, I want a `payable` line to be written as a Repayment with an `expense` Transaction, and the income to stay whole.
25. As a user, I want a Bucket line to be written as an Allocation from the Distribution's Bank Account.
26. As a user, I want every record dated today and noted with the Distribution's name, so I can find them later. I can edit any of them afterward like any other record.
27. As a user, I want the trigger to be all or nothing, so a failure halfway never leaves a half-distributed payday.
28. As a user, I want Confirm blocked while the Bucket and `payable` lines add up to more than the amount, or while the `receivable` lines do, with the reason shown on the same screen.
29. As a user, I want a warning, not a block, when a Debt line would overpay its Debt, when its Debt is Settled, or when its Debt is Forgiven and the Repayment would reopen it. If I confirm, the line is applied exactly as written, with no cap and no skip.
30. As a user, I want a Debt line never to cap itself at what the Debt has outstanding, so what I confirm is what I see.
31. As a user, I want the trigger to refuse, with a clear reason, when it would push the Bank Account's Unallocated below zero, as every other write does.
32. As a user, I want triggering to leave no record of its own, so the Distribution's name in the note is the only trace.

### Editing and deleting

33. As a user, I want to edit a Distribution's name, default amount and lines, under the same rules as creating one, and I want it to keep at least one line.
34. As a user, I want to delete a Distribution behind a plain Yes/No confirmation, because deleting it loses no history. Every record it wrote stays.
35. As a user, I want deleting a Bucket or a Debt to remove its line from every Distribution, and to delete any Distribution that had no other line, because a Distribution needs at least one (story 15). I want both listed in the delete confirmation before I confirm, such as "Payday will also be deleted, because its only line is Tithes".
36. As a user, I want deleting a Bank Account to delete the Distributions that use it, and I want that listed in the delete confirmation before I confirm.

37. As a user, I want a Distribution's Bank Account fixed once it is saved, shown but not editable, because its lines and amounts are tied to that account's currency.
38. As a user, I want to duplicate a Distribution into a prefilled Create form, so I can edit anything before saving, and the original stays untouched. The name starts as "<name> copy", and the Bank Account starts as the original's but I can pick another, so reusing a routine on another account doesn't mean editing the original. Picking an account in a different currency warns and resets the lines, like any unsaved form (story 14).

### Ownership

39. As a user, I want every Distribution view and action limited to my own Distributions, and every line's Bucket, Debt and Bank Account limited to my own, on save and on trigger.

## Implementation decisions

- **Modules touched.** A new `distributions` module. `transactions`, `allocations` and `repayments` gain no new column, and none of their tables changes shape. The Debt, Bucket and Bank Account delete previews each gain a Distribution row.
- **New table `distributions`.** Columns:
  - `id`.
  - `userId`, a foreign key to users with `ON DELETE CASCADE`.
  - `bankAccountId`, a foreign key to `bank_accounts` with `ON DELETE CASCADE`, which is what makes story 36 hold. It never changes after creation, so the edit schema is a `strictObject` with no `bankAccountId`, as `editAllocationSchema` accepts no bucket or account (story 37).
  - `name`, with a unique index on `(userId, lower(name))`, as for `buckets`.
  - `amount`, an integer in minor units, in the Bank Account's currency.
  - `createdAt`.
- **New table `distributionLines`.** Columns:
  - `id`.
  - `distributionId`, a foreign key with `ON DELETE CASCADE`.
  - `bucketId` and `debtId`, both nullable foreign keys with `ON DELETE CASCADE`, which is what makes story 35 hold.
  - `amount`, nullable, an integer in minor units, set only for a fixed line.
  - `basisPoints`, nullable, an integer, set only for a percentage line. 1000 means 10%. Basis points keep percentages out of floating point.
  - A CHECK that exactly one of `bucketId` and `debtId` is set, a CHECK that exactly one of `amount` and `basisPoints` is set, and unique indexes on `(distributionId, bucketId)` and `(distributionId, debtId)`.
- **No stored computed values.** A line stores its input, never its computed amount. The preview and the trigger work out every figure on read from the lines and the amount, as `Balance` and Outstanding are.
- **One function computes the plan.** `computeDistribution(lines, amount)` is a pure function in `src/modules/distributions/utils.ts`. It rounds each percentage line to the nearest centavo, half up, as `amount × basisPoints ÷ 10000`, drops zero lines, and returns the salary `income` (the amount minus every `receivable` line), the Allocation, `receivable` and `payable` lines, and the two blocking checks. The save-time check, the preview and the trigger all call it, so they can't disagree.
- **Warnings come from the server.** A `previewDistribution` server function returns the computed plan with a warning per Debt line, from the Debt's Outstanding and status through `getDebtsWithFigures`. Warnings are overpayment, Settled and Forgiven. They never block.
- **The trigger is one D1 batch.** `triggerDistribution` loads and checks ownership of the Distribution, its account and every line's target. It recomputes the plan and writes the salary `income` (when it's above zero), each Allocation, each Repayment with its Transaction, and the `forgivenAt` clears for reopened Debts, in one `db.batch`. A failure writes nothing.
  - **Repayment storage needs a batch-friendly entry point.** `addRepayment` in `src/modules/repayments/storage.server.ts` builds and runs its own batch. The trigger needs the same statements to combine them with the others, so that module should expose a function that returns them instead of running them. `addRepayment` would call it. The rule that only that module knows how a Repayment is stored stays true.
  - **The Unallocated check covers the whole trigger.** The existing `checkUnallocated` in `src/modules/bank-accounts/figures.server.ts` checks one change at a time. The trigger needs it to check the income, the Allocations and the `payable` `expense` together, replaying the account's history. Whether the helper can take several changes or needs a variant is for the implementer to confirm. The trigger throws `InsufficientFundsError` with the same message other writes use.
- **Dates and notes.** Every record is dated at the time of the trigger, as the `date` default does, and noted with the Distribution's name. A Repayment's date and note live on its Transaction.
- **Ownership.** `verifyUserDistributionMiddleware` throws `NotFoundError`, as the Debt and Bucket middleware do (ADR 0003). Save and trigger also check that every Bucket and Debt on a line belongs to the user and that each Debt's currency matches the account's, because a line's ids come from the request.
- **Delete previews.** `loadBankAccountDeletionImpact`, the Bucket impact and `loadDebtDeletionImpact` each count the Distributions or lines the delete removes, in the same server-side impact objects the confirmation tables already read. The Distribution rows use the same SQL conditions as the deletes, so the preview and the delete can't disagree. The lines go through `ON DELETE CASCADE`, but "left with no lines" can't be a cascade, so the Bucket and Debt deletes also remove, in the same batch, any Distribution whose only line pointed at the deleted target (story 35).
- **UI.**
  - A Distributions page and navigation entry, with a table of presets and a row menu for Trigger, Edit and Delete, in the style of Buckets and Debts. A dashboard shortcut is out of scope.
  - Create and Edit open in a Drawer with the name, account, default amount and line editor, and a dirty-dismiss warning, as Record Debt and Set Up Bucket do. Edit shows the account but doesn't let the User change it.
  - Duplicate is a row-menu item that opens the Create Drawer with the original's name (as "<name> copy"), default amount and lines filled in, and the account picker free to change (story 38). Nothing is saved until the User presses Save. Choosing an account in a different currency, in Create or in Duplicate, opens a confirmation that the lines will be reset. Confirming clears them, and cancelling leaves the account and lines as they were.
  - Trigger opens a smaller Drawer with the amount field and the live preview. Confirm is disabled while a blocking rule fails, and warnings show on the same screen.
  - The line editor creates targets through nested Drawers, each in its own Root as Add Goal and Log Allocation do. A new Bucket uses the existing `NestedSetUpBucketDrawer`, and a missing Bank Account uses the existing `NestedRegisterBankAccountDrawer`. A new Debt needs a `NestedRecordDebtDrawer`, which doesn't exist yet. It should lock the Debt's currency to the Distribution's account's currency, because the picker only lists Debts in that currency. Once a nested Drawer saves, the new Bucket or Debt is selected on the line being edited. A nested Record Debt may open a third level, Register Account, through its own Funding Source empty state. Check at build time that stacking three Drawers behaves.
  - Delete uses the app's plain `confirm()` dialog, because deleting a Distribution cascades nowhere and loses no history (the reasoning in the Allocation spec).
- **UI copy.** The UI says "Distribution" and uses the Distribution's name as the note. Toast titles follow the app's Title Case convention.

## Testing decisions

Deferred, for the same reason the other specs give: the repo has no test setup yet. Once it does, cover these first, starting with the worked examples above:

- `computeDistribution`, especially the `receivable` carve-out, the skipped salary `income` when it reaches ₱0, the rounding of percentage lines, and both blocking checks (examples 1 to 3 and 5 to 8).
- The trigger writing nothing when any step fails (story 27).
- A Debt line that overpays, is Settled or is Forgiven applying as written (story 29).
- A Debt line in a currency that doesn't match the account being rejected on save and on trigger (story 14).
- The cascade when a Bucket, a Debt or a Bank Account is deleted (stories 35 and 36).

## Out of scope

- **A history of triggers, or undoing one.** Rejected in ADR 0007. The Distribution's name in each note is the only trace.
- **Changing a saved Distribution's Bank Account.** It is fixed (story 37). Duplicating is the way to move a routine to another account (story 38).
- **A Distribution with no lines.** The User logs a plain Transaction for that (story 15).
- **Splitting income across several Bank Accounts.** One Bank Account per Distribution. It would need Transfers between accounts and per-account currency handling, and it can be added without changing the model above.
- **A schedule or automatic recurrence.** Salary can land early or late, so the trigger is always manual.
- **Skipping or editing a line for one run.** The amount is the only thing editable at trigger time (story 18). A per-run skip can be added later.
- **Capping a Debt line at Outstanding.** Rejected on purpose (story 30). The trigger warns and applies the line as written.
- **Allocating to a Goal.** Funding a Goal means funding its Bucket (ADR 0006). A Distribution has no Goal line.
- **A "rest goes to Bucket X" line.** Whatever the lines don't take stays Unallocated.
- **A dashboard shortcut to trigger a Distribution.** A later addition.

## Further notes

- `CONTEXT.md` defines `Distribution`. This spec assumes it instead of repeating it.
- The `distributions` and `distributionLines` tables reference `bank_accounts`, `buckets` and `debts`, so a later generated rebuild of any of those tables cascades the rows in the new tables away on D1. It needs the same back-up-and-restore treatment as the 2026-10-22 `debts` migration in `docs/specs/debt-module.md`.
- Story 17 was added at the User's request during the session. It was first suggested as a later addition, and the User asked for it in the same pass.
- Percent lines scale with the amount and fixed lines don't. A User who triggers a lower amount can therefore fail the `receivable` check from example 6 even though the default amount passes. That is expected, and the preview says so.
