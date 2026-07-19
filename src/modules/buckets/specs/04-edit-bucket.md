# Edit Bucket

## Design Decisions

- Only `name` is editable. Buckets have no other mutable fields.

## Trigger

User clicks "Edit" on a bucket row or from the bucket detail page. A dialog opens pre-filled with the current name.

## Behavior

1. Dialog opens with title "Edit Bucket".
2. Name field is editable (text, pre-filled).
3. On submit:
   - Name validated same as create (required, 1–100 chars, trimmed, unique per user excluding the current bucket's own name).
   - No changes made → no-op, dialog closes.
4. Dialog closes. List and detail reflect updated name.

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
