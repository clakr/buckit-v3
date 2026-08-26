import { z } from "zod";

import { verifyUserBankAccountMiddlewareSchema } from "#/modules/accounts/schemas";

export const verifyUserTransactionMiddlewareSchema = z.looseObject({
  transactionId: z.string().min(1, "No transaction ID provided"),
});

export const transactionTypeEnum = z.enum(
  ["income", "expense"],
  "Please select a valid type",
);

export const baseTransactionSchema = z.object({
  type: transactionTypeEnum,
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
  date: z.date().min(1, "Date is required."),
  note: z.string(),
});

export const logTransactionSchema = z.strictObject({
  ...verifyUserBankAccountMiddlewareSchema.shape,
  ...baseTransactionSchema.shape,
});

export const editTransactionSchema = z.strictObject({
  ...verifyUserTransactionMiddlewareSchema.shape,
  ...baseTransactionSchema.shape,
});

export const deleteTransactionSchema = z.strictObject({
  ...verifyUserTransactionMiddlewareSchema.shape,
});
