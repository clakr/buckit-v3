# Log Transaction

## Design Decisions

- Amount is always positive. The `type` field determines whether it adds to or subtracts from the balance. This avoids negative-number input confusion.
- Date defaults to today but is user-editable. Common use case: logging a transaction from a prior day.
- The account balance is computed on read, so no stored balance needs updating when a transaction is created.
- An expense cannot exceed the account's available (unallocated) balance. This mirrors reality: an account's balance can never go below zero. To spend earmarked funds, the user must first release the allocation (reduce or delete it). Income is always allowed.

## Form Fields

### Type

- **Type:** select (toggle)
- **Required:** yes
- **Label:** Type
- **Placeholder:** —

#### Validations

| Rule     | User Message          |
| -------- | --------------------- |
| required | Please select a type. |

### Account

- **Type:** select
- **Required:** yes
- **Label:** Account
- **Placeholder:** Select account

#### Validations

| Rule     | User Message              |
| -------- | ------------------------- |
| required | Please select an account. |

### Amount

- **Type:** number
- **Required:** yes
- **Label:** Amount
- **Placeholder:** 0

#### Validations

| Rule                                                                  | User Message                                                           |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| required                                                              | Amount is required.                                                    |
| greater than 0                                                        | Amount must be greater than 0.                                         |
| max 2 decimal places                                                  | Amount can only have up to 2 decimal places.                           |
| expense must not exceed the account's available (unallocated) balance | Insufficient available balance in [account name]. Available: [amount]. |

### Date

- **Type:** date
- **Required:** yes
- **Label:** Date
- **Placeholder:** [today]

#### Validations

| Rule     | User Message      |
| -------- | ----------------- |
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
   - Validates all fields (rules in Form Fields above), including that an expense does not exceed the account's available (unallocated) balance.
   - Creates Transaction record.
3. Dialog closes. Account detail updates with new transaction.

## Toast

### Success Message

- **Title:** Transaction logged
- **Description:** [type] of [amount] has been recorded.

### Error Message

- **Title:** Failed to log transaction
- **Description:** Pease try again.

## Edge Cases

- Amount has more than 2 decimal places → rounded down to 2 on save.
- Date in the future → allowed. The user may want to schedule or log a future transaction.
- Account has 0 balance → income is allowed (balance becomes positive); expense is blocked with "Insufficient available balance in [account name]. Available: [amount]."
- Expense would exceed the account's available balance → blocked. The user must log income, or reduce/delete an allocation to free money, first.
