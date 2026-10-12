import { z } from "zod";

import { CURRENCIES_CODES } from "#/lib/constants";

import { verifyUserDebtMiddlewareSchema } from "../debts/schemas";

export const logRepaymentSchema = z.strictObject({
  ...verifyUserDebtMiddlewareSchema.shape,
  bankAccountId: z.string().nullable(),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0."),
  date: z.date(),
  note: z.string(),
});

export const validateRepaymentSourceBankAccountSchema = z.object({
  bankAccountId: z.string().min(1, "No bank account ID provided"),
  currency: z.enum(CURRENCIES_CODES),
});
