---
status: accepted
---

# Ownership is checked by each module's middleware

Every server function that reads or writes a record by id runs that module's `verifyUser<Entity>Middleware` (`verifyUserBankAccountMiddleware`, `verifyUserBucketMiddleware`, `verifyUserDebtMiddleware`, `verifyUserTransactionMiddleware`, `verifyUserAllocationMiddleware`). The middleware answers "is this yours?" and throws `NotFoundError` for a record that's missing or someone else's, so an id can't be probed for existence. Handlers behind it may read and write by id alone.

It runs after `authMiddleware`, which only answers "who is this?" (see `src/modules/authentication/SPEC.md`). The ownership middleware is the one place that decides ownership for a by-id request, and a reviewer only has to check that it's attached.

## Why this was checked

The 2026-10-20 Authentication architecture review suggested dropping the middleware where handlers already scope their own lookups by User, since some handlers check ownership twice. A survey of all 25 handlers that use an ownership middleware found:

- **7** scope their own lookup and throw before anything else runs (`getDebt`, `forgiveDebt`, `logRepayment`, `editRepayment`, and the three deletion previews).
- **6** are covered only by a side effect. A User-scoped figures lookup or Unallocated check happens to run, and throw, before an unscoped read or write (`getBankAccount`, `getAllocation`, `editTransaction`, `validateDeleteTransaction`, `deleteTransaction`, `editAllocation`).
- **12** read or write by id alone and rely on the middleware entirely (`getBucket`, `editBucket`, `deleteBucket`, `editDebt`, `unforgiveDebt`, `deleteDebt`, `getTransaction`, `logTransaction`, `logAllocation`, `deleteAllocation`, `editBankAccount`, `deleteBankAccount`). Some only partly: `checkUnallocated` returns early for income, so `logTransaction` isn't covered for income, and `logAllocation` checks the Bank Account but not the Bucket.

## Considered options

- **Each handler scopes its own lookups by User, and the middleware goes.** `src/modules/repayments/storage.server.ts` already does this for its own reads. It would save one primary-key lookup in the 7 handlers that check twice, but 18 handlers would first need User-scoping. Each of those edits is security-sensitive, because one miss lets anyone read or change another user's record by changing an id.
- **Both the middleware and a scoped lookup in every handler.** This is defence in depth. It needs the same 18 edits and changes no behaviour while the middleware is attached.
- **The middleware as the ownership check.** Chosen. Every by-id request gets the same check. The cost is a duplicate lookup in a few handlers.

## Consequences

- Don't remove an ownership middleware from a server function without first scoping every read and write in its handler by User.
- A new server function that takes a record id must attach that module's ownership middleware, including for ids of other modules' records (as `logAllocation` attaches both the Bank Account and the Bucket middleware).
- Helpers called from behind the middleware, like `checkTransactionEdit`, may assume ownership is already settled.
- Modules that scope their own lookups anyway (Repayment storage, the figures and deletion loaders) keep doing so. That costs nothing, and it makes them safe to reuse elsewhere.
