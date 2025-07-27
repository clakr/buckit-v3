import { supabase } from "@/integrations/supabase";
import type { Bucket } from "@/integrations/supabase/types";
import type {
	createBucketFormSchema,
	createBucketTransactionFormSchema,
	editBucketFormSchema,
} from "@/modules/buckets/schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type z from "zod";

export function useCreateBucket() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: z.output<typeof createBucketFormSchema>) =>
			await supabase
				.from("buckets")
				.insert({
					name: payload.name,
					description: payload.description,
					current_amount: payload.current_amount,
				})
				.select(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["buckets"] });
		},
	});
}

export function useUpdateBucket() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: z.output<typeof editBucketFormSchema>) =>
			await supabase
				.from("buckets")
				.update({
					name: payload.name,
					description: payload.description,
				})
				.eq("id", payload.id)
				.select(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["buckets"],
			});
		},
	});
}

export function useDeleteBucket() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: Bucket["id"]) =>
			await supabase
				.from("buckets")
				.update({
					is_active: false,
				})
				.eq("id", id),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["buckets"] });
		},
	});
}

export function useCreateBucketTransaction() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			payload: z.output<typeof createBucketTransactionFormSchema>,
		) =>
			await supabase
				.from("bucket_transaction")
				.insert({
					bucket_id: payload.bucket_id,
					description: payload.description,
					amount: payload.amount,
					type: payload.type,
				})
				.select(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["buckets"],
			});
		},
	});
}
