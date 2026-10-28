import { z } from "zod";

import { amountSchema, hasAtMostTwoDecimals } from "#/lib/money";
import { computeDistributionPlan } from "#/modules/distributions/utils";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(100, "Name must be 100 characters or fewer");

const percentageSchema = z.codec(
  z.coerce
    .number()
    .min(0.01, "Percentage must be greater than 0.")
    .max(100, "Percentage can't be more than 100.")
    .refine(hasAtMostTwoDecimals, "Use at most 2 decimal places."),
  z.number().int(),
  {
    decode: (percentage) => Math.round(percentage * 100),
    encode: (basisPoints) => basisPoints / 100,
  },
);

const distributionLineSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("fixed"), value: amountSchema }),
  z.object({ mode: z.literal("percent"), value: percentageSchema }),
]);

export const createDistributionSchema = z
  .object({
    name: nameSchema,
    bankAccountId: z.string().min(1, "Select a bank account"),
    amount: amountSchema,
    lines: z
      .array(z.intersection(z.object({ bucketId: z.string().min(1) }), distributionLineSchema))
      .min(1, "Add at least one line."),
  })
  .superRefine((distribution, context) => {
    const bucketIds = distribution.lines.map((line) => line.bucketId);

    if (new Set(bucketIds).size !== bucketIds.length) {
      context.addIssue({
        code: "custom",
        path: ["lines"],
        message: "A bucket can only have one line.",
      });
    }

    const plan = computeDistributionPlan(
      distribution.lines.map((line) => ({
        id: line.bucketId,
        kind: "bucket" as const,
        value:
          line.mode === "fixed"
            ? { mode: "fixed" as const, cents: line.value }
            : { mode: "percent" as const, basisPoints: line.value },
      })),
      distribution.amount,
    );

    if (plan.exceedsBucketAndPayable) {
      context.addIssue({
        code: "custom",
        path: ["lines"],
        message: "Bucket lines can't add up to more than the default amount.",
      });
    }
  });

export const validateDistributionNameSchema = z.object({
  name: nameSchema,
  excludeId: z.string().optional(),
});
