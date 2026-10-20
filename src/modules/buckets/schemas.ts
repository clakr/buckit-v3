import { z } from "zod";

export const verifyUserBucketMiddlewareSchema = z.looseObject({
  bucketId: z.string().min(1, "No bucket ID provided"),
});

export const setUpBucketSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
});

export const editBucketSchema = z.strictObject({
  ...verifyUserBucketMiddlewareSchema.shape,
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
});

export const validateBucketNameSchema = z.object({
  name: setUpBucketSchema.shape.name,
  excludeId: z.string().optional(),
});
