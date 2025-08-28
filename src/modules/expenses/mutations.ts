import { supabase } from "@/integrations/supabase";
import type { createExpenseFormSchema } from "@/modules/expenses/schemas";
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
