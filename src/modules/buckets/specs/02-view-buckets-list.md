# View Buckets List

**Trigger:** User navigates to the buckets page.

**Content:**

- List of all Buckets scoped to the current user.
- Each row shows: name, per-currency subtotals (e.g., "500 QAR + 7800 PHP").
- Row actions: View Detail, Edit, Delete.
- Sortable by name (alpha), creation date (newest first). Default: by name.

**Design Decisions:**

- Per-currency subtotals are computed on read by joining Allocations → BankAccounts → currency and grouping by currency. No stored total.
- If a Bucket has no allocations, subtotals show nothing (or "—").

**Loading State:**
  - **Title:** Loading buckets
  - **Description:** Fetching your buckets…

**Error State:**
  - **Title:** Could not load buckets
  - **Description:** We weren't able to retrieve your buckets. Please try again.
  - **CTA:** "Retry" refetches the list.

**Empty State:**
  - **Title:** No buckets yet
  - **Description:** Create a bucket to start organizing your money.
  - **CTA:** "Add Bucket" opens the create dialog.
