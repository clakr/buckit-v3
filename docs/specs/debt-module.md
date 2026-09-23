---
status: ready-for-agent
module: debts
---

# Spec: Debt Module

No issue tracker is used for this project. This file is the actionable checklist — its `status: ready-for-agent` frontmatter stands in for the triage label a tracker would normally carry. Update the status (e.g. `in-progress`, `done`) as work proceeds.

## Problem Statement

`Debt` is a placeholder entity noted in `CONTEXT.md` but not yet implemented at all — no schema, no module, no UI. There is currently no way to track money owed to or by another person. A Bank Account's Balance can never go negative (it models liquid assets only), so credit/liability/IOU tracking has nowhere to live today.

## Solution

A `Debt` module tracking money owed in either direction (`receivable`/`payable`), with an asymmetric relationship to Bank Account: a `receivable`'s creation is itself a real money-movement event (funds leave a chosen Bank Account immediately); a `payable`'s creation is a pure record with no Bank Account involved until repayment. Repayments — many, partial, over time, either direction — are always real `Transaction` rows, kept linked to their Debt via a dedicated `debtPayments` table rather than teaching `transactions` about Debt. A Debt can also be manually forgiven (an all-or-nothing, reversible write-off).

This spec was produced by a grilling/domain-modeling session — no code exists yet. It is a full design ready to build from, not a description of existing behavior.

## User Stories

### Logging a Debt

1. As a user, I want to log a new Debt where someone owes me money (`receivable`), picking a source Bank Account, an amount, a currency, and a free-text counterparty name, so the money leaving that account to fund the loan is recorded as a real Transaction and I can track what I'm owed.
2. As a user, I want the Bank Account picker when logging a `receivable` Debt to only show accounts whose currency matches the currency I've picked for the Debt, so I can't accidentally fund it from a mismatched-currency account (this app has no FX conversion anywhere).
3. As a user, I want to log a new Debt where I owe someone money (`payable`), with just an amount, currency, and counterparty name — no Bank Account required — so I can record an obligation that didn't originate through money already tracked in this app (a cash loan, a pre-existing debt, a promise).

### Repaying a Debt

4. As a user, I want to log a repayment against any Debt, regardless of direction, picking a Bank Account, amount, date, and optional note, so the money genuinely moving is recorded as a real Transaction tied back to that Debt.
5. As a user, I want the Bank Account picker for a repayment to only show accounts matching the Debt's currency, same reasoning as story 2.
6. As a user, I want repayments to be freely made from any matching-currency Bank Account, not constrained to the account a `receivable` was originally funded from, so real-world flexibility (lent from Checking, repaid into Savings) is supported.
7. As a user, I want to log multiple partial repayments against a single Debt over time, so I can track it being paid down gradually rather than all at once.
8. As a user, I want a Debt's outstanding amount to be computed live from its original amount minus everything repaid against it, so I never trust a number that could go stale.
9. As a user, I want to be able to log a repayment larger than what's currently outstanding, so an overpayment (accidental or deliberate) isn't blocked — the app shouldn't assume it's always a mistake.

### Viewing and editing

10. As a user, I want to see a Debt's counterparty name, direction, amount, live outstanding, currency, date, and note on its detail page, along with every repayment logged against it, so I have a full picture in one place.
11. As a user, I want to edit a Debt's counterparty name, date, or note at any time, without restriction.
12. As a user, I want a Debt's `direction` to be permanently fixed once created, so a repayment logged against it is never ambiguous about which way money should move.
13. As a user, I want a `payable` Debt's amount to stay freely editable, so I can correct how much I actually owe.
14. As a user, I want a `receivable` Debt's amount to be locked once created — it's tied 1:1 to the real Transaction that funded it — so an edit can't desync from what that Transaction actually recorded; to correct it, I delete and re-log instead.
15. As a user, I want to edit an existing repayment's amount, date, or note, with the edit applying directly to its underlying Transaction, so I can correct a mistake.

### Deleting a Debt

16. As a user, I want to delete a Debt behind a typed confirmation, so I understand I'm about to remove a tracked record.
17. As a user, I want deleting a Debt to, by default, leave every Transaction it's linked to untouched in my Bank Account history — that money genuinely moved — so my Balance is never silently rewritten by a bookkeeping cleanup.
18. As a user, I want an explicit, clearly-labeled option in that same confirmation to also delete the linked Transaction(s), so I can fully undo a genuine mistake (e.g. an accidental duplicate Debt) when I actually want the real money record gone too.

### Forgiving a Debt

19. As a user, I want to manually mark a Debt as forgiven, writing off whatever is still outstanding regardless of how much has actually been repaid, so I can close out a debt I've decided not to collect or pay the rest of.
20. As a user, I want forgiving a Debt to use a simple yes/no confirmation, since it never touches real money or Transactions.
21. As a user, I want to manually un-forgive a Debt I forgave by mistake, reopening it without deleting and re-logging.
22. As a user, I want logging a new repayment against an already-forgiven Debt to automatically reopen it — after a clear warning that this is about to happen — so a genuine payment isn't silently swallowed by a "closed" status.
23. As a user, I want a Debt's displayed status (Open / Settled / Forgiven) to always be computed live from its amount, its repayments, and whether it's been forgiven — never a separately stored value — so it can never drift out of sync with the data underneath it.

### Interaction with Bank Account deletion

24. As a user, when I delete a Bank Account that has a Transaction linked to a Debt as a repayment, I want that specific repayment link to disappear (the Debt's outstanding goes back up accordingly) without destroying the Debt itself.
25. As a user, when I delete a Bank Account that funded a `receivable` Debt's origination, I want that Debt to survive with its origination link cleared (orphaned) rather than being deleted outright, so I don't silently lose repayment history recorded against it on other, untouched accounts.
26. As a user, I want the Bank Account delete confirmation to warn me about any Debts that will be affected (a repayment link removed, or an origination orphaned) before I confirm, so I'm not surprised afterward by a Debt that looks reopened or partially unexplained.

### Ownership

27. As a user, I want every Debt view/action scoped to my own Debts only, never another user's — same boundary already enforced everywhere else in this app.

## Implementation Decisions

- **Modules touched**: new `debts` module. `transactions` schema is **not** modified — no new column, no awareness of Debt added to it.
- **New table `debts`**: `id`, `userId` (FK → users), `direction` (`"payable" | "receivable"`, immutable after creation), `counterpartyName` (text, free-form — no dedicated entity), `amount` (integer, minor units), `currency` (own column, always required — unlike Transaction/Allocation, never inherited, since `payable` has no Bank Account at creation), `originatingTransactionId` (nullable FK → `transactions.id`, `ON DELETE SET NULL`, set only at creation for `receivable`, always `null` for `payable`), `note` (nullable text), `date` (user-editable, defaults to now), `createdAt`, `forgivenAt` (nullable timestamp — the only genuinely non-derivable piece of Debt state; presence means forgiven).
- **New table `debtPayments`**: `id`, `debtId` (FK → `debts.id`, `ON DELETE CASCADE`), `transactionId` (FK → `transactions.id`, `ON DELETE CASCADE`, unique — a Transaction backs at most one repayment), `createdAt`. No `amount` of its own — always read via the joined Transaction, same "no data duplicated across the link" principle as Allocation having no currency of its own.
- **`originatingTransactionId` vs. `debtPayments.transactionId` — different `ON DELETE` behavior, deliberately.** `debtPayments.transactionId` cascades (losing one repayment's Transaction should only remove that one repayment link — the Debt survives, outstanding recomputes upward). `originatingTransactionId` sets null, does **not** cascade the Debt (losing the origination account shouldn't destroy a Debt's entire history, including repayments recorded on other, untouched accounts — see stories 24–26 and the worked example this reasoning came from, in session notes). Do not "simplify" this to one uniform cascade rule later without re-deriving that trade-off.
- **Direction → cash-flow mapping** (fixed, not user-chosen per record): `receivable` creation = `expense` (money leaving the source account); `receivable` repayment = `income`. `payable` has no creation-time Transaction; `payable` repayment = `expense`.
- **Outstanding**, computed on read, never stored: `amount − Σ(debtPayments joined to transactions).amount`. Allowed to go negative (overpayment permitted, no cap — see story 9). This mirrors `Balance`/`Unallocated`'s existing "computed on read, never stored" precedent in `CONTEXT.md`.
- **Status**, also computed, never stored, in priority order: `forgivenAt != null → "Forgiven"`; else `outstanding ≤ 0 → "Settled"`; else `"Open"`. Do not add a `status` column — see story 23; a stored status is exactly the kind of value that would silently go stale when a Bank Account deletion cascades away a repayment out from under a Debt through a code path unrelated to the Debt module.
- **Repayment validation**: no cap against outstanding (story 9 — overpayment allowed for both directions). The only invariant still in play is the existing, unrelated `Balance ≥ 0` check already enforced on every `expense` Transaction (applies here only because a `payable` repayment happens to be an `expense`, not because of any Debt-specific rule).
- **Editing**: `direction` never editable. `receivable.amount` never editable (delete + re-log to correct — same precedent as Allocation's non-reassignment). `payable.amount` freely editable. `counterpartyName`/`note`/`date` freely editable, both directions. Editing a repayment edits its linked `Transaction` directly (amount/date/note) — reuses the Transaction module's own edit path/validators, since `debtPayments` holds no data of its own to edit.
- **Forgiving**: sets `forgivenAt = now`. All-or-nothing (no partial write-off, no separate forgiven-amount field). Plain `confirm()`. Un-forgiving (manual) clears `forgivenAt`. Logging a new repayment against a forgiven Debt (`forgivenAt != null`) also clears `forgivenAt` as a side effect, gated by a confirmation alert warning the user this reopens it.
- **Delete**: typed confirmation (Bank Account/Bucket style, per ADR 0001/0002 precedent), not plain `confirm()` — chosen specifically because a Debt with repayments can be deleted, unlike Allocation/Transaction's plain-confirm precedent which assumes no meaningful history is lost. Default: delete the `debts` row only (cascades away its `debtPayments` rows via `debtId`; linked `transactions` are untouched). Checkbox option ("also delete the linked Transaction(s)"), unchecked by default: additionally deletes every Transaction the Debt links to (the origination, if any, plus every repayment's Transaction) — implemented by resolving the linked Transaction ids first (before the `debts` row's `debtPayments` cascade removes that linking info), deleting those Transactions, then deleting the `debts` row itself. Copy must make the money-affecting consequence of checking the box explicit (see story 18) — this is not a cosmetic checkbox.
- **Follow-up on `bank-accounts` module (not this spec's scope, but required for stories 24–26 to be true in practice)**: the existing typed-confirmation copy for deleting a Bank Account (ADR 0001) needs to be extended to enumerate affected Debts before the user confirms — e.g. "Deleting Checking will also affect 1 Debt: Jane's ₱600 repayment will be undone, reopening 'Jane owes ₱1000' back to ₱600 outstanding." Without this, stories 24/25's cascade behavior is technically correct but silent/surprising. Flag this as a small required change to `bank-accounts`' delete flow when this module is built, not a separate spec.

## Testing Decisions

Deferred, for the same reason already recorded in `docs/specs/bank-account-crud.md`, `docs/specs/bucket-crud.md`, `docs/specs/transaction-list-and-transfer.md`, and `docs/specs/allocation-cross-account-and-bucket-list.md`: no test harness exists yet anywhere in this repo. Once one exists, the highest-value cases to cover first: the outstanding/status computation (especially the "overpaid" and "forgiven-then-reopened" branches), the `originatingTransactionId` orphan-vs-`debtPayments` cascade split on Bank Account deletion (stories 24–25), and the checkbox delete path's transaction-then-debt deletion ordering.

## Out of Scope

- **A dedicated Counterparty/Contact entity.** Free-text `counterpartyName` only — explicitly rejected in favor of the app's minimalism precedent (Bucket/Goal left undesigned until needed). Revisit only if per-person history/search across Debts becomes a real ask.
- **Due dates, reminders, or any notification concept.** No notification infrastructure (email/push) exists anywhere in this app — a due date field would be inert. Not designed here.
- **Partial forgiveness.** Forgiving is all-or-nothing by design (story 19) — see the reasoning in the Implementation Decisions section. A partial write-off would need its own append-only ledger, structurally another `debtPayments`-shaped table; not built.
- **FX conversion.** A Debt's currency must match any Bank Account it transacts with (stories 2, 5) — there is no conversion mechanism anywhere in this app, and none is introduced here.
- **A standalone, cross-account Debt list/search view.** Only a per-Debt detail page is designed here, same starting point Allocation had before `docs/specs/allocation-cross-account-and-bucket-list.md`. Could get the same treatment later.
- **`Distribution`'s integration with Debt** (splitting a logged income across Buckets *and* Debts) — still a separate, undesigned module; this spec unblocks its Debt half but doesn't design the integration itself. See the `Distribution` entry in [`CONTEXT.md`](../../CONTEXT.md).
- **The `bank-accounts` delete-confirmation copy change** noted above — required for this spec's stories to be non-surprising in practice, but is a change to a different module's existing flow, not new Debt-module work.

## Further Notes

- Resolved vocabulary for `Debt` lives in `CONTEXT.md`. This spec assumes it as context rather than repeating it.
- `originatingTransactionId` is only guaranteed non-null at creation time for `receivable` — it can become `null` later via Bank Account deletion (story 25) even though `direction` stays `receivable` forever. Don't enforce a `NOT NULL WHEN direction = 'receivable'` constraint at the DB level; that would break the orphaning behavior this spec deliberately chose over cascading the whole Debt.
- This entire spec is the output of a grilling/domain-modeling session — every decision above was explicitly worked through with concrete worked examples (duplicate-entry cleanup, cross-account repayment cascades, overpayment interaction with `Balance`'s existing invariants) before being locked in. Nothing here is a first-pass guess.
