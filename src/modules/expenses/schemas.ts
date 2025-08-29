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
		id: z.string().uuid("Invalid Participant ID"),
		expense_id: z.string().uuid("Invalid Expense ID"),
		type: z.literal("system"),

		user_id: z.string().uuid("Invalid user ID"),
		email: z.string().email(),
	}),
	z.object({
		id: z.string().uuid("Invalid Participant ID"),
		expense_id: z.string().uuid("Invalid Expense ID"),
		type: z.literal("external"),

		external_name: z.string(),
		external_identifier: z.string().optional(),
	}),
]);

export const createExpenseFormSchema = expenseBaseSchema.extend({
	participants: z.array(participantBaseSchema).min(1),
});

export const updateExpenseFormSchema = createExpenseFormSchema;

export type ParticipantData = z.infer<typeof participantBaseSchema>;

export function createEmptyParticipant(
	payload: Partial<ParticipantData>,
): ParticipantData {
	if (payload.type === "system") {
		return {
			id: crypto.randomUUID(),
			expense_id: "",
			type: "system" as const,
			user_id: "",
			email: "",
			...payload,
		};
	}

	return {
		id: crypto.randomUUID(),
		expense_id: "",
		type: "external" as const,
		external_name: "",
		...payload,
	};
}
