# Edit Transaction

## Design Decisions

- Account is not editable. Changing the account would move the transaction's balance effect to a different account, which is an uncommon operation better handled as delete + re-create.
- The unallocated check prevents a scenario where reducing income (or increasing expense) makes allocated funds no longer available. Example: account has 5000 balance, 4000 allocated. Editing income from 2000 to 500 would drop balance to 3500, making unallocated = 3500 − 4000 = −500. This is blocked.

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

### Amount
  - **Type:** number
  - **Required:** yes
  - **Label:** Amount
  - **Placeholder:** [current amount]

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
  - **Placeholder:** [current date]

  #### Validations
  | Rule | User Message |
  |------|-------------|
  | required | Date is required. |

### Note
  - **Type:** text
  - **Required:** no
  - **Label:** Note (optional)
  - **Placeholder:** [current note]

  #### Validations
  None.

## Trigger

User clicks "Edit" on a transaction from the account detail page.

## Behavior

1. Dialog opens pre-filled with current values.
2. Account is not editable. To move a transaction to a different account, delete and re-create.
3. On submit:
   - Validates all fields (rules in Form Fields above).
   - Compute the new account balance and unallocated as if the edit took effect.
   - If the resulting unallocated is negative, block with inline error: "This change would result in a negative unallocated balance. Adjust the amount or add more income first."
   - Otherwise, update the Transaction.
4. Dialog closes. Account detail reflects changes.

## Toast

### Success Message

- **Title:** Transaction updated
- **Description:** The [type] of [amount] has been updated.

### Error Message

- **Title:** Failed to update transaction
- **Description:** Please try again.

## Edge Cases

- Type changed from income to expense → the transaction's effect flips from +amount to −amount. Unallocated is recalculated and may trigger the block.
- Amount decreased but unallocated stays positive → allowed.
- No changes made → no-op, dialog closes.
