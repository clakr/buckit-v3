# Create Account

## Design Decisions

- Starting balance is stored as a field on the account, not as an initial transaction. This avoids creating a synthetic income entry before any Bucket exists. The balance formula adds it directly: `startingBalance + income − expense`.
- Starting balance defaults to 0, not required as nonzero. An empty account can still receive transactions.

## Trigger

User clicks "Add Account" button. A dialog opens.

## Behavior

1. Dialog opens with title "Add Account" and description "Enter the details of your bank account to start tracking."
2. User fills in: Name (text), Currency (select dropdown), Starting Balance (number, defaults to 0).
3. On submit:
   - Name is trimmed, validated as required (1–100 characters), unique per user.
   - Currency is required, must be a valid value.
   - Starting balance is required, minimum 0, max 2 decimal places (rounds down on save).
   - Creates BankAccount record with `userId` from authenticated session.
4. Dialog closes. Account appears in list.

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
