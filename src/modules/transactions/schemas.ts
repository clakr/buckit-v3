import { z } from "zod";

import { amountSchema } from "#/lib/money";
import { verifyUserBankAccountMiddlewareSchema } from "#/modules/bank-accounts/schemas";

export const verifyUserTransactionMiddlewareSchema = z.looseObject({
  transactionId: z.string().min(1, "No transaction ID provided"),
});

export const transactionTypeEnum = z.enum(["income", "expense"], "Please select a valid type");

export const logTransactionSchema = z.strictObject({
  ...verifyUserBankAccountMiddlewareSchema.shape,
  type: transactionTypeEnum,
  amount: amountSchema,
  date: z.date(),
  note: z.string(),
});

export const editTransactionSchema = z.strictObject({
  ...verifyUserTransactionMiddlewareSchema.shape,
  type: transactionTypeEnum,
  amount: amountSchema,
  date: z.date(),
  note: z.string(),
});
