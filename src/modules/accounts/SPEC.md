# Module Spec: Accounts

## Overview
An Account represents a real-world bank account. It has a single currency and its balance is computed from account entries — the user does not manually update it.

## Design Decisions

### User Ownership
`userId` is stored directly on the Account (FK → Users). Account Entries and Allocations do **not** store `userId` — they derive it through `accountId → Account.userId`. This keeps a single source of truth for ownership without redundant data.

### Starting Balance
The starting balance is stored **directly on the Account** as a plain field, **not** as an initial income transaction. This avoids a chicken-and-egg problem where the starting balance would need a Bucket to be assigned to before any Bucket exists.

**Balance formula:** `startingBalance + sum(income amounts) − sum(expense amounts)`

**Unallocated balance:** `account balance − sum(allocations from this account)`

A future "distribute starting balance" flow can auto-create allocations from the account's implicit unallocated pool into specific buckets, but that is P3.

### Immutable Currency
Once an Account is created, its `currency` cannot be changed. Existing entries were recorded in that currency and changing it would corrupt the ledger. If a user needs to track an account in a different currency, they should create a new Account.

### Immutable Starting Balance
Once an Account is created, its `startingBalance` cannot be changed. It represents a frozen point-in-time snapshot when the account was first added. To adjust, the user logs income/expense entries.

---

## User Flows

### 1. Create Account

**Trigger:** User clicks "Add Account" button (on dashboard or accounts list).

**Form:**
| Field | Type | Default | Required | Constraints |
|-------|------|---------|----------|-------------|
| Name | text | — | yes | 1–100 chars, trimmed, unique per user |
| Currency | select (dropdown) | — | yes | QAR, PHP (extensible later) |
| Starting Balance | number | 0 | yes | ≥ 0, max 2 decimal places |

**Behavior on submit:**
1. Validate all fields (inline errors for each).
2. Create Account record in DB with `userId` set from the authenticated user.
3. Navigate to the accounts list or account detail page.
4. Show success toast/notification.

**Edge cases:**
- Name already in use → show inline error "An account with this name already exists."
- Starting balance is 0 → still creates the account (valid empty account).
- Starting balance has >2 decimals → round to 2 or show error (decide per currency conventions).
- Very long name (>100) → truncate on input or show char counter.
- Special characters in name → allow; no restrictions other than length.

**UI States:**
- **Idle** — form ready to fill.
- **Submitting** — button shows spinner, fields disabled.
- **Validation error** — inline messages, form stays open.
- **Server error** — toast: "Failed to create account. Try again."
- **Success** — toast + redirect.

---

### 2. View Accounts List

**Trigger:** User navigates to the accounts page or sees the accounts section on the dashboard.

**Content:**
- List/table of all accounts scoped to the current user.
- Each row shows: name, currency (with abbreviation/flag), computed balance (formatted per currency), date of last account entry, unallocated amount.
- Actions per row: View Detail, Edit, Delete.

**Sorting:** By name (alpha), by balance (asc/desc), by creation date (newest first). Default: by name.

**Empty State:**
```
┌─────────────────────────────────┐
│  No accounts yet                │
│  Add your first bank account    │
│  to start tracking.             │
│                                 │
│  [ + Add Account ]              │
└─────────────────────────────────┘
```

**Loading State:** 3–4 skeleton rows.

**Error State:** "Could not load accounts. [Retry]" with a retry button.

---

### 3. View Account Detail

**Trigger:** User clicks an account row from the list.

**Content:**
- **Header:** Account name, currency badge, computed balance (large, formatted).
- **Edit / Delete** buttons in header (or overflow menu).
- **Tabs or sections:**
  1. **Account Entries** — list of all entries for this account, newest first. Each item shows: date, type badge (income/expense), amount (signed: + income, − expense). Paginated or infinite-scroll.
  2. **Allocations** — list of allocations from this account to buckets, newest first. Each item shows: date, bucket name, amount.
  3. **Summary** — computed balance, total allocated, unallocated (balance − allocated).

**Edge cases:**
- Account has 0 balance → show formatted 0. Summary shows 0 allocated, 0 unallocated.
- Account has no entries → entries tab shows empty state: "No entries yet. [Log your first entry]".
- Account has many entries → paginate, show count (e.g., "Showing 1–20 of 147 entries").

---

### 4. Edit Account

**Trigger:** User clicks "Edit" on an account row or from the account detail page.

**Form:** Same as Create, but pre-filled.

**Mutable fields:**
- Name (only field that can be changed).

**Immutable fields (shown but disabled):**
- Currency (never change — reason shown in tooltip: "Currency cannot be changed after creation.").
- Starting Balance (never change — reason shown in tooltip: "Change your balance by logging entries instead.").

**Behavior on submit:**
1. Validate name (same rules as create, including uniqueness — excluding the current account's own name).
2. Update Account record.
3. Show success toast.
4. Redirect back to previous page.

**Edge cases:**
- User changes name to same as another account → reject.
- User tries to submit no changes → treat as no-op, show toast "No changes made."

---

### 5. Delete Account

**Trigger:** User clicks "Delete" from account detail or accounts list.

**Gate:** Account must have **zero account entries and zero allocations**. Only a starting balance with no logged activity counts as clear.

**Flow:**
1. Show confirmation dialog:
   ```
   Delete "QNB Savings"?
   This account has 0 entries and 0 allocations. This action cannot be undone.
   [Cancel] [Delete]
   ```
2. If account has entries or allocations:
   ```
   Cannot delete "QNB Savings"
   Remove all entries and allocations first before deleting the account.
   [OK]
   ```
3. On confirm → delete Account record. Show toast "Account deleted."
4. Redirect to accounts list.

---

## Currency & Formatting

- Store amounts as a `number` (or `decimal` in DB). For JS, `number` is fine since we're not doing heavy math.
- Display amounts with the appropriate currency symbol:
  - QAR: `1,234.56 QAR`
  - PHP: `₱1,234.56`
- Input fields should accept values like `1234.56` (standard number input).
- Starting balance input: `type="number"`, `step="0.01"`, `min="0"`.

---

## Suggested Routes

| Route | Page |
|-------|------|
| `/accounts` | Accounts list |
| `/accounts/new` | Create account form |
| `/accounts/:id` | Account detail |
| `/accounts/:id/edit` | Edit account form |

(Conceptual; final routing depends on framework conventions.)
