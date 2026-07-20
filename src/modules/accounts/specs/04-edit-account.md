# Edit Account

## Design Decisions

- Only `name` is editable. Currency is immutable because existing transactions were recorded in that currency. Starting balance is immutable because it represents a frozen point-in-time snapshot. To adjust balance, the user logs transactions.
- Uniqueness check excludes the current account's own name so the user can save without making changes.

## Form Fields

### Name

- **Type:** text
- **Required:** yes
- **Label:** Name
- **Placeholder:** [current name]

#### Validations

| Rule                             | User Message                              |
| -------------------------------- | ----------------------------------------- |
| required, trimmed                | Name is required.                         |
| max 100 characters               | Name must be 100 characters or fewer.     |
| unique per user (excluding self) | An account with this name already exists. |

## Trigger

User clicks "Edit" on an account row or from the account detail page. A dialog opens pre-filled with current values.

## Behavior

1. Dialog opens with title "Edit Account".
2. On submit:
   - Validates Name (rules in Form Fields above).
   - No changes made → no-op, dialog closes.
3. Dialog closes. List and detail reflect updated name.

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
