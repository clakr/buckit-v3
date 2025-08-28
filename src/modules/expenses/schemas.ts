import { expenseStatusEnum } from "@/lib/schemas";
import z from "zod";

const expenseBaseSchema = z.object({
	id: z.string().uuid("Invalid Split ID"),

	name: z
		.string()
		.min(1, "Expense name is required")
		.max(100, "Expense name must be 100 characters or less")
		.trim(),

	description: z
		.string()
		.max(500, "Description must be 500 characters or less")
		.trim()
		.optional()
		.nullable()
		.transform((val) => (val === "" ? null : val)),

	status: expenseStatusEnum,
});

export const participantBaseSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("system"),
		email: z.string().email(),
	}),
	z.object({
		type: z.literal("external"),
		external_name: z.string(),
		external_identifier: z.string().optional(),
	}),
]);

export const createExpenseFormSchema = expenseBaseSchema.extend({
	participants: z.array(participantBaseSchema).min(1),
});

export const updateExpenseFormSchema = createExpenseFormSchema;
