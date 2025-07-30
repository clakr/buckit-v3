import { supabase } from "@/integrations/supabase";
import type { Goal } from "@/integrations/supabase/types";
import type {
	createGoalFormSchema,
	updateGoalFormSchema,
} from "@/modules/goals/schemas";
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

export function useUpdateGoalMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: z.output<typeof updateGoalFormSchema>) =>
			await supabase
				.from("goals")
				.update({
					name: payload.name,
					description: payload.description,
					target_amount: payload.target_amount,
				})
				.eq("id", payload.id)
				.select(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["goals"],
			});
		},
	});
}

export function useDeleteGoalMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: Goal["id"]) =>
			await supabase
				.from("goals")
				.update({
					is_active: false,
				})
				.eq("id", id),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["goals"] });
		},
	});
}
