import { supabase } from "@/integrations/supabase";
import { queryOptions } from "@tanstack/react-query";

export const expensesQueryOption = queryOptions({
	queryKey: ["expenses"],
	queryFn: async () => {
		const { error, data } = await supabase.from("expenses").select("*");

		if (error) throw error;

		return data;
	},
});
