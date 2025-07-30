import { transactionTypeEnum } from "@/lib/schemas";
import z from "zod";

const bucketBaseSchema = {
	name: z
		.string()
		.min(1, "Bucket name is required")
		.max(100, "Bucket name must be 100 characters or less")
		.trim(),

	current_amount: z
		.number({
			required_error: "Current amount is required",
			invalid_type_error: "Current amount must be a number",
		})
		.transform((val) => Math.round(val * 100) / 100) // Round to 2 decimal places
		.refine(
			(val) => val >= -999999999.99 && val <= 999999999.99,
			"Amount must be between -999,999,999.99 and 999,999,999.99",
		),

	description: z
		.string()
		.max(500, "Description must be 500 characters or less")
		.trim()
		.optional()
		.nullable()
		.transform((val) => (val === "" ? null : val)), // Convert empty string to null

	is_active: z.boolean().default(true),
};

export const createBucketFormSchema = z.object({
	name: bucketBaseSchema.name,

	// Coerce string to number for HTML input[type="number"]
	current_amount: z.coerce
		.number({
			required_error: "Current amount is required",
			invalid_type_error: "Current amount must be a number",
		})
		.transform((val) => Math.round(val * 100) / 100)
		.refine(
			(val) => val >= -999999999.99 && val <= 999999999.99,
			"Amount must be between -999,999,999.99 and 999,999,999.99",
		)
		.default(0),

	description: bucketBaseSchema.description,
});

export const updateBucketFormSchema = z.object({
	id: z.string().uuid("Invalid Bucket ID"),
	name: bucketBaseSchema.name,
	description: bucketBaseSchema.description,
});

export const createTransactionFormSchema = z.object({
	bucket_id: z.string().uuid({ message: "Invalid bucket ID format" }),

	type: transactionTypeEnum,

	amount: z.coerce
		.number({
			required_error: "Amount is required",
			invalid_type_error: "Amount must be a valid number",
		})
		.positive({ message: "Amount must be greater than 0" })
		.multipleOf(0.01, {
			message: "Amount can only have up to 2 decimal places",
		})
		.max(9999999999.99, { message: "Amount cannot exceed 9,999,999,999.99" }),

	description: z
		.string()
		.max(500, { message: "Description cannot exceed 500 characters" })
		.optional()
		.transform((val) => val?.trim() || undefined),
});
