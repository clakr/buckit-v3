import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAppForm } from "@/hooks/form";
import type { Bucket } from "@/integrations/supabase/types";
import { useUpdateBucket } from "@/modules/buckets/mutations";
import { bucketQueryOption } from "@/modules/buckets/query-options";
import { editBucketFormSchema } from "@/modules/buckets/schemas";
import {
	type BaseDialogStore,
	createDialogStore,
} from "@/stores/create-dialog-store";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useQuery } from "@tanstack/react-query";
import type z from "zod";
import { useShallow } from "zustand/react/shallow";

interface EditBucketDialogStore extends BaseDialogStore {
	bucketId: Bucket["id"] | null;
	setBucketId: (id: Bucket["id"] | null) => void;
}

export const useEditBucketDialogStore =
	createDialogStore<EditBucketDialogStore>((set) => ({
		bucketId: null,
		setBucketId: (id) => set({ bucketId: id }),
	}));

export function EditBucketDialog() {
	/**
	 * dialog state
	 */
	const { isOpen, handleToggle, bucketId } = useEditBucketDialogStore(
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

	const mutation = useUpdateBucket();

	const defaultValues: z.input<typeof editBucketFormSchema> = {
		id: "",
		name: "",
		description: "",
	};

	const form = useAppForm({
		defaultValues,
		validators: {
			onBlur: editBucketFormSchema,
		},
		onSubmit: async ({ value }) => {
			const payload = editBucketFormSchema.parse(value);

			mutation.mutate(payload);

			handleToggle();
		},
	});

	if (isLoading) return <div>Loading...</div>;
	if (error) return <div>Error: {error.message}</div>;

	return (
		<Dialog open={isOpen} onOpenChange={handleToggle}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Bucket</DialogTitle>
					<DialogDescription>
						{/* todo: add edit bucket description */}
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
					<form.AppField name="id" defaultValue={bucket?.id}>
						{(field) => <field.Input label="ID" id="id" type="hidden" />}
					</form.AppField>
					<form.AppField name="name" defaultValue={bucket?.name}>
						{(field) => <field.Input label="Name" id="name" type="text" />}
					</form.AppField>
					<form.AppField name="description" defaultValue={bucket?.description}>
						{(field) => <field.Textarea label="Description" id="description" />}
					</form.AppField>
					<form.AppForm>
						<form.Button className="self-end">
							<Icon icon="bx:edit" />
							Edit Bucket
						</form.Button>
					</form.AppForm>
				</form>
			</DialogContent>
		</Dialog>
	);
}
