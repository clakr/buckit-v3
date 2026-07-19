# Log Transaction

## Design Decisions

- Amount is always positive. The `type` field determines whether it adds to or subtracts from the balance. This avoids negative-number input confusion.
- Date defaults to today but is user-editable. Common use case: logging a transaction from a prior day.
- The account balance is computed on read, so no stored balance needs updating when a transaction is created.

## Trigger

User clicks "New Transaction" from the account detail page or a global action.

## Behavior

1. Dialog opens with title "Log Transaction".
2. User fills in: Type (income/expense toggle), Account (select, pre-filled if triggered from account detail), Amount (number, positive), Date (date picker, defaults to today), Note (optional text).
3. On submit:
   - Type is required.
   - Account is required.
   - Amount is required, must be greater than 0, max 2 decimal places.
   - Date is required, defaults to today.
   - Creates Transaction record.
4. Dialog closes. Account detail updates with new transaction.

## Toast

### Success Message

- **Title:** Transaction logged
- **Description:** [type] of [amount] has been recorded.

### Error Message

- **Title:** Failed to log transaction
- **Description:** Please try again.

## Edge Cases

- Amount has more than 2 decimal places → rounded down to 2 on save.
- Date in the future → allowed. The user may want to schedule or log a future transaction.
- Account has 0 balance → transaction is still allowed. Balance becomes positive (income) or negative (expense can exceed balance—the app does not enforce a minimum balance).
