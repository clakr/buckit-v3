import { supabase } from "@/integrations/supabase";
import type { updateProfileFormSchema } from "@/modules/profile/schemas";
import { useMutation } from "@tanstack/react-query";
import type z from "zod";

export function useUpdateProfileMutation() {
	return useMutation({
		mutationFn: async ({
			id,
			...payload
		}: z.output<typeof updateProfileFormSchema>) => {
			const { error } = await supabase
				.from("profiles")
				.update(payload)
				.eq("id", id);

			if (error) throw error;
		},
		meta: {
			errorTitle: "Failed to update profile",
			successMessage: "Profile updated successfully",
			invalidatesQuery: ["profiles"],
		},
	});
}
