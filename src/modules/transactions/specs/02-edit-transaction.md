# Edit Transaction

## Design Decisions

- Account is not editable. Changing the account would move the transaction's balance effect to a different account, which is an uncommon operation better handled as delete + re-create.
- The unallocated check prevents a scenario where reducing income (or increasing expense) makes allocated funds no longer available. Example: account has 5000 balance, 4000 allocated. Editing income from 2000 to 500 would drop balance to 3500, making unallocated = 3500 − 4000 = −500. This is blocked.

## Trigger

User clicks "Edit" on a transaction from the account detail page.

## Behavior

1. Dialog opens pre-filled with current values.
2. Editable fields: Type (income/expense), Amount, Date, Note.
3. Account is not editable. To move a transaction to a different account, delete and re-create.
4. On submit:
   - Validate same rules as create.
   - Compute the new account balance and unallocated as if the edit took effect.
   - If the resulting unallocated is negative, block with inline error: "This change would result in a negative unallocated balance. Adjust the amount or add more income first."
   - Otherwise, update the Transaction.
5. Dialog closes. Account detail reflects changes.

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
