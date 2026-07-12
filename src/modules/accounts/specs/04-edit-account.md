# Edit Account

**Trigger:** User clicks "Edit" on an account row or from the account detail page. A dialog opens pre-filled with the current name.

**Dialog title:** "Edit Account"
**Dialog description:** "Update the name of your bank account."

**Form:**

| Field            | Type            | Notes                                   |
| ---------------- | --------------- | --------------------------------------- |
| Name             | text            | Editable. Pre-filled with current name. |
| Currency         | text (disabled) | Cannot be changed after creation.       |
| Starting Balance | text (disabled) | Cannot be changed after creation.       |

**Validation:**

| Field | Rule                                        | Message                                                |
| ----- | ------------------------------------------- | ------------------------------------------------------ |
| Name  | required                                    | "Name is required."                                    |
| Name  | max length: 100                             | "Name must be 100 characters or fewer."                |
| Name  | trimmed                                     | Leading and trailing spaces will be removed on submit. |
| Name  | unique per user (excluding current account) | "An account with this name already exists."            |

**Submit button:** "Save Changes"

**Behavior on submit:**

1. Validate name (same rules as create, excluding the current account's own name).
2. Update Account record.
3. Close dialog. Updates reflected in the list/detail.
4. Show success toast.

**Edge cases:**

- User submits without making changes → treat as no-op, show toast "No changes made." and close dialog.

**UI States:**

- **Idle** — form ready to fill, pre-filled with current values.
- **Submitting** — button shows spinner, fields disabled.
- **Validation error** — inline messages, form stays open.
- **Server error** — toast: "Failed to update account. Try again."
- **Success** — toast + close dialog.
