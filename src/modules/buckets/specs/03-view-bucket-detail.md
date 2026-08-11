# View Bucket Detail

**Trigger:** User clicks a bucket row from the list.

**Content:**

- **Header:** Bucket name, per-currency subtotals displayed prominently (e.g., "500 QAR + 7800 PHP").
- **Allocations list:** Allocations to this bucket, grouped by source account. Each group shows the account name and currency, then individual allocations: date, amount, note. Newest first.
- **Future: Convert button** (P2) — calls an external currency converter API and displays the combined total in a selected currency.

**Design Decisions:**

- Per-currency subtotals are computed on read. No stored aggregate.
- Allocations are grouped by account so the user can see which account each portion came from. This is important for multi-currency buckets.
- If allocations span 3+ currencies, subtotals list each currency on its own line.
- The Convert button is P2 because it requires external API integration, a currency cache strategy, and a UI for selecting the target currency.

**Loading State:**

- **Title:** Loading bucket
- **Description:** Fetching bucket details and allocations…

**Error State:**

- **Not Found (404):**
  - **Title:** Bucket not found
  - **Description:** This bucket doesn't exist or may have been deleted.
  - **CTA:** "Go back to buckets" navigates to the buckets list.
- **Generic Failure:**
  - **Title:** Could not load bucket
  - **Description:** We weren't able to retrieve this bucket. Please check your connection and try again.
  - **CTA:** "Retry" refetches.
