import { z } from "zod";

import { CURRENCIES_CODES } from "#/lib/constants";

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
  amount: z.coerce.number().min(0, "Amount cannot be negative.").default(0),
  name: z
    .string()
    .trim()
    .min(1, "Counterparty name is required")
    .max(100, "Counterparty name must be 100 characters or fewer"),
  bankAccountId: z.string().optional(),
});
