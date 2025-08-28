import { supabase } from "@/integrations/supabase";
import type {
	createExpenseFormSchema,
	updateExpenseFormSchema,
} from "@/modules/expenses/schemas";
import { useMutation } from "@tanstack/react-query";
import type z from "zod";

export function useCreateExpenseMutation() {
	return useMutation({
		mutationFn: async (payload: z.output<typeof createExpenseFormSchema>) => {
			const { error: expenseError } = await supabase
				.from("expenses")
				.insert(payload);

			if (expenseError) throw expenseError;
		},
		meta: {
			errorTitle: "Failed to create expense",
			successMessage: "Expense created successfully",
			invalidatesQuery: ["expenses"],
		},
	});
}

export function useUpdateExpenseMutation() {
	return useMutation({
		mutationFn: async (payload: z.output<typeof updateExpenseFormSchema>) => {
			const { error: expenseError } = await supabase
				.from("expenses")
				.update(payload)
				.eq("id", payload.id);

			if (expenseError) throw expenseError;
		},
		meta: {
			errorTitle: "Failed to update expense",
			successMessage: "Expense updated successfully",
			invalidatesQuery: ["expenses"],
		},
	});
}
