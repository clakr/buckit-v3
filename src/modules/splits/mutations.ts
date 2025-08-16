import { supabase } from "@/integrations/supabase";
import type { createSplitFormSchema } from "@/modules/splits/schemas";
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
