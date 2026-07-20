# Log Allocation

## Design Decisions

- Amount is capped by the source account's current unallocated balance at the time of creation. This prevents allocating more than the account has available. The unallocated balance is computed as `account balance − sum(existing allocations from this account)`, not including the current allocation being created.
- No currency conversion fields. The amount is always in the source account's currency.

## Form Fields

### Source Account
  - **Type:** select
  - **Required:** yes
  - **Label:** Source Account
  - **Placeholder:** Select account

  #### Validations
  | Rule | User Message |
  |------|-------------|
  | required | Please select a source account. |

### Bucket
  - **Type:** select
  - **Required:** yes
  - **Label:** Bucket
  - **Placeholder:** Select bucket

  #### Validations
  | Rule | User Message |
  |------|-------------|
  | required | Please select a bucket. |

### Amount
  - **Type:** number
  - **Required:** yes
  - **Label:** Amount
  - **Placeholder:** 0

  #### Validations
  | Rule | User Message |
  |------|-------------|
  | required | Amount is required. |
  | greater than 0 | Amount must be greater than 0. |
  | max 2 decimal places | Amount can only have up to 2 decimal places. |
  | must not exceed account's unallocated balance | Insufficient unallocated balance in [account name]. Available: [amount]. |

### Date
  - **Type:** date
  - **Required:** yes
  - **Label:** Date
  - **Placeholder:** [today]

  #### Validations
  | Rule | User Message |
  |------|-------------|
  | required | Date is required. |

### Note
  - **Type:** text
  - **Required:** no
  - **Label:** Note (optional)
  - **Placeholder:** Add a note…

  #### Validations
  None.

## Trigger

User clicks "Allocate" from the bucket detail page or a global action.

## Behavior

1. Dialog opens with title "Allocate Money".
2. On submit:
   - Validates all fields (rules in Form Fields above).
   - Creates Allocation record.
3. Dialog closes. Bucket detail updates with new allocation.

## Toast

### Success Message

- **Title:** Allocation logged
- **Description:** [amount] allocated to [bucket name].

### Error Message

- **Title:** Failed to log allocation
- **Description:** Please try again.

## Edge Cases

- Source account has 0 unallocated → allocation is blocked. User must log income or reduce other allocations first.
- Amount exceeds unallocated → inline error showing available amount.
- Date in the future → allowed.
