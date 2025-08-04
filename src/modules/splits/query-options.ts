import { supabase } from "@/integrations/supabase";
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

// export function bucketQueryOption(id: Bucket["id"]) {
// 	return queryOptions({
// 		queryKey: ["buckets", id],
// 		queryFn: async () => {
// 			if (!id) return null;

// 			const { data } = await supabase
// 				.from("buckets")
// 				.select(`
// 					*,
// 					bucket_transactions (
// 						*
// 					)
// 				`)
// 				.eq("id", id)
// 				.order("created_at", {
// 					referencedTable: "bucket_transactions",
// 				})
// 				.single();

// 			return data;
// 		},
// 	});
// }
