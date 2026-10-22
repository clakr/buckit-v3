import { startOfToday, subHours } from "date-fns";
import { z } from "zod";

import { CURRENCIES_CODES } from "#/lib/constants";
import { amountSchema } from "#/lib/money";
import { setUpBucketSchema, verifyUserBucketMiddlewareSchema } from "#/modules/buckets/schemas";

export const TARGET_DATE_IN_PAST_MESSAGE = "Target date must be today or later";

// The picked date is the client's local midnight, which can fall on the server's (UTC)
// yesterday by up to 14 hours (UTC+14). The picker itself blocks dates before local today.
export function isTargetDateTodayOrLater(date: Date) {
  return date >= subHours(startOfToday(), 14);
}

export const goalTargetSchema = z.strictObject({
  targetAmount: amountSchema,
  currency: z.enum(CURRENCIES_CODES, "Please select a currency"),
  targetDate: z
    .date()
    .nullable()
    .refine((date) => date === null || isTargetDateTodayOrLater(date), {
      message: TARGET_DATE_IN_PAST_MESSAGE,
    }),
});

export const verifyUserGoalMiddlewareSchema = z.looseObject({
  goalId: z.string().min(1, "No goal ID provided"),
});

export const addGoalSchema = z.strictObject({
  ...verifyUserBucketMiddlewareSchema.shape,
  ...goalTargetSchema.shape,
});

export const setUpBucketWithGoalSchema = setUpBucketSchema.extend({
  goal: goalTargetSchema.nullable(),
});

// No date rule here: an Overdue Goal keeps its past date when only the amount changes, so the
// server checks the date only when it differs from the stored one.
export const editGoalSchema = z.strictObject({
  ...verifyUserGoalMiddlewareSchema.shape,
  targetAmount: amountSchema,
  targetDate: z.date().nullable(),
});
