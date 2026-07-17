# Create Bucket

**Trigger:** User clicks "Add Bucket" button. A dialog opens.

**Behavior:**

1. Dialog opens with title "Add Bucket" and description "Create a bucket to organize your money."
2. User enters Name (text).
3. On submit:
   - Name is trimmed, validated as required (1–100 characters), unique per user.
   - Creates Bucket record with `userId` from authenticated session.
4. Dialog closes. Bucket appears in list. Success toast.

**Design Decisions:**

- Name is the only field. Buckets have no currency — currency is determined by the source account when allocating.
- Unique per user to prevent accidental duplicates (two "Emergency Fund" buckets would be confusing).

**Edge cases:**

- Name with special characters → allowed.
- Name exceeds 100 characters → prevented.
- Name already exists → inline error: "A bucket with this name already exists."

**UI States:**

- **Idle** — form ready to fill.
- **Submitting** — button shows spinner, fields disabled.
- **Validation error** — inline messages, form stays open.
- **Server error** — toast: "Failed to create bucket. Try again."
- **Success** — toast + dialog closes.
