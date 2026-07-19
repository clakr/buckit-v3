# Edit Account

## Design Decisions

- Only `name` is editable. Currency is immutable because existing transactions were recorded in that currency. Starting balance is immutable because it represents a frozen point-in-time snapshot. To adjust balance, the user logs transactions.
- Uniqueness check excludes the current account's own name so the user can save without making changes.

## Trigger

User clicks "Edit" on an account row or from the account detail page. A dialog opens pre-filled with current values.

## Behavior

1. Dialog opens with title "Edit Account".
2. Name field is editable (text, pre-filled). Currency and Starting Balance are displayed but disabled — they cannot change after creation.
3. On submit:
   - Name validated same as create (required, 1–100 chars, trimmed, unique per user excluding the current account's own name).
   - No changes made → no-op, dialog closes.
4. Dialog closes. List and detail reflect updated name.

## Toast

### Success Message

- **Title:** Account updated
- **Description:** [name] has been saved.

### Error Message

- **Title:** Failed to update account
- **Description:** Please try again.

## Edge Cases

- User submits without changing anything → no-op, close dialog.
- Name changed to another account's name → "An account with this name already exists."
