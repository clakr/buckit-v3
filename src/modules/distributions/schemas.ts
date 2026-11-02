import { z } from "zod";

import { amountSchema, hasAtMostTwoDecimals } from "#/lib/money";
import {
  computeDistributionPlan,
  getLineTargetId,
  getPlanLineKind,
} from "#/modules/distributions/utils";

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

const bucketLineTargetSchema = z.object({ kind: z.literal("bucket"), bucketId: z.string().min(1) });
const debtLineTargetSchema = z.object({ kind: z.literal("debt"), debtId: z.string().min(1) });

const distributionLineTargetSchema = z.discriminatedUnion("kind", [
  bucketLineTargetSchema,
  debtLineTargetSchema,
]);

const formLineTargetSchema = z.discriminatedUnion("kind", [
  bucketLineTargetSchema,
  debtLineTargetSchema.extend({ direction: z.enum(["receivable", "payable"]) }),
]);

export const verifyUserDistributionMiddlewareSchema = z.looseObject({
  distributionId: z.string().min(1, "No distribution ID provided"),
});

const distributionFieldsSchema = z.object({
  name: nameSchema,
  amount: amountSchema,
  lines: z
    .array(z.intersection(distributionLineTargetSchema, distributionLineSchema))
    .min(1, "Add at least one line."),
});

function refineUniqueLineTargets(
  distribution: { lines: z.output<typeof distributionLineTargetSchema>[] },
  context: z.RefinementCtx,
) {
  const bucketIds = distribution.lines.flatMap((line) =>
    line.kind === "bucket" ? [line.bucketId] : [],
  );
  const debtIds = distribution.lines.flatMap((line) => (line.kind === "debt" ? [line.debtId] : []));

  if (new Set(bucketIds).size !== bucketIds.length) {
    context.addIssue({
      code: "custom",
      path: ["lines"],
      message: "A bucket can only have one line.",
    });
  }
  if (new Set(debtIds).size !== debtIds.length) {
    context.addIssue({
      code: "custom",
      path: ["lines"],
      message: "A debt can only have one line.",
    });
  }
}

const distributionFormFieldsSchema = z.object({
  ...distributionFieldsSchema.shape,
  bankAccountId: z.string().min(1, "Select a bank account"),
  lines: z
    .array(z.intersection(formLineTargetSchema, distributionLineSchema))
    .min(1, "Add at least one line."),
});

function refineDistributionFormRules(
  distribution: z.output<typeof distributionFormFieldsSchema>,
  context: z.RefinementCtx,
) {
  refineUniqueLineTargets(distribution, context);

  const plan = computeDistributionPlan(
    distribution.lines.map((line) => ({
      id: getLineTargetId(line),
      kind: getPlanLineKind(line),
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
      message: "Bucket and payable lines can't add up to more than the default amount.",
    });
  }
  if (plan.exceedsReceivable) {
    context.addIssue({
      code: "custom",
      path: ["lines"],
      message: "Receivable lines can't add up to more than the default amount.",
    });
  }
}

export const createDistributionFormSchema = distributionFormFieldsSchema.superRefine(
  refineDistributionFormRules,
);

export const createDistributionSchema = distributionFieldsSchema
  .extend({ bankAccountId: z.string().min(1, "Select a bank account") })
  .superRefine(refineUniqueLineTargets);

export const editDistributionSchema = z
  .strictObject({
    ...verifyUserDistributionMiddlewareSchema.shape,
    ...distributionFieldsSchema.shape,
  })
  .superRefine(refineUniqueLineTargets);

export const validateDistributionNameSchema = z.object({
  name: nameSchema,
  excludeId: z.string().optional(),
});

export const triggerDistributionSchema = z.strictObject({
  ...verifyUserDistributionMiddlewareSchema.shape,
  amount: amountSchema,
});
