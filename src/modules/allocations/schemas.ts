import { z } from "zod";

import { verifyUserBankAccountMiddlewareSchema } from "#/modules/accounts/schemas";

export const verifyUserAllocationMiddlewareSchema = z.looseObject({
  allocationId: z.string().min(1, "No allocation ID provided"),
});

export const baseAllocationSchema = z.object({
  date: z.date().min(1, "Date is required."),
  note: z.string(),
});

export const validateLogAllocationAmountSchema = z.object({
  ...verifyUserBankAccountMiddlewareSchema.shape,
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
});

export const logAllocationSchema = z.strictObject({
  ...verifyUserBankAccountMiddlewareSchema.shape,
  ...baseAllocationSchema.shape,
  bucketId: z.string().min(1, "No bucket ID provided"),
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
});

export const validateEditAllocationAmountSchema = z.object({
  ...verifyUserAllocationMiddlewareSchema.shape,
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
});

export const editAllocationSchema = z.strictObject({
  ...verifyUserAllocationMiddlewareSchema.shape,
  ...baseAllocationSchema.shape,
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
});
