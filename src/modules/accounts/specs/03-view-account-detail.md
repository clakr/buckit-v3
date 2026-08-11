# View Account Detail

**Trigger:** User clicks an account row from the list.

**Content:**

- **Header:** Account name, currency badge, computed balance (large, formatted).
- **Actions:** Edit and Delete buttons in header (or overflow menu).
- **Sections (stacked, single fetch):**
  1. **Summary** — computed balance, total allocated, unallocated (balance − allocated).
  2. **Transactions** — list of all transactions for this account, newest first. Each item: date, type badge (income/expense), amount, note. Paginated if > 20 items.
  3. **Allocations** — list of allocations from this account to buckets, newest first. Each item: date, bucket name, amount, note.

All three sections are fetched in a single request. Each section renders what it has — no per-section empty states.

**Loading State:**

- **Title:** Loading account
- **Description:** Fetching account details and history…

**Error State:**

- **Not Found (404):**
  - **Title:** Account not found
  - **Description:** This account doesn't exist or may have been deleted.
  - **CTA:** "Go back to accounts" navigates to the accounts list.
- **Generic Failure:**
  - **Title:** Could not load account
  - **Description:** We weren't able to retrieve this account. Please check your connection and try again.
  - **CTA:** "Retry" refetches.
