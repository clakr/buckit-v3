import { z } from "zod";

import { verifyUserDebtMiddlewareSchema } from "../debts/schemas";

export const logRepaymentSchema = z.strictObject({
  ...verifyUserDebtMiddlewareSchema.shape,
  bankAccountId: z.string().nullable(),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0."),
  date: z.date(),
  note: z.string(),
});

// No `bankAccountId` — a repayment's account is fixed once logged; only what it
// recorded (amount/date/note) can be corrected.
export const editRepaymentSchema = z.strictObject({
  ...verifyUserDebtMiddlewareSchema.shape,
  repaymentId: z.string().min(1, "No repayment ID provided"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0."),
  date: z.date(),
  note: z.string(),
});
