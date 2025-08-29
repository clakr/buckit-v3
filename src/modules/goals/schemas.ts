import {
	MAXIMUM_CURRENCY_AMOUNT,
	MINIMUM_CURRENCY_AMOUNT,
} from "@/lib/constants";
import { transactionTypeEnum } from "@/lib/schemas";
import z from "zod";

const goalBaseSchema = z.object({
	name: z
		.string()
		.min(1, "Goal name is required")
		.max(100, "Goal name must be 100 characters or less")
		.trim(),

	description: z
		.string()
		.max(500, "Description must be 500 characters or less")
		.trim()
		.optional()
		.nullable()
		.transform((val) => (val === "" ? null : val)),
});

export const createGoalFormSchema = goalBaseSchema
	.extend({
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

		target_amount: z.coerce
			.number({
				required_error: "Target amount is required",
				invalid_type_error: "Target amount must be a valid number",
			})
			.positive("Target amount must be greater than 0")
			.max(MAXIMUM_CURRENCY_AMOUNT, {
				message: `Target amount must be less than ${MAXIMUM_CURRENCY_AMOUNT}`,
			})
			.multipleOf(0.01, {
				message: "Target amount can only have up to 2 decimal places",
			}),
	})
	.refine((data) => data.target_amount >= data.current_amount, {
		message: "Target amount must be greater than or equal to current amount",
		path: ["target_amount"],
	});

export const updateGoalFormSchema = goalBaseSchema.extend({
	id: z.string().uuid("Invalid goal ID"),

	target_amount: z.coerce
		.number({
			required_error: "Target amount is required",
			invalid_type_error: "Target amount must be a valid number",
		})
		.positive("Target amount must be greater than 0")
		.max(MAXIMUM_CURRENCY_AMOUNT, {
			message: `Target amount must be less than ${MAXIMUM_CURRENCY_AMOUNT}`,
		})
		.multipleOf(0.01, {
			message: "Target amount can only have up to 2 decimal places",
		}),
});

export const createTransactionFormSchema = z.object({
	goal_id: z.string().uuid({ message: "Invalid goal ID" }),

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
