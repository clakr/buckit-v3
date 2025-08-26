import { supabase } from "@/integrations/supabase";
import type { Goal } from "@/integrations/supabase/types";
import { queryOptions } from "@tanstack/react-query";

export const goalsQueryOption = queryOptions({
	queryKey: ["goals"],
	queryFn: async () => {
		const { error, data } = await supabase
			.from("goals")
			.select("*")
			.eq("is_active", true);

		if (error) throw error;

		return data;
	},
});

export function goalQueryOption(id: Goal["id"]) {
	return queryOptions({
		queryKey: ["goals", id],
		queryFn: async () => {
			if (!id) return null;

			const { data } = await supabase
				.from("goals")
				.select(`
					*, 
					goal_transactions (
						*
					)
				`)
				.eq("id", id)
				.order("created_at", {
					referencedTable: "goal_transactions",
					ascending: false,
				})
				.single();

			return data;
		},
	});
}
