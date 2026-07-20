# Edit Bucket

## Design Decisions

- Only `name` is editable. Buckets have no other mutable fields.

## Form Fields

### Name
  - **Type:** text
  - **Required:** yes
  - **Label:** Name
  - **Placeholder:** [current name]

  #### Validations
  | Rule | User Message |
  |------|-------------|
  | required, trimmed | Name is required. |
  | max 100 characters | Name must be 100 characters or fewer. |
  | unique per user (excluding self) | A bucket with this name already exists. |

## Trigger

User clicks "Edit" on a bucket row or from the bucket detail page. A dialog opens pre-filled with the current name.

## Behavior

1. Dialog opens with title "Edit Bucket".
2. On submit:
   - Validates Name (rules in Form Fields above).
   - No changes made → no-op, dialog closes.
3. Dialog closes. List and detail reflect updated name.

## Toast

### Success Message

- **Title:** Bucket updated
- **Description:** [name] has been saved.

### Error Message

- **Title:** Failed to update bucket
- **Description:** Please try again.

## Edge Cases

- No changes → no-op, close dialog.
- Name changed to another bucket's name → "A bucket with this name already exists."
