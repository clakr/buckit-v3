import { supabase } from "@/integrations/supabase";
import type { Split } from "@/integrations/supabase/types";
import type { createSplitFormSchema, updateSplitFormSchema } from "@/modules/splits/schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type z from "zod";

export function useCreateSplitMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: z.output<typeof createSplitFormSchema>) => {
			const { allocations, ...splitPayload } = payload;

			await supabase.from("splits").insert(splitPayload);
			await supabase.from("split_allocations").insert(allocations);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["splits"] });
		},
	});
}

export function useDistributeSplitMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: Split["id"]) =>
			await supabase.rpc("execute_split", {
				p_split_id: id,
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["buckets"],
			});
			await queryClient.invalidateQueries({
				queryKey: ["goals"],
			});
		},
	});
}

export function useUpdateSplitMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: z.output<typeof updateSplitFormSchema>) => {
			const { allocations, ...splitPayload } = payload;

			await supabase.from("splits").update(splitPayload).eq('id', payload.id);

			await supabase.from('split_allocations').delete().eq('split_id', payload.id);
			await supabase.from("split_allocations").insert(allocations);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["splits"] });
		},
	});
}
