import { z } from "zod";

import { verifyUserBankAccountMiddlewareSchema } from "#/modules/bank-accounts/schemas";

export const verifyUserAllocationMiddlewareSchema = z.looseObject({
  allocationId: z.string().min(1, "No allocation ID provided"),
});

export const logAllocationSchema = z.strictObject({
  ...verifyUserBankAccountMiddlewareSchema.shape,
  date: z.date(),
  note: z.string(),
  bucketId: z.string().min(1, "No bucket ID provided"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0."),
});

export const editAllocationSchema = z.strictObject({
  ...verifyUserAllocationMiddlewareSchema.shape,
  date: z.date(),
  note: z.string(),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0."),
});

// Neither: all of the user's Allocations. Either or both narrow it.
export const getAllocationsSchema = z.object({
  bucketId: z.string().optional(),
  bankAccountId: z.string().optional(),
});
