import { z } from "zod";

import { amountSchema } from "#/lib/money";

import { verifyUserDebtMiddlewareSchema } from "../debts/schemas";

export const logRepaymentSchema = z.strictObject({
  ...verifyUserDebtMiddlewareSchema.shape,
  bankAccountId: z.string().nullable(),
  amount: amountSchema,
  date: z.date(),
  note: z.string(),
});

export const editRepaymentSchema = z.strictObject({
  ...verifyUserDebtMiddlewareSchema.shape,
  repaymentId: z.string().min(1, "No repayment ID provided"),
  amount: amountSchema,
  date: z.date(),
  note: z.string(),
});
