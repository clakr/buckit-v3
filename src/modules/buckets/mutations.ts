import { supabase } from "@/integrations/supabase";
import type { Bucket } from "@/integrations/supabase/types";
import type {
	createBucketFormSchema,
	createTransactionFormSchema,
	updateBucketFormSchema,
} from "@/modules/buckets/schemas";
import { useMutation } from "@tanstack/react-query";
import type z from "zod";

export function useCreateBucketMutation() {
	return useMutation({
		mutationFn: async (payload: z.output<typeof createBucketFormSchema>) => {
			const { error } = await supabase.from("buckets").insert(payload);

			if (error) throw error;
		},
		meta: {
			errorTitle: "Failed to create bucket",
			successMessage: "Bucket created successfully",
			invalidatesQuery: ["buckets"],
		},
	});
}

export function useUpdateBucketMutation() {
	return useMutation({
		mutationFn: async ({
			id,
			...payload
		}: z.output<typeof updateBucketFormSchema>) => {
			const { error } = await supabase
				.from("buckets")
				.update(payload)
				.eq("id", id);

			if (error) throw error;
		},
		meta: {
			errorTitle: "Failed to update bucket",
			successMessage: "Bucket updated successfully",
			invalidatesQuery: ["buckets"],
		},
	});
}

export function useDeleteBucketMutation() {
	return useMutation({
		mutationFn: async (id: Bucket["id"]) => {
			const { error } = await supabase
				.from("buckets")
				.update({
					is_active: false,
				})
				.eq("id", id);

			if (error) throw error;
		},
		meta: {
			errorTitle: "Failed to delete bucket",
			successMessage: "Bucket deleted successfully",
			invalidatesQuery: ["buckets"],
		},
	});
}

export function useCreateTransactionMutation() {
	return useMutation({
		mutationFn: async (
			payload: z.output<typeof createTransactionFormSchema>,
		) => {
			const { error } = await supabase
				.from("bucket_transactions")
				.insert(payload);

			if (error) throw error;
		},
		meta: {
			errorTitle: "Failed to create transaction",
			successMessage: "Transaction created successfully",
			invalidatesQuery: ["buckets"],
		},
	});
}
