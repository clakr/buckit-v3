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

			await supabase.from("splits").insert(splitPayload);
			await supabase.from("split_allocations").insert(allocations);
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
		mutationFn: async (id: Split["id"]) =>
			await supabase.rpc("execute_split", {
				p_split_id: id,
			}),
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

			await supabase.from("splits").update(splitPayload).eq("id", payload.id);

			await supabase
				.from("split_allocations")
				.delete()
				.eq("split_id", payload.id);
			await supabase.from("split_allocations").insert(allocations);
		},
		meta: {
			errorTitle: "Failed to update split",
			successMessage: "Split updated successfully",
			invalidatesQuery: ["splits"],
		},
	});
}
