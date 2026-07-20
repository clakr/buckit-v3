# Create Bucket

## Design Decisions

- Name is the only field. Buckets have no currency — currency is determined by the source account when allocating.
- Unique per user to prevent accidental duplicates (two "Emergency Fund" buckets would be confusing).

## Form Fields

### Name
  - **Type:** text
  - **Required:** yes
  - **Label:** Name
  - **Placeholder:** e.g. Emergency Fund

  #### Validations
  | Rule | User Message |
  |------|-------------|
  | required, trimmed | Name is required. |
  | max 100 characters | Name must be 100 characters or fewer. |
  | unique per user | A bucket with this name already exists. |

## Trigger

User clicks "Add Bucket" button. A dialog opens.

## Behavior

1. Dialog opens with title "Add Bucket" and description "Create a bucket to organize your money."
2. On submit:
   - Validates Name (rules in Form Fields above).
   - Creates Bucket record with `userId` from authenticated session.
3. Dialog closes. Bucket appears in list.

## Toast

### Success Message

- **Title:** Bucket created
- **Description:** [name] has been created.

### Error Message

- **Title:** Failed to create bucket
- **Description:** Please try again.

## Edge Cases

- Name with special characters → allowed.
- Name exceeds 100 characters → prevented.
- Name already exists → inline error: "A bucket with this name already exists."
