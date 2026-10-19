import { z } from "zod";

import { CURRENCIES_CODES } from "#/lib/constants";
import { amountSchema } from "#/lib/money";

export const verifyUserDebtMiddlewareSchema = z.looseObject({
  debtId: z.string().min(1, "No debt ID provided"),
});

export const debtDirectionEnum = z.enum(
  ["receivable", "payable"],
  "Please select a valid direction",
);

export const recordDebtSchema = z.object({
  direction: debtDirectionEnum,
  currency: z.enum(CURRENCIES_CODES),
  amount: amountSchema.default(0),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
  bankAccountId: z.string().optional(),
  date: z.date(),
  note: z.string().trim(),
});

// `direction` is deliberately absent — it's fixed once a Debt is created. `amount` is
// optional because only a `payable`'s is editable; a `receivable`'s stays locked to what
// it was recorded with (see `editDebt`).
export const editDebtSchema = z.strictObject({
  ...verifyUserDebtMiddlewareSchema.shape,
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
  amount: amountSchema.optional(),
  date: z.date(),
  note: z.string().trim(),
});

// `deleteTransactions` is story 18's opt-in: off, only the Debt (and its repayments) go;
// on, every Transaction it links to is deleted too — real money leaving the history.
export const deleteDebtSchema = z.strictObject({
  ...verifyUserDebtMiddlewareSchema.shape,
  deleteTransactions: z.boolean(),
});
