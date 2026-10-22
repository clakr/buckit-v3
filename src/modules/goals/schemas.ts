import { startOfToday, subHours } from "date-fns";
import { z } from "zod";

import { CURRENCIES_CODES } from "#/lib/constants";
import { amountSchema } from "#/lib/money";
import { setUpBucketSchema, verifyUserBucketMiddlewareSchema } from "#/modules/buckets/schemas";

export const goalTargetSchema = z.strictObject({
  targetAmount: amountSchema,
  currency: z.enum(CURRENCIES_CODES, "Please select a currency"),
  targetDate: z
    .date()
    .nullable()
    // The picked date is the client's local midnight, which can fall on the server's (UTC)
    // yesterday by up to 14 hours (UTC+14). The picker itself blocks dates before local today.
    .refine((date) => date === null || date >= subHours(startOfToday(), 14), {
      message: "Target date must be today or later",
    }),
});

export const addGoalSchema = z.strictObject({
  ...verifyUserBucketMiddlewareSchema.shape,
  ...goalTargetSchema.shape,
});

export const setUpBucketWithGoalSchema = setUpBucketSchema.extend({
  goal: goalTargetSchema.nullable(),
});
