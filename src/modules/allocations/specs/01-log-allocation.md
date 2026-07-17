# Log Allocation

**Trigger:** User clicks "Allocate" from the bucket detail page or a global action.

**Behavior:**

1. Dialog opens with title "Allocate Money".
2. User fills in: Source Account (select), Bucket (select, pre-filled if triggered from bucket detail), Amount (number, positive), Date (date picker, defaults to today), Note (optional text).
3. On submit:
   - Source account is required.
   - Bucket is required.
   - Amount is required, must be greater than 0, max 2 decimal places.
   - Amount must not exceed the source account's current unallocated balance. If it does, inline error: "Insufficient unallocated balance in [account name]. Available: [amount]."
   - Date is required, defaults to today.
   - Creates Allocation record.
4. Dialog closes. Bucket detail updates with new allocation. Success toast.

**Design Decisions:**

- Amount is capped by the source account's current unallocated balance at the time of creation. This prevents allocating more than the account has available. The unallocated balance is computed as `account balance − sum(existing allocations from this account)`, not including the current allocation being created.
- No currency conversion fields. The amount is always in the source account's currency.

**Edge cases:**

- Source account has 0 unallocated → allocation is blocked. User must log income or reduce other allocations first.
- Amount exceeds unallocated → inline error showing available amount.
- Date in the future → allowed.

**UI States:**

- **Idle** — form ready to fill.
- **Submitting** — button shows spinner, fields disabled.
- **Validation error** — inline messages (including unallocated cap).
- **Server error** — toast: "Failed to log allocation. Try again."
- **Success** — toast + dialog closes.
