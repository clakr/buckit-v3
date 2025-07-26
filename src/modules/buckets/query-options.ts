import { supabase } from "@/integrations/supabase";
import type { Bucket } from "@/integrations/supabase/types";
import { queryOptions } from "@tanstack/react-query";

export const bucketsQueryOption = queryOptions({
	queryKey: ["buckets"],
	queryFn: async () => {
		const { data } = await supabase.from("buckets").select("*");

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
				.select("*")
				.eq("id", id)
				.single();

			return data;
		},
	});
}
