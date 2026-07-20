import { z } from "zod";

export const transactionTypeEnum = z.enum(["income", "expense"], "Please select a valid type");

export const logTransactionSchema = z.object({
  bankAccountId: z.string(),
  type: transactionTypeEnum,
  amount: z.coerce.number().min(0, "Amount must be greater than 0."),
  date: z.date().min(1, "Date is required."),
  note: z.string(),
});
