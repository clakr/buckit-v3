import { z } from "zod";

import { amountSchema } from "#/lib/money";
import { verifyUserBankAccountMiddlewareSchema } from "#/modules/bank-accounts/schemas";
import { verifyUserBucketMiddlewareSchema } from "#/modules/buckets/schemas";

export const logWithdrawalSchema = z.strictObject({
  ...verifyUserBucketMiddlewareSchema.shape,
  ...verifyUserBankAccountMiddlewareSchema.shape,
  date: z.date(),
  note: z.string(),
  amount: amountSchema,
});
