# Log Transaction

## Design Decisions

- Amount is always positive. The `type` field determines whether it adds to or subtracts from the balance. This avoids negative-number input confusion.
- Date defaults to today but is user-editable. Common use case: logging a transaction from a prior day.
- The account balance is computed on read, so no stored balance needs updating when a transaction is created.

## Form Fields

### Type
  - **Type:** select (toggle)
  - **Required:** yes
  - **Label:** Type
  - **Placeholder:** —

  #### Validations
  | Rule | User Message |
  |------|-------------|
  | required | Please select a type. |

### Account
  - **Type:** select
  - **Required:** yes
  - **Label:** Account
  - **Placeholder:** Select account

  #### Validations
  | Rule | User Message |
  |------|-------------|
  | required | Please select an account. |

### Amount
  - **Type:** number
  - **Required:** yes
  - **Label:** Amount
  - **Placeholder:** 0

  #### Validations
  | Rule | User Message |
  |------|-------------|
  | required | Amount is required. |
  | greater than 0 | Amount must be greater than 0. |
  | max 2 decimal places | Amount can only have up to 2 decimal places. |

### Date
  - **Type:** date
  - **Required:** yes
  - **Label:** Date
  - **Placeholder:** [today]

  #### Validations
  | Rule | User Message |
  |------|-------------|
  | required | Date is required. |

### Note
  - **Type:** text
  - **Required:** no
  - **Label:** Note (optional)
  - **Placeholder:** Add a note…

  #### Validations
  None.

## Trigger

User clicks "New Transaction" from the account detail page or a global action.

## Behavior

1. Dialog opens with title "Log Transaction".
2. On submit:
   - Validates all fields (rules in Form Fields above).
   - Creates Transaction record.
3. Dialog closes. Account detail updates with new transaction.

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
