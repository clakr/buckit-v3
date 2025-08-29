import { supabase } from "@/integrations/supabase";
import { queryOptions } from "@tanstack/react-query";

export const profileQueryOption = queryOptions({
	queryKey: ["profiles"],
	queryFn: async () => {
		const {
			error: getUserError,
			data: { user },
		} = await supabase.auth.getUser();

		if (getUserError) throw getUserError;

		if (!user) throw new Error("No user found");

		const { error: profileError, data } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", user.id)
			.single();

		if (profileError) throw profileError;

		return data;
	},
});
