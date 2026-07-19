# Edit Allocation

## Design Decisions

- Only amount, date, and note are editable. Changing the source account would move money between accounts' unallocated pools — better handled as delete + re-create. Changing the bucket would change the allocation's target — same reasoning.
- Amount increase is capped by available unallocated at edit time, same as creation. Amount decrease is always safe because it returns money to the pool.

## Trigger

User clicks "Edit" on an allocation from the bucket detail or account detail page.

## Behavior

1. Dialog opens pre-filled with current values.
2. Editable fields: Amount, Date, Note.
3. Source Account and Bucket are not editable. To change either, delete and re-create.
4. On submit:
   - Amount decreased → always allowed (frees money back to unallocated).
   - Amount increased → compute the resulting unallocated. If negative, block with inline error: "Insufficient unallocated balance. Available: [amount]."
   - Date/note changed → always allowed, no balance impact.
5. Dialog closes. Views reflect changes.

## Toast

### Success Message

- **Title:** Allocation updated
- **Description:** The allocation has been saved.

### Error Message

- **Title:** Failed to update allocation
- **Description:** Please try again.

## Edge Cases

- Amount increased to exactly the available unallocated → allowed (results in 0 unallocated).
- No changes made → no-op, dialog closes.
- Date changed to a past or future date → allowed.
