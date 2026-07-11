# Delete Account

**Trigger:** User clicks "Delete" from account detail or accounts list.

**Gate:** Account must have **zero account entries and zero allocations**. Only a starting balance with no logged activity counts as clear.

**Flow:**

1. Show confirmation dialog:
   ```
   Delete "QNB Savings"?
   This account has 0 entries and 0 allocations. This action cannot be undone.
   [Cancel] [Delete]
   ```
2. If account has entries or allocations:
   ```
   Cannot delete "QNB Savings"
   Remove all entries and allocations first before deleting the account.
   [OK]
   ```
3. On confirm → delete Account record. Show toast "Account deleted."
4. Redirect to accounts list.
