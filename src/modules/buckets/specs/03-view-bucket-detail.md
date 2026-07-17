# View Bucket Detail

**Trigger:** User clicks a bucket row from the list.

**Content:**

- **Header:** Bucket name, per-currency subtotals displayed prominently (e.g., "500 QAR + 7800 PHP").
- **Allocations list:** Allocations to this bucket, grouped by source account. Each group shows the account name and currency, then individual allocations: date, amount, note. Newest first.
- **Future: Convert button** (P2) — calls an external currency converter API and displays the combined total in a selected currency.

**Design Decisions:**

- Per-currency subtotals are computed on read. No stored aggregate.
- Allocations are grouped by account so the user can see which account each portion came from. This is important for multi-currency buckets.
- The Convert button is P2 because it requires external API integration, a currency cache strategy, and a UI for selecting the target currency.

**Edge cases:**

- Bucket has no allocations → show empty state: "No allocations yet. [Allocate money to this bucket]".
- Bucket has allocations in 3+ currencies → subtotals list each currency on its own line.
