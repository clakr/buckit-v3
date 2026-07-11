# View Accounts List

**Trigger:** User navigates to the accounts page or sees the accounts section on the dashboard.

**Content:**

- List/table of all accounts scoped to the current user.
- Each row shows: name, currency (with abbreviation/flag), computed balance (formatted per currency), date of last account entry, unallocated amount.
- Actions per row: View Detail, Edit, Delete.

**Sorting:** By name (alpha), by balance (asc/desc), by creation date (newest first). Default: by name.

**Empty State:**

```
┌─────────────────────────────────┐
│  No accounts yet                │
│  Add your first bank account    │
│  to start tracking.             │
│                                 │
│  [ + Add Account ]              │
└─────────────────────────────────┘
```

**Loading State:** 3–4 skeleton rows.

**Error State:** "Could not load accounts. [Retry]" with a retry button.
