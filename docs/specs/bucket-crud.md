---
status: ready-for-agent
module: buckets
---

# Spec: Bucket edit, delete, and the boundaries around them

This project uses no issue tracker, so this file is the checklist. Its `status: ready-for-agent` frontmatter takes the place of a tracker's triage label. Update the status, for example to `in-progress` or `done`, as work goes on.

## Problem statement

A user can create a Bucket and see its list and detail views but can't fix a mistake afterward. They can't rename a Bucket, even to correct a typo, because the "Edit" menu item exists but is disabled. They can't remove a Bucket they no longer use either, because "Delete" is disabled too. No doc explains _why_ some things a user might expect don't exist, such as spending directly from a Bucket or a savings target with a progress bar. Without that, a future contributor could "fix" them as if they were oversights.

## Solution

Make Edit and Delete work on a Bucket, following the pattern already specified for Bank Account (`docs/specs/bank-account-crud.md`, `docs/adr/0001-hard-delete-bank-accounts.md`). Edit only renames. Delete permanently removes a Bucket and everything allocated to it, behind a typed confirmation. Out of scope names the other ideas discussed for the Bucket module, so nobody mistakes them for missing work: a savings-target `Goal` module, a sortable subtotal column, and a summary on the Bucket detail page.

## User stories

1. As a user, I want to see a list of all my Buckets with a subtotal per source currency, so that I can see at a glance how much I've earmarked into each one.
2. As a user, I want to open a Bucket's detail page and see every Allocation into it, so that I can review its full funding history.
3. As a user, I want to create a new Bucket with just a name, so that I can start earmarking money toward it.
4. As a user, I want the app to stop me from creating two Buckets with the same name, ignoring case, so that I don't confuse similarly named Buckets.
5. As a user, I want to log an Allocation from one of my Bank Accounts into a Bucket, so that I can set money aside toward it.
6. As a user, I want to edit or delete an Allocation, so that I can correct a mistake without deleting the whole Bucket.
7. As a user, I want the app to block any Allocation change that would push a Bank Account's unallocated balance below zero, so that I can trust that number is available.
8. As a user, I want to rename an existing Bucket, so that I can fix a typo or change how I label it, such as "Trip" to "Japan Trip".
9. As a user, I want renaming to follow the same uniqueness rule as creation, ignoring case and excluding the Bucket's own current name, so that I can't create a duplicate and can still save without changing anything.
10. As a user, I want a confirmation toast when I successfully rename a Bucket, so that I know the change was saved.
11. As a user, I want to delete a Bucket I no longer need, so that abandoned savings categories don't clutter my Buckets list.
12. As a user, I want to be told exactly how many Allocations will be destroyed before I delete a Bucket, so that I understand what the action removes.
13. As a user, I want to be told that deleting a Bucket returns its earmarked money to each source Bank Account's unallocated balance, so that I know my money isn't lost, only un-earmarked.
14. As a user, I want to type the Bucket's name to confirm deletion, so that I can't destroy a Bucket's entire funding history with a single accidental click.
15. As a user, I want deleting a Bucket to also remove all of its Allocations, so that no orphaned Allocations point at a Bucket that no longer exists.
16. As a user, I want a confirmation toast when a Bucket is deleted, so that I know the action completed.
17. As a user, I want to be redirected back to the Buckets list after deleting the Bucket I was viewing, so that I'm not left on a broken detail page for a Bucket that no longer exists.
18. As a user, I want it to stay true that I can never record an expense directly against a Bucket, so that Buckets stay simple savings categories and all spending stays visible on the Bank Account the money left from. _(This confirms an existing, permanent boundary. It isn't new work.)_
19. As a user, I want to eventually set a savings target and see progress on a Bucket, so that I know how close I am to a goal. _(Recorded for a future, undesigned `Goal` module. It isn't part of this spec's build.)_
20. As a user, I want to eventually sort my Buckets list by subtotal, so that I can find my biggest or smallest Buckets at a glance. _(Recorded for later. It waits on a design for converting each row's currencies efficiently, and it isn't part of this build.)_
21. As a user, I want to eventually see a Bucket's total per currency at the top of its detail page, not only in the list view, so that I don't have to go back to the list to see it. _(Recorded for later. The detail page's summary needs its own design pass, and it isn't part of this build.)_

## Implementation decisions

- **Modules touched.** Only `src/modules/buckets`, in `functions.ts`, `schemas.ts`, `mutations.ts` and `components/`. No other module changes.
- **New server functions.**
  - `editBucket` runs behind the existing `verifyUserBucketMiddleware`. It validates `name`: trimmed, required, at most 100 characters, and unique per user, excluding the Bucket's own current name. It updates `name` only. By design, this mutation accepts no other field, because the entity has no other field that can change.
  - `deleteBucket` runs behind the existing `verifyUserBucketMiddleware` and hard-deletes the `buckets` row. It needs no server-side "can this be deleted" check. The existing `onDelete: "cascade"` foreign key removes the Bucket's `allocations` rows, and no rule blocks deletion (see `docs/adr/0002-hard-delete-buckets.md`). The app computes `Unallocated` on read, so the deleted Allocations' amounts go back to each source Bank Account's unallocated pool with no separate reconciliation step.
- **Existing function to extend.** `validateBucketName` needs an optional parameter for a bucket id to exclude. The edit flow can then check uniqueness while still letting the user submit without changing the name.
- **Schema changes.** None.
- **Edit dialog.** A new dialog with a single Name field, pre-filled with the current value. It follows `SetUpBucketDialog`'s name field, with debounced async validation through the extended `validateBucketName`. It replaces the disabled "Edit" item in `BucketActionsDropdownMenu`.
- **Delete dialog.** A new, dedicated confirmation dialog where the user types the Bucket's name to confirm. It does **not** use the app's existing `confirm()` store, which is a plain Yes/No dialog. The dialog must state exactly how many Allocations the delete destroys, and that their amounts return to each source Bank Account's unallocated balance. The delete button stays disabled until the typed input matches the Bucket's name exactly. It replaces the disabled "Delete" item in `BucketActionsDropdownMenu`.
  - **Don't extract a shared typed-confirmation dialog yet**, even though this is the second module to need one, after the still-unbuilt Bank Account delete. The project's rule of three says to wait for a third real need before extracting a shared component. Build this one on its own, copying the pattern instead of importing a shared one.
- **Navigation after delete.** Deleting from the Bucket detail page redirects to `/buckets`. Deleting from the Buckets list removes the row, with no navigation.

## Testing decisions

Not decided for this pass. The repo has no test setup anywhere yet. `vitest` is a dependency, but there is no `vitest.config.ts`, no test files, and no `@cloudflare/vitest-pool-workers` or similar for running D1-backed server functions like `editBucket` and `deleteBucket`. That would be new tooling for the whole repo, not a decision for one module, so this spec doesn't add it. Revisit once someone chooses how to test (see the same open item in `docs/specs/bank-account-crud.md`).

## Out of scope

- **A `Goal` module** for tracking a target and progress on a Bucket. It is planned but undesigned. This spec leaves its shape open: a column on `buckets`, or a separate model that references one or more Buckets. See the `Goal` entry in `CONTEXT.md`.
- **Spending or Transactions scoped to a Bucket.** This is rejected permanently. Spending is always a Bank Account Transaction, and that boundary is deliberate.
- **A sortable subtotal column** on the Buckets list. It waits on a design for converting each row's currencies efficiently.
- **A summary header** on the Bucket detail page. It needs its own design pass before anyone builds it.
- ~~**A shared subtotal utility (`utils.ts`)** for Buckets.~~ Done 2026-10-15 as the Bucket figures module. See Further notes.
- **A shared typed-confirmation dialog.** Not extracted yet, for the same rule-of-three reason. Build this ticket's delete dialog on its own.
- Any change to the Bank Account or Allocations modules. Each has, or will have, its own spec.
- Automated tests for this pass. See Testing decisions.

## Further notes

- `CONTEXT.md` at the repo root holds the resolved vocabulary. `src/modules/buckets/SPEC.md` holds the full module rationale, including the entity shape, invariants, the boundary between goals and envelopes, and the polish gaps deferred on purpose. `docs/adr/0002-hard-delete-buckets.md` records the delete-policy trade-off and cites `docs/adr/0001-hard-delete-bank-accounts.md` as precedent. Read those before implementing, because this spec assumes them instead of repeating them.
- This spec copies the structure of `docs/specs/bank-account-crud.md` on purpose. Both modules have the same Edit and Delete gap and use the same typed-confirmation pattern, so they stay consistent once both are built.
- **2026-10-13. The delete dialog shows its consequences as a before-and-after table.** Stories 12 and 13 still hold, in a new layout. The dialog's description says what gets deleted, which is the Bucket and its N Allocations (`getBucketDeletionDescription`). Below it, `BucketDeletionSummary` (`src/modules/buckets/components/bucket-deletion-summary.tsx`) shows an "Unallocated in / Before / After" table. Each row is a source Bank Account whose unallocated balance goes up by what it had allocated here, and a line below says account balances don't change. The dialog now also fetches every Bank Account to compute those balances. This matches the Delete Account dialog's `BankAccountDeletionSummary`. A prototype chose this layout (branch `prototype/delete-bucket-affected-data`, variant B) over a "where the money goes" list and over per-account allocation bars.
- **2026-10-15. Expected failures have their own error classes.** Stories 4 and 9 and the delete flow still hold. What changed is how failures reach the user. `verifyUserBucketMiddleware` and `getBucket` throw `NotFoundError` (from `src/lib/errors.ts`) for a missing bucket or someone else's. The detail page then shows "Bucket not found" straight away instead of retrying, and the Edit and Delete dialogs show it with a Close button instead of Retry. A duplicate name throws `ConflictError`, and the failure toast shows its message. Story 9's parameter for the bucket id to exclude landed as `validateBucketName({ name, bucketId? })`, and the separate `validateEditBucketName` is gone. The database now also enforces case-insensitive unique names. See Name uniqueness in `src/modules/buckets/SPEC.md`.
- **2026-10-15. Subtotals moved to the server.** Stories 1, 12 and 13 still hold. One place sums the Subtotal now, the Bucket figures module (`src/modules/buckets/figures.server.ts`). Before, the list cell, the Bucket delete preview and the Bank Account delete preview each summed raw Allocation rows. `getBuckets` returns each Bucket's Subtotals and no Allocation rows, so the list and the Allocation dialog's bucket picker no longer download every Allocation. Subtotals appear in currency-code order, such as "₱317.34 + QAR 200.00". Before, the order depended on the order of the Allocations. Story 20, sorting by subtotal, still waits on currency conversion.
- **2026-10-15. The delete preview moved to the server.** Stories 12 and 13 still hold, with the same before-and-after table. The dialog used to fetch the Bucket and every Bank Account, then combine them in the browser. It now makes one request, `getBucketDeletionImpact`, which `loadBucketDeletionImpact` (`src/modules/buckets/deletion.server.ts`) answers using the Bucket and Bank Account figures modules. The delete itself is unchanged. It is a plain delete, and the foreign key cascade removes the Allocations.
- **2026-10-24. Set Up and Edit Bucket open in Drawers, and Delete Bucket uses a Dialog handle.** Stories 3, 4 and 8 to 17 are unchanged. Set Up Bucket and Edit Bucket are now `SetUpBucketDrawer` in `set-up-bucket-drawer.tsx` and `EditBucketDrawer` in `edit-bucket-drawer.tsx`, built on `ResponsiveDrawer` like Register and Edit Account (`docs/specs/bank-account-crud.md`, 2026-10-24). Each slides in from the right on desktop and up from the bottom with a swipe handle below 768px. The form scrolls, and Submit and Cancel stay pinned at the bottom. Set Up Bucket keeps its optional Goal fields (`docs/specs/goal-module.md`). Delete Bucket stays a Dialog, driven by `deleteBucketDialogHandle` from `createDialogHandle()`. None of the three has a `createDialogStore` store, so none are left in the Buckets module. The Buckets page's Set Up Bucket buttons and the bucket page's Edit button are `DrawerTrigger`s, so focus returns to them. The row menu's Edit and Delete call `openWithPayload({ bucketId })`. Set Up Bucket has no payload. Each body (`SetUpBucketForm`, `EditBucketForm`, `DeleteBucketForm`) mounts inside the popup, with `bucketId` as a prop where there is one, and unmounts once the close animation ends. The open-state flags and resets on close are gone, and Set Up Bucket's currencies query runs only while the Drawer is open because the form is only mounted then. A dirty dismiss of either Drawer, including by swipe, still asks "Discard new bucket?" or "Discard editing bucket?". "Keep Editing" keeps the input, and "Discard" resets the form and then closes. Delete Bucket's impact query stays disabled after a successful delete, so the closing Dialog doesn't refetch the deleted bucket and flash "Bucket not found". The "Bucket not found" Close buttons are `DrawerClose` and `DialogClose`.
- **2026-10-27. Set Up Bucket nests inside Log Allocation.** Stories 3, 4 and 8 to 17 are unchanged. Like Register Account (`docs/specs/bank-account-crud.md`, 2026-10-27), `set-up-bucket-drawer.tsx` now exports `NestedSetUpBucketDrawer`, which takes a `handle` and an optional `finalFocus`. A parent renders it beside its `DrawerContent`, inside its own Root, on a local handle, and opens it from a `DrawerTrigger` bound to that handle. Set Up Bucket has no payload, so the trigger passes none. `SetUpBucketForm` closes through the handle that opened it, not the global one. Log Allocation is the only parent (`docs/specs/allocation-cross-account-and-bucket-list.md`, 2026-10-27). The Buckets page keeps the global `SetUpBucketDrawer` on `setUpBucketDrawerHandle`.
