# Create Account

## Design Decisions

- Starting balance is stored as a field on the account, not as an initial transaction. This avoids creating a synthetic income entry before any Bucket exists. The balance formula adds it directly: `startingBalance + income − expense`.
- Starting balance defaults to 0, not required as nonzero. An empty account can still receive transactions.

## Form Fields

### Name

- **Type:** text
- **Required:** yes
- **Label:** Name
- **Placeholder:** e.g. QNB Savings

#### Validations

| Rule               | User Message                              |
| ------------------ | ----------------------------------------- |
| required, trimmed  | Name is required.                         |
| max 100 characters | Name must be 100 characters or fewer.     |
| unique per user    | An account with this name already exists. |

### Currency

- **Type:** select
- **Required:** yes
- **Label:** Currency
- **Placeholder:** Select a currency

#### Validations

| Rule        | User Message                    |
| ----------- | ------------------------------- |
| required    | Please select a currency.       |
| valid value | Please select a valid currency. |

### Starting Balance

- **Type:** number
- **Required:** yes
- **Label:** Starting Balance
- **Placeholder:** 0

#### Validations

| Rule                 | User Message                                           |
| -------------------- | ------------------------------------------------------ |
| required             | Starting balance is required.                          |
| minimum 0            | Starting balance cannot be negative.                   |
| max 2 decimal places | Starting balance can only have up to 2 decimal places. |

## Trigger

User clicks "Add Account" button. A dialog opens.

## Behavior

1. Dialog opens with title "Add Account" and description "Enter the details of your bank account to start tracking."
2. On submit:
   - Validates all fields (rules in Form Fields above).
   - Creates BankAccount record with `userId` from authenticated session.
3. Dialog closes. Account appears in list.

## Toast

### Success Message

- **Title:** Account created
- **Description:** [name] has been added.

### Error Message

- **Title:** Failed to create account
- **Description:** Please try again.

## Edge Cases

- Starting balance = 0 → account is empty and ready for transactions. Valid.
- Name with special characters → allowed. No restriction beyond length and uniqueness.
- Name exceeds 100 characters → prevented by input maxLength or client validation.
- Name already exists → inline error: "An account with this name already exists."
- Starting balance with >2 decimals → rounded down to 2 decimal places on save.
