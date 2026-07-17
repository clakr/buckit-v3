# Edit Bucket

**Trigger:** User clicks "Edit" on a bucket row or from the bucket detail page. A dialog opens pre-filled with the current name.

**Behavior:**

1. Dialog opens with title "Edit Bucket".
2. Name field is editable (text, pre-filled).
3. On submit:
   - Name validated same as create (required, 1–100 chars, trimmed, unique per user excluding the current bucket's own name).
   - No changes made → no-op, toast "No changes made.", dialog closes.
4. Dialog closes. List and detail reflect updated name. Success toast.

**Design Decisions:**

- Only `name` is editable. Buckets have no other mutable fields.

**Edge cases:**

- No changes → no-op, close dialog, toast "No changes made."
- Name changed to another bucket's name → "A bucket with this name already exists."

**UI States:**

- **Idle** — form pre-filled, ready to edit.
- **Submitting** — button shows spinner, fields disabled.
- **Validation error** — inline messages, form stays open.
- **Server error** — toast: "Failed to update bucket. Try again."
- **Success** — toast + dialog closes.
