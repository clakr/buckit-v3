import { z } from "zod";

import { verifyUserBankAccountMiddlewareSchema } from "#/modules/bank-accounts/schemas";

import { verifyUserDebtMiddlewareSchema } from "../debts/schemas";

export const logRepaymentSchema = z.strictObject({
  ...verifyUserBankAccountMiddlewareSchema.shape,
  ...verifyUserDebtMiddlewareSchema.shape,
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0."),
  date: z.date(),
  note: z.string(),
});
