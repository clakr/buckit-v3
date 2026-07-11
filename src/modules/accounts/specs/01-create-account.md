# Create Account

**Trigger:** User clicks "Add Account" button. A dialog opens.

**Dialog title:** "Add Bank Account"
**Dialog description:** "Enter the details of your bank account to start tracking."

**Form:**

| Field            | Type              | Default | Required |
| ---------------- | ----------------- | ------- | -------- |
| Name             | text              | —       | yes      |
| Currency         | select (dropdown) | —       | yes      |
| Starting Balance | number            | 0       | yes      |

**Validation:**

| Field            | Rule                 | Message                                                  |
| ---------------- | -------------------- | -------------------------------------------------------- |
| Name             | required             | "Name is required."                                      |
| Name             | max length: 100      | "Name must be 100 characters or fewer."                  |
| Name             | trimmed              | Leading and trailing spaces will be removed on submit.   |
| Name             | unique per user      | "An account with this name already exists."              |
| Currency         | required             | "Please select a currency."                              |
| Currency         | valid value          | "Please select a valid currency."                        |
| Starting Balance | required             | "Starting balance is required."                          |
| Starting Balance | minimum: 0           | "Starting balance cannot be negative."                   |
| Starting Balance | max 2 decimal places | "Starting balance can only have up to 2 decimal places." |

**Submit button:** "Add Account"

**Behavior on submit:**

1. Validate all fields (inline errors for each).
2. Create Account record in DB with `userId` set from the authenticated user.
3. Close dialog. Account appears in the list.
4. Show success toast.

**UI States:**

- **Idle** — form ready to fill.
- **Submitting** — button shows spinner, fields disabled.
- **Validation error** — inline messages, form stays open.
- **Server error** — toast: "Failed to create account. Try again."
- **Success** — toast + close dialog.
