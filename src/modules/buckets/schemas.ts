import {
	MAXIMUM_CURRENCY_AMOUNT,
	MINIMUM_CURRENCY_AMOUNT,
} from "@/lib/constants";
import { transactionTypeEnum } from "@/lib/schemas";
import z from "zod";

const bucketBaseSchema = z.object({
	name: z
		.string()
		.min(1, "Bucket name is required")
		.max(100, "Bucket name must be 100 characters or less")
		.trim(),

	description: z
		.string()
		.max(500, "Description must be 500 characters or less")
		.trim()
		.optional()
		.nullable()
		.transform((val) => (val === "" ? null : val)),
});

export const createBucketFormSchema = bucketBaseSchema.extend({
	current_amount: z.coerce
		.number({
			error: (issue) =>
				issue.input === undefined
					? "Current amount is required"
					: "Current amount must be a valid number",
		})
		.min(MINIMUM_CURRENCY_AMOUNT, {
			error: `Current amount must be greater than ${MINIMUM_CURRENCY_AMOUNT}`,
		})
		.max(MAXIMUM_CURRENCY_AMOUNT, {
			error: `Current amount must be less than ${MAXIMUM_CURRENCY_AMOUNT}`,
		})
		.multipleOf(0.01, {
			error: "Current amount can only have up to 2 decimal places",
		}),
});

export const updateBucketFormSchema = bucketBaseSchema.extend({
	id: z.uuid("Invalid Bucket ID"),
});

export const createTransactionFormSchema = z.object({
	bucket_id: z.uuid({ error: "Invalid bucket ID format" }),

	type: transactionTypeEnum,

	amount: z.coerce
		.number({
			error: (issue) =>
				issue.input === undefined
					? "Amount is required"
					: "Amount must be a valid number",
		})
		.positive({ error: "Amount must be greater than 0" })
		.max(MAXIMUM_CURRENCY_AMOUNT, {
			error: `Amount cannot exceed ${MAXIMUM_CURRENCY_AMOUNT}`,
		})
		.multipleOf(0.01, {
			error: "Amount can only have up to 2 decimal places",
		}),

	description: z
		.string()
		.min(1, "Description is required")
		.max(500, { error: "Description cannot exceed 500 characters" }),
});
