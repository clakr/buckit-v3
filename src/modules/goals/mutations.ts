import { supabase } from "@/integrations/supabase";
import type { createGoalFormSchema } from "@/modules/goals/schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type z from "zod";

export function useCreateGoalMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: z.output<typeof createGoalFormSchema>) =>
			await supabase
				.from("goals")
				.insert({
					name: payload.name,
					description: payload.description,
					current_amount: payload.current_amount,
					target_amount: payload.target_amount,
				})
				.select(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["goals"] });
		},
	});
}
