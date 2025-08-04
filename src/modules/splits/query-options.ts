import { supabase } from "@/integrations/supabase";
import type { Split } from "@/integrations/supabase/types";
import { queryOptions } from "@tanstack/react-query";

export const splitsQueryOption = queryOptions({
	queryKey: ["splits"],
	queryFn: async () => {
		const { error, data } = await supabase
			.from("splits")
			.select("*")
			.eq("is_active", true);

		if (error) throw error;

		return data;
	},
});

export function splitQueryOption(id: Split["id"]) {
	return queryOptions({
		queryKey: ["splits", id],
		queryFn: async () => {
			if (!id) return null;

			const { data } = await supabase
				.from("splits")
				.select(`
					*,
					split_allocations (
						*
					)
				`)
				.eq("id", id)
				.order("created_at", {
					referencedTable: "split_allocations",
				})
				.single();

			return data;
		},
	});
}
