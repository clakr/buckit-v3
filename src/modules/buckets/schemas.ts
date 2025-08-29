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
			required_error: "Current amount is required",
			invalid_type_error: "Current amount must be a valid number",
		})
		.min(MINIMUM_CURRENCY_AMOUNT, {
			message: `Current amount must be greater than ${MINIMUM_CURRENCY_AMOUNT}`,
		})
		.max(MAXIMUM_CURRENCY_AMOUNT, {
			message: `Current amount must be less than ${MAXIMUM_CURRENCY_AMOUNT}`,
		})
		.multipleOf(0.01, {
			message: "Current amount can only have up to 2 decimal places",
		}),
});

export const updateBucketFormSchema = bucketBaseSchema.extend({
	id: z.string().uuid("Invalid bucket ID"),
});

export const createTransactionFormSchema = z.object({
	bucket_id: z.string().uuid({ message: "Invalid bucket ID" }),

	type: transactionTypeEnum,

	amount: z.coerce
		.number({
			required_error: "Amount is required",
			invalid_type_error: "Amount must be a valid number",
		})
		.positive({ message: "Amount must be greater than 0" })
		.max(MAXIMUM_CURRENCY_AMOUNT, {
			message: `Amount cannot exceed ${MAXIMUM_CURRENCY_AMOUNT}`,
		})
		.multipleOf(0.01, {
			message: "Amount can only have up to 2 decimal places",
		}),

	description: z
		.string()
		.min(1, "Description is required")
		.max(500, { message: "Description cannot exceed 500 characters" }),
});
