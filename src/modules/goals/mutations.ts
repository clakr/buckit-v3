import { supabase } from "@/integrations/supabase";
import type { Goal } from "@/integrations/supabase/types";
import type {
	createGoalFormSchema,
	createTransactionFormSchema,
	updateGoalFormSchema,
} from "@/modules/goals/schemas";
import { useMutation } from "@tanstack/react-query";
import type z from "zod";

export function useCreateGoalMutation() {
	return useMutation({
		mutationFn: async (payload: z.output<typeof createGoalFormSchema>) => {
			const { error } = await supabase.from("goals").insert(payload);

			if (error) throw error;
		},
		meta: {
			errorTitle: "Failed to create goal",
			successMessage: "Goal created successfully",
			invalidatesQuery: ["goals"],
		},
	});
}

export function useUpdateGoalMutation() {
	return useMutation({
		mutationFn: async ({
			id,
			...payload
		}: z.output<typeof updateGoalFormSchema>) => {
			const { error } = await supabase
				.from("goals")
				.update(payload)
				.eq("id", id);

			if (error) throw error;
		},
		meta: {
			errorTitle: "Failed to update goal",
			successMessage: "Goal updated successfully",
			invalidatesQuery: ["goals"],
		},
	});
}

export function useDeleteGoalMutation() {
	return useMutation({
		mutationFn: async (id: Goal["id"]) => {
			const { error } = await supabase
				.from("goals")
				.update({
					is_active: false,
				})
				.eq("id", id);

			if (error) throw error;
		},
		meta: {
			errorTitle: "Failed to delete goal",
			successMessage: "Goal deleted successfully",
			invalidatesQuery: ["goals"],
		},
	});
}

export function useCreateTransactionMutation() {
	return useMutation({
		mutationFn: async (
			payload: z.output<typeof createTransactionFormSchema>,
		) => {
			const { error } = await supabase
				.from("goal_transactions")
				.insert(payload);

			if (error) throw error;
		},
		meta: {
			errorTitle: "Failed to create transaction",
			successMessage: "Transaction created successfully",
			invalidatesQuery: ["goals"],
		},
	});
}
