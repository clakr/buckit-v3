import { z } from "zod";

export const baseAllocationSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
  date: z.date().min(1, "Date is required."),
  note: z.string(),
});

export const logAllocationSchema = baseAllocationSchema.extend({
  bankAccountId: z.string().min(1, "Please select a source account."),
  bucketId: z.string().min(1, "Please select a bucket."),
});

export const validateAllocationAmountSchema = z.object({
  bankAccountId: z.string().min(1, "There's no account"),
  amount: z.number(),
});
