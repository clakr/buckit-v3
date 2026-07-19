# Delete Account

## Design Decisions

- Delete is blocked when the account has any data. Cascade delete is intentionally avoided — the user must explicitly clean up first, preventing accidental data loss.
- Transfers to other accounts mean the account has transactions. The user must delete those transactions (and the paired transfer on the other account) before deleting.

## Trigger

User clicks "Delete" from the account list or account detail page.

## Behavior

1. Check if account has any Transactions or Allocations.
2. If account has zero Transactions and zero Allocations:
   - Show confirmation dialog: "Delete [account name]? This account has 0 transactions and 0 allocations. This action cannot be undone."
   - On confirm → delete BankAccount. Redirect to accounts list.
3. If account has Transactions or Allocations:
   - Show blocking dialog: "Cannot delete [account name]. Remove all transactions and allocations first before deleting the account."
   - User must manually delete all Transactions and Allocations referencing this account before retrying.

## Toast

### Success Message

- **Title:** Account deleted
- **Description:** [name] has been removed.

### Error Message

- **Title:** Failed to delete account
- **Description:** Please try again.

## Edge Cases

- Starting balance only with no activity → account is deletable (zero transactions, zero allocations).
- Account still used in allocations → blocked. Allocations must be deleted individually first.
