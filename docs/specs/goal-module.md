---
status: ready-for-agent
module: goals
---

# Spec: Goal module

## Problem statement

A Bucket shows what it holds, one Subtotal per currency, but not what it's for. Saving "for the Japan trip" has a number and often a date in mind, such as ₱150,000 by March 2027. The app has no way to record either, so the user can't see how close they are, whether they're on pace, or how much more to set aside each month. Until now, `Goal` was only a placeholder in `CONTEXT.md`, with its shape left open: a column on `buckets`, or a separate table referencing one or more Buckets.

## Solution

A Goal is a savings target attached to one Bucket. It has a target amount, one currency fixed at creation, and an optional target date. A Bucket has at most one Goal. A Goal never holds money. It measures its Bucket's Subtotal in the Goal's currency, which is its Progress. Status (Reached, Overdue, In progress) and the monthly amount needed are always computed and never stored. Goals appear only on Bucket screens, with no route of their own.

A grilling and domain-modeling session on 2026-10-22 produced this spec. No Goal code exists yet. [ADR 0006](../adr/0006-goal-is-a-target-on-a-bucket.md) records why a Goal is a target on a Bucket and not a money container of its own.

## User stories

### Already implemented: the Bucket behavior a Goal relies on

These are recapped so test cases can be written against the whole flow later. They are covered in full by `docs/specs/bucket-crud.md`, `docs/specs/allocation-cross-account-and-bucket-list.md` and `docs/specs/withdrawal.md`.

1. As a user, I want to create a Bucket with just a name, unique per user ignoring case, so I can start earmarking money toward something.
2. As a user, I want to allocate money from any of my Bank Accounts into a Bucket, blocked if it would push that account's Unallocated below zero, so the money I earmark is really available.
3. As a user, I want a Bucket to show one Subtotal per currency, its Allocations minus its Withdrawals, with no currency conversion, so I see exactly what it holds.
4. As a user, I want to edit or delete an Allocation, and to spend from a Bucket through a Withdrawal, so the Bucket's Subtotals always match what's really earmarked.
5. As a user, I want deleting a Bucket to permanently remove everything it owns, behind a typed confirmation (ADR 0002).

### Setting a Goal

6. As a user, I want to add a Goal to an existing Bucket, giving a target amount, a currency, and optionally a target date, so I can track saving toward something specific.
7. As a user, I want to optionally set a Goal while creating a Bucket, so I don't have to create the Bucket and then edit it straight away.
8. As a user, I want a Bucket to have at most one Goal, so its Progress is never ambiguous.
9. As a user, I want the Goal's currency picker to offer only currencies my Bank Accounts use, so every Goal can actually be funded. This works even for a new Bucket that holds nothing yet.
10. As a user, I want the target amount to be greater than zero.
11. As a user, I want the target date, when given, to be today or later, so I don't create a Goal that's already overdue.

### Tracking progress

12. As a user, I want a Goal's Progress to be its Bucket's current Subtotal in the Goal's currency, so it tells me whether the money is really there. Withdrawals and edited or deleted Allocations reduce it.
13. As a user, I want money the Bucket holds in other currencies to stay visible as its usual Subtotals but not count toward the Goal, since the app never converts currencies.
14. As a user, I want Progress to be able to pass 100%, and I want Allocations never to be blocked by a Goal, because a Goal measures saving and never limits it.
15. As a user, I want a Goal's status computed live, never stored. It is **Reached** while Progress is at or above the target, **Overdue** when the target date has passed and it isn't Reached, and **In progress** otherwise.
16. As a user, I want a Reached Goal to go back to In progress if I spend its money through a Withdrawal, because a Goal says whether the money is there now, not whether it once was.
17. As a user, I want an In progress Goal with a target date to show how much I need to set aside each month to make it, so I know whether I'm on pace.

### Seeing Goals

18. As a user, I want each row in the Bucket list to show its Goal's Progress as a bar with its status, so I can scan all my Goals at once. Buckets with no Goal show nothing extra.
19. As a user, I want a Bucket's detail page to show its Goal in full: target, saved, remaining, target date, status, and the monthly amount needed.
20. As a user, I want Goals to live only on Bucket screens, with no separate Goals page, because a Goal doesn't exist apart from its Bucket.

### Editing and removing

21. As a user, I want to edit a Goal's target amount and target date at any time, including clearing the date, so I can adjust plans.
22. As a user, I want a Goal's currency fixed once created. To change it, I remove the Goal and add a new one.
23. As a user, I want editing other fields of an Overdue Goal to work without changing its past date, so the date rule from story 11 only applies when the date itself is set or changed.
24. As a user, I want to remove a Goal behind a plain confirmation, keeping the Bucket and all its money, because removing a target touches no money.
25. As a user, I want deleting a Bucket to delete its Goal along with it.

### When no Bank Account can fund a Goal

26. As a user, if I delete the last Bank Account in a Goal's currency, I want the Goal to stay with a hint such as "No USD account can fund this Goal", so I don't lose it as a side effect and can add a new account later.

### Ownership

27. As a user, I want every Goal view and action limited to Goals on my own Buckets, as everywhere else in this app (ADR 0003).

## Implementation decisions

- **New module `goals`.** The `buckets`, `allocations` and `withdrawals` schemas are **not** changed.
- **New table `goals`.** Its columns:
  - `id`.
  - `bucketId`, a **unique**, not-null foreign key to `buckets.id` with `ON DELETE CASCADE`. The unique constraint enforces "at most one Goal per Bucket" (story 8), and the cascade follows ADR 0002 (story 25).
  - `targetAmount`, an integer in minor units, greater than zero.
  - `currency`, `CURRENCIES_CODES` enum, fixed after creation.
  - `targetDate`, a nullable date, stored like `transactions.date` (`mode: "timestamp"`).
  - `createdAt`.

  No `userId`: ownership goes through the Bucket, so a Goal can never belong to a different User than its Bucket. No `status`, `reachedAt` or `completedAt`, because status is computed (story 15).
- **Why a separate table, not columns on `buckets`.** Three columns that are all null together or all set together, with `currency` and `targetAmount` required when present, are cleaner as one optional row than as nullable columns plus a CHECK. Removing a Goal is a row delete rather than nulling three columns.
- **Progress** is read from the existing `getBucketsWithFigures` (`src/modules/buckets/figures.server.ts`): the `subtotals` entry whose currency matches the Goal's, or 0 if there is none. Don't write a second subtotal query.
- **Status** is computed in this order: if Progress ≥ `targetAmount`, it's Reached. Otherwise, if `targetDate` is set and before today, it's Overdue. Otherwise it's In progress.
- **Monthly amount needed** is only shown while the Goal is In progress and has a `targetDate`. It is `ceil((targetAmount − Progress) / monthsLeft)`, where `monthsLeft` is the number of calendar months from today to the target date, counting a partial month as a full one, with a minimum of 1.
- **Currency validation.** On create, the chosen currency must be one at least one of the User's Bank Accounts uses. Check this on the server, not just in the picker. It isn't re-checked afterward: deleting the last account in that currency leaves the Goal in place (story 26). The detail page shows the hint when no Bank Account uses the Goal's currency.
- **Date validation.** `targetDate ≥ today` only when the date is set on create or changed on edit (stories 11 and 23).
- **Create with Bucket** (story 7). The Bucket create form gains an optional Goal section. The Bucket and Goal are written in one transaction, so a failed Goal never leaves a half-made Bucket.
- **Ownership.** Goal mutations look up the Goal's Bucket and check it belongs to the User, through the same middleware pattern as other modules (ADR 0003).
- **Remove** uses a plain confirmation, not a typed one (story 24).

## Testing decisions

Deferred, for the same reason the other specs give: the repo has no test setup yet. Once it does, cover these first:

- The status order, especially Reached-then-withdrawn (story 16) and Overdue-but-Reached (Reached wins).
- Progress ignoring Subtotals in other currencies (story 13).
- The `monthsLeft` rounding at month boundaries, and the minimum of 1.
- Date validation applying only when the date changes (story 23).

## Out of scope

- **Allocating to a Goal directly, or a Goal spanning several Buckets.** Rejected in ADR 0006.
- **A history of achieved Goals** (`reachedAt` or a manual "complete" flag). Rejected in favor of computed status. Revisit only if the user wants a record of past Goals.
- **A Goals overview page or filter.** Goals live on Bucket screens (story 20).
- **Reminders or notifications** about pace or due dates. The app has no notifications anywhere.
- **Sorting the Bucket list by Progress.** It would hit the same open problem as the deferred sortable Subtotal column in `docs/specs/bucket-crud.md`.
- **Distribution.** Its glossary entry now says funding a Goal means funding its Bucket. The rest of Distribution is still undesigned.

## Further notes

- **2026-10-25. Add Goal and Edit Goal open in Drawers.** Stories 6, 8 to 11 and 21 to 23 are unchanged. Add Goal and Edit Goal are now `AddGoalDrawer` in `add-goal-drawer.tsx` and `EditGoalDrawer` in `edit-goal-drawer.tsx`, built on `ResponsiveDrawer` like the Allocation Drawers (`docs/specs/allocation-cross-account-and-bucket-list.md`, 2026-10-24). Each slides in from the right on desktop and up from the bottom with a swipe handle below 768px. The form scrolls, and Submit and a new Cancel stay pinned at the bottom. `addGoalDrawerHandle` and `editGoalDrawerHandle`, both with payload `{ bucketId }`, replace the `createDialogStore` stores, so none are left in the Goals module. The bucket page's Add Goal button is a `DrawerTrigger`, so focus returns to it. The Buckets row menu's Add Goal calls `addGoalDrawerHandle.openWithPayload({ bucketId })`, and the Goal card's menu Edit calls `editGoalDrawerHandle.openWithPayload({ bucketId })`. Each body (`AddGoalForm`, `EditGoalForm`) mounts inside the popup with `bucketId` as a prop and unmounts once the close animation ends, so the `enabled: isOpen` flags and the `bucketId: null` guard are gone. A dirty dismiss of either Drawer, including by swipe, still asks "Discard new goal?" or "Discard editing goal?". "Keep Editing" keeps the input, and "Discard" resets the form and then closes. The "Goal not found" Close button is `DrawerClose`. Add Goal's "No bank accounts yet" Register Bank Account button no longer closes Add Goal. Register Account stacks on top of it as a second Drawer, like it does from Record Debt (`docs/specs/bank-account-crud.md`, 2026-10-24), and once the account is saved Add Goal refetches its currencies and shows the form. That swap renders the lazy form fields (`src/integrations/tanstack-form/index.ts`) for the first time. They used to suspend to the route's Suspense boundary, which disconnected every drawer's handle, so Register Account's `close()` was sometimes dropped and it stayed open after saving. `DrawerContent` now wraps its children in its own `Suspense`, so a lazy field only suspends its own drawer's content. Remove Goal is unchanged and still uses plain `confirm()`.
- **2026-10-27. Register Account nests inside Add Goal.** Stories 6 and 9 are unchanged. Add Goal's "No bank accounts yet" button opened Register Account with `registerBankAccountDrawerHandle.openWithPayload({ currency: "PHP" })`, so Register was a sibling Root and didn't nest. Add Goal now renders `NestedRegisterBankAccountDrawer` beside its `DrawerContent`, inside its Root, on its own `nestedRegisterBankAccountDrawerHandle`, as Record Debt does (`docs/specs/debt-module.md`, 2026-10-27). The Register Bank Account button is a `DrawerTrigger` with `{ currency: "PHP" }`. PHP is intended. The user has no Bank Accounts here, so no currency is implied, PHP matches the Accounts page, and Register's currency picker can change it. While Register is open, Add Goal scales back and peeks, and its swipe handle hides on mobile. Cancel, the backdrop, and "Discard" after a dirty Escape close only Register and return focus to the button. Once an account is saved, Add Goal refetches its currencies and shows the form in that account's currency. The 2026-10-25 `Suspense` in `DrawerContent` wasn't enough once Register nested. The swap renders the lazy form fields for the first time, and they suspended Add Goal's whole content, nested Root included, so Register's `close()` was dropped and it stayed open. The nested Root now renders beside `DrawerContent`, outside that `Suspense`, so the swap can't unmount it. Base UI nests through the Root context, not the Popup, so it still nests. The saved account also unmounts the Register button, and Base UI then sent focus to the page behind Add Goal. `NestedRegisterBankAccountDrawer` takes an optional `finalFocus`, and Add Goal passes the button while it exists and its own popup otherwise, so focus stays in Add Goal and lands on Currency.
