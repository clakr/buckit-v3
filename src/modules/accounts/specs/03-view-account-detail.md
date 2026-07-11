# View Account Detail

**Trigger:** User clicks an account row from the list.

**Content:**

- **Header:** Account name, currency badge, computed balance (large, formatted).
- **Edit / Delete** buttons in header (or overflow menu).
- **Tabs or sections:**
  1. **Account Entries** — list of all entries for this account, newest first. Each item shows: date, type badge (income/expense), amount (signed: + income, − expense). Paginated or infinite-scroll.
  2. **Allocations** — list of allocations from this account to buckets, newest first. Each item shows: date, bucket name, amount.
  3. **Summary** — computed balance, total allocated, unallocated (balance − allocated).

**Edge cases:**

- Account has 0 balance → show formatted 0. Summary shows 0 allocated, 0 unallocated.
- Account has no entries → entries tab shows empty state: "No entries yet. [Log your first entry]".
- Account has many entries → paginate, show count (e.g., "Showing 1–20 of 147 entries").
