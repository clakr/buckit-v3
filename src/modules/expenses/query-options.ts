import { supabase } from "@/integrations/supabase";
import type { Expense } from "@/integrations/supabase/types";
import { queryOptions } from "@tanstack/react-query";

export const expensesQueryOption = queryOptions({
	queryKey: ["expenses"],
	queryFn: async () => {
		const { error, data } = await supabase.from("expenses").select("*");

		if (error) throw error;

		return data;
	},
});

export function expenseQueryOption(id: Expense["id"]) {
	return queryOptions({
		queryKey: ["expenses", id],
		queryFn: async () => {
			if (!id) return null;

			const { data } = await supabase
				.from("expenses")
				.select("*")
				.eq("id", id)
				.single();

			return data;
		},
	});
}
