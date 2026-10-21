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

const editDebtDetailsShape = {
  ...verifyUserDebtMiddlewareSchema.shape,
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
  date: z.date(),
  note: z.string().trim(),
};

export const editDebtFormSchema = z.strictObject({
  ...editDebtDetailsShape,
  amount: amountSchema,
});

export const editDebtSchema = z.discriminatedUnion("direction", [
  z.strictObject({ ...editDebtDetailsShape, direction: z.literal("receivable") }),
  z.strictObject({
    ...editDebtDetailsShape,
    direction: z.literal("payable"),
    amount: amountSchema,
  }),
]);

export const deleteDebtSchema = z.strictObject({
  ...verifyUserDebtMiddlewareSchema.shape,
  deleteTransactions: z.boolean(),
});
