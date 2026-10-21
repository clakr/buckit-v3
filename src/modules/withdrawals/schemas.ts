import { z } from "zod";

import { amountSchema } from "#/lib/money";
import { verifyUserBankAccountMiddlewareSchema } from "#/modules/bank-accounts/schemas";
import { verifyUserBucketMiddlewareSchema } from "#/modules/buckets/schemas";

export const verifyUserWithdrawalMiddlewareSchema = z.looseObject({
  withdrawalId: z.string().min(1, "No withdrawal ID provided"),
});

export const logWithdrawalSchema = z.strictObject({
  ...verifyUserBucketMiddlewareSchema.shape,
  ...verifyUserBankAccountMiddlewareSchema.shape,
  date: z.date(),
  note: z.string(),
  amount: amountSchema,
});

export const editWithdrawalSchema = z.strictObject({
  ...verifyUserWithdrawalMiddlewareSchema.shape,
  date: z.date(),
  note: z.string(),
  amount: amountSchema,
});
