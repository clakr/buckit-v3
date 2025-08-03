import { supabase } from "@/integrations/supabase";
import type { Bucket } from "@/integrations/supabase/types";
import { queryOptions } from "@tanstack/react-query";

export const bucketsQueryOption = queryOptions({
	queryKey: ["buckets"],
	queryFn: async () => {
		const { error, data } = await supabase
			.from("buckets")
			.select("*")
			.eq("is_active", true);

		if (error) throw error;

		return data;
	},
});

export function bucketQueryOption(id: Bucket["id"]) {
	return queryOptions({
		queryKey: ["buckets", id],
		queryFn: async () => {
			if (!id) return null;

			const { data } = await supabase
				.from("buckets")
				.select(`
					*, 
					bucket_transactions (
						*
					)
				`)
				.eq("id", id)
				.order("created_at", {
					referencedTable: "bucket_transactions",
				})
				.single();

			return data;
		},
	});
}
