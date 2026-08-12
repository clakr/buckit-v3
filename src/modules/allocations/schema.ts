import { z } from "zod";

export const baseAllocationSchema = z.object({
  date: z.date().min(1, "Date is required."),
  note: z.string(),
});

export const logAllocationSchema = baseAllocationSchema.extend({
  bankAccountId: z.string().min(1, "Please select a source account."),
  bucketId: z.string().min(1, "Please select a bucket."),
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
});

export const validateLogAllocationAmountSchema = z.object({
  bankAccountId: z.string().min(1, "There's no account"),
  amount: z.number(),
});

export const editAllocationSchema = baseAllocationSchema.extend({
  allocationId: z.string().min(1, "There's no allocation."),
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
});

export const validateEditAllocationAmountSchema = z.object({
  allocationId: z.string().min(1, "There's no allocation"),
  bankAccountId: z.string().min(1, "There's no account"),
  amount: z.number().min(1, "Amount must be greater than 0."),
});
