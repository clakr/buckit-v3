import { supabase } from "@/integrations/supabase";
import type { Split } from "@/integrations/supabase/types";
import type {
	createSplitFormSchema,
	updateSplitFormSchema,
} from "@/modules/splits/schemas";
import { useMutation } from "@tanstack/react-query";
import type z from "zod";

export function useCreateSplitMutation() {
	return useMutation({
		mutationFn: async (payload: z.output<typeof createSplitFormSchema>) => {
			const { allocations, ...splitPayload } = payload;

			const { error: splitError } = await supabase
				.from("splits")
				.insert(splitPayload);

			if (splitError) throw splitError;

			const { error: allocationError } = await supabase
				.from("split_allocations")
				.insert(allocations);

			if (allocationError) throw allocationError;
		},
		meta: {
			errorTitle: "Failed to create split",
			successMessage: "Split created successfully",
			invalidatesQuery: ["splits"],
		},
	});
}

export function useDistributeSplitMutation() {
	return useMutation({
		mutationFn: async (id: Split["id"]) => {
			const { error } = await supabase.rpc("execute_split", {
				p_split_id: id,
			});

			if (error) throw error;
		},
		meta: {
			errorTitle: "Failed to distribute split",
			successMessage: "Split distributed successfully",
			invalidatesQuery: ["buckets", "goals"],
		},
	});
}

export function useUpdateSplitMutation() {
	return useMutation({
		mutationFn: async (payload: z.output<typeof updateSplitFormSchema>) => {
			const { allocations, ...splitPayload } = payload;

			const { error: splitError } = await supabase
				.from("splits")
				.update(splitPayload)
				.eq("id", payload.id);

			if (splitError) throw splitError;

			const { error: deleteAllocationError } = await supabase
				.from("split_allocations")
				.delete()
				.eq("split_id", payload.id);

			if (deleteAllocationError) throw deleteAllocationError;

			const { error: insertAllocationError } = await supabase
				.from("split_allocations")
				.insert(allocations);

			if (insertAllocationError) throw insertAllocationError;
		},
		meta: {
			errorTitle: "Failed to update split",
			successMessage: "Split updated successfully",
			invalidatesQuery: ["splits"],
		},
	});
}

export function useDeleteSplitMutation() {
	return useMutation({
		mutationFn: async (id: Split["id"]) => {
			const { error } = await supabase
				.from("splits")
				.update({
					is_active: false,
				})
				.eq("id", id);

			if (error) throw error;
		},
		meta: {
			errorTitle: "Failed to delete split",
			successMessage: "Split deleted successfully",
			invalidatesQuery: ["splits"],
		},
	});
}
