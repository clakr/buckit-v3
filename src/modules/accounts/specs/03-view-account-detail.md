# View Account Detail

**Trigger:** User clicks an account row from the list.

**Content:**

- **Header:** Account name, currency badge, computed balance (large, formatted).
- **Actions:** Edit and Delete buttons in header (or overflow menu).
- **Tabs:**
  1. **Transactions** — list of all transactions for this account, newest first. Each item: date, type badge (income/expense), amount, note. Paginated or infinite-scroll.
  2. **Allocations** — list of allocations from this account to buckets, newest first. Each item: date, bucket name, amount, note.
  3. **Summary** — computed balance, total allocated, unallocated (balance − allocated).

**Edge cases:**

- Balance is 0 → show formatted 0. Summary shows 0 allocated, 0 unallocated.
- No transactions → Transactions tab shows empty state: "No transactions yet."
- No allocations → Allocations tab shows empty state: "No allocations yet."
- Many transactions → paginate with count (e.g., "Showing 1–20 of 147").
