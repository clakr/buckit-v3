import { supabase } from "@/integrations/supabase";
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
