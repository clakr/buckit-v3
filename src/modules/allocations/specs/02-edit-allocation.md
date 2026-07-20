# Edit Allocation

## Design Decisions

- Only amount, date, and note are editable. Changing the source account would move money between accounts' unallocated pools — better handled as delete + re-create. Changing the bucket would change the allocation's target — same reasoning.
- Amount increase is capped by available unallocated at edit time, same as creation. Amount decrease is always safe because it returns money to the pool.

## Form Fields

### Amount

- **Type:** number
- **Required:** yes
- **Label:** Amount
- **Placeholder:** [current amount]

#### Validations

| Rule                                                                             | User Message                                           |
| -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| required                                                                         | Amount is required.                                    |
| greater than 0                                                                   | Amount must be greater than 0.                         |
| max 2 decimal places                                                             | Amount can only have up to 2 decimal places.           |
| increase must not exceed account's unallocated balance (decrease always allowed) | Insufficient unallocated balance. Available: [amount]. |

### Date

- **Type:** date
- **Required:** yes
- **Label:** Date
- **Placeholder:** [current date]

#### Validations

| Rule     | User Message      |
| -------- | ----------------- |
| required | Date is required. |

### Note

- **Type:** text
- **Required:** no
- **Label:** Note (optional)
- **Placeholder:** [current note]

#### Validations

None.

## Trigger

User clicks "Edit" on an allocation from the bucket detail or account detail page.

## Behavior

1. Dialog opens pre-filled with current values.
2. Source Account and Bucket are not editable. To change either, delete and re-create.
3. On submit:
   - Validates all fields (rules in Form Fields above).
   - Amount decreased → always allowed (frees money back to unallocated).
   - Amount increased → compute the resulting unallocated. If negative, block with inline error: "Insufficient unallocated balance. Available: [amount]."
   - Date/note changed → always allowed, no balance impact.
4. Dialog closes. Views reflect changes.

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
