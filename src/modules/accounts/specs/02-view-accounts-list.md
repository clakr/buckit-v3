# View Accounts List

**Trigger:** User navigates to the accounts page.

**Content:**

- Table or list of all BankAccounts scoped to the current user.
- Each row shows: name, currency badge, computed balance (formatted per currency), unallocated amount.
- Row actions: View Detail, Edit, Delete.
- Sortable by name (alpha), balance (asc/desc), creation date (newest first). Default: by name.

**Design Decisions:**

- Balance is computed client-side from `startingBalance + income − expense`, not stored. The server returns the starting balance and transaction aggregates; the UI does the math.
- Unallocated is computed as `balance − sum(allocations from this account)`.

**Empty state:**

```
No accounts yet
Add your first bank account to start tracking.
[ + Add Account ]
```

**Loading state:** 3–4 skeleton rows.

**Error state:** "Could not load accounts. [Retry]" with retry button.
