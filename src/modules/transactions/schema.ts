import { z } from "zod";

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

export const logTransactionSchema = baseTransactionSchema.extend({
  bankAccountId: z.string().min(1, "Please select an account"),
});

export const editTransactionSchema = baseTransactionSchema.extend({
  transactionId: z.string().min(1, "Please select an transaction"),
});

export const validateEditTransactionSchema = z.object({
  bankAccountId: z.string().min(1, "There's no account"),
  transactionId: z.string().min(1, "There's no transaction"),
  type: transactionTypeEnum,
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
});
