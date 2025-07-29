import { transactionTypeEnum } from "@/lib/schemas";
import z from "zod";

// Base schema for goals (similar to bucketBaseSchema)
const goalBaseSchema = {
	name: z
		.string()
		.min(1, "Goal name is required")
		.max(100, "Goal name must be 100 characters or less")
		.trim(),

	current_amount: z
		.number({
			required_error: "Current amount is required",
			invalid_type_error: "Current amount must be a number",
		})
		.transform((val) => Math.round(val * 100) / 100) // Round to 2 decimal places
		.refine(
			(val) => val >= 0 && val <= 999999999.99,
			"Amount must be between 0 and 999,999,999.99",
		),

	target_amount: z
		.number({
			required_error: "Target amount is required",
			invalid_type_error: "Target amount must be a number",
		})
		.positive("Target amount must be greater than 0")
		.transform((val) => Math.round(val * 100) / 100) // Round to 2 decimal places
		.refine(
			(val) => val > 0 && val <= 999999999.99,
			"Target amount must be between 0.01 and 999,999,999.99",
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

export const createGoalFormSchema = z
	.object({
		name: goalBaseSchema.name,

		// Coerce string to number for HTML input[type="number"]
		current_amount: z.coerce
			.number({
				required_error: "Current amount is required",
				invalid_type_error: "Current amount must be a number",
			})
			.transform((val) => Math.round(val * 100) / 100)
			.refine(
				(val) => val >= 0 && val <= 999999999.99,
				"Amount must be between 0 and 999,999,999.99",
			)
			.default(0),

		// Coerce string to number for HTML input[type="number"]
		target_amount: z.coerce
			.number({
				required_error: "Target amount is required",
				invalid_type_error: "Target amount must be a number",
			})
			.positive("Target amount must be greater than 0")
			.transform((val) => Math.round(val * 100) / 100)
			.refine(
				(val) => val > 0 && val <= 999999999.99,
				"Target amount must be between 0.01 and 999,999,999.99",
			),

		description: goalBaseSchema.description,
	})
	.refine((data) => data.target_amount >= data.current_amount, {
		message: "Target amount must be greater than or equal to current amount",
		path: ["target_amount"],
	});

// Edit goal form schema
export const editGoalFormSchema = z.object({
	id: z.string().uuid("Invalid Goal ID"),
	name: goalBaseSchema.name,

	// For edit, we might want to allow updating target amount
	target_amount: z.coerce
		.number({
			required_error: "Target amount is required",
			invalid_type_error: "Target amount must be a number",
		})
		.positive("Target amount must be greater than 0")
		.transform((val) => Math.round(val * 100) / 100)
		.refine(
			(val) => val > 0 && val <= 999999999.99,
			"Target amount must be between 0.01 and 999,999,999.99",
		),

	description: goalBaseSchema.description,
});

// Create goal transaction form schema
export const createGoalTransactionFormSchema = z.object({
	goal_id: z.string().uuid({ message: "Invalid goal ID format" }),

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
