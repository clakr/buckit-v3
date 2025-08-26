import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAppForm } from "@/hooks/form";
import type { Bucket } from "@/integrations/supabase/types";
import { useUpdateBucketMutation } from "@/modules/buckets/mutations";
import { bucketQueryOption } from "@/modules/buckets/query-options";
import { updateBucketFormSchema } from "@/modules/buckets/schemas";
import {
	type BaseDialogStore,
	createDialogStore,
} from "@/stores/create-dialog-store";
import { Icon } from "@iconify/react";
import { useQuery } from "@tanstack/react-query";
import type z from "zod";
import { useShallow } from "zustand/react/shallow";

interface UpdateBucketDialogStore extends BaseDialogStore {
	bucketId: Bucket["id"] | null;
	setBucketId: (id: Bucket["id"] | null) => void;
}

export const useUpdateBucketDialogStore =
	createDialogStore<UpdateBucketDialogStore>((set) => ({
		bucketId: null,
		setBucketId: (id) => set({ bucketId: id }),
	}));

export function UpdateBucketDialog() {
	/**
	 * dialog state
	 */
	const { isOpen, handleToggle, bucketId } = useUpdateBucketDialogStore(
		useShallow((state) => ({
			isOpen: state.isOpen,
			handleToggle: state.handleToggle,
			bucketId: state.bucketId,
		})),
	);

	/**
	 * data fetching
	 */
	const {
		isLoading,
		error,
		data: bucket,
	} = useQuery({
		...bucketQueryOption(bucketId || ""),
		enabled: !!bucketId,
	});

	/**
	 * form
	 */
	const mutation = useUpdateBucketMutation();

	const defaultValues: z.input<typeof updateBucketFormSchema> = {
		id: "",
		name: "",
		description: "",
	};

	const form = useAppForm({
		defaultValues,
		validators: {
			onBlur: updateBucketFormSchema,
		},
		onSubmit: async ({ value }) => {
			const payload = updateBucketFormSchema.parse(value);

			mutation.mutate(payload);

			form.reset();

			handleToggle();
		},
	});

	if (isLoading) return <div>Loading...</div>;
	if (error) return <div>Error: {error.message}</div>;
	if (!bucket) return null;

	return (
		<Dialog open={isOpen} onOpenChange={handleToggle}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Update Bucket</DialogTitle>
					<DialogDescription>
						{/* todo: add update bucket description */}
					</DialogDescription>
				</DialogHeader>
				<form
					className="flex flex-col gap-y-4"
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						form.handleSubmit();
					}}
				>
					<form.AppField name="id" defaultValue={bucket.id}>
						{(field) => <field.Input label="ID" id="id" type="hidden" />}
					</form.AppField>
					<form.AppField name="name" defaultValue={bucket.name}>
						{(field) => <field.Input label="Name" id="name" type="text" />}
					</form.AppField>
					<form.AppField name="description" defaultValue={bucket.description}>
						{(field) => <field.Textarea label="Description" id="description" />}
					</form.AppField>
					<form.AppForm>
						<form.Button className="self-end">
							<Icon icon="bx:edit" />
							Update Bucket
						</form.Button>
					</form.AppForm>
				</form>
			</DialogContent>
		</Dialog>
	);
}
