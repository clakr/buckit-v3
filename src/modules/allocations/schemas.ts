import { z } from "zod";

import { amountSchema } from "#/lib/money";
import { verifyUserBankAccountMiddlewareSchema } from "#/modules/bank-accounts/schemas";

export const verifyUserAllocationMiddlewareSchema = z.looseObject({
  allocationId: z.string().min(1, "No allocation ID provided"),
});

export const logAllocationSchema = z.strictObject({
  ...verifyUserBankAccountMiddlewareSchema.shape,
  date: z.date(),
  note: z.string(),
  bucketId: z.string().min(1, "No bucket ID provided"),
  amount: amountSchema,
});

export const editAllocationSchema = z.strictObject({
  ...verifyUserAllocationMiddlewareSchema.shape,
  date: z.date(),
  note: z.string(),
  amount: amountSchema,
});
