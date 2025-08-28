import { StateTemplate } from "@/components/states-template";
import { Button } from "@/components/ui/button";
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
import type { PropsWithChildren } from "react";
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

	function handleOnOpenChange() {
		form.reset();
		handleToggle();
	}

	/**
	 * data fetching
	 */
	const {
		isLoading,
		error,
		refetch,
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
			onChange: updateBucketFormSchema,
		},
		onSubmit: async ({ value }) => {
			const payload = updateBucketFormSchema.parse(value);

			mutation.mutate(payload);

			form.reset();

			handleToggle();
		},
	});

	function DialogContainer({ children }: PropsWithChildren) {
		return (
			<Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Update Bucket</DialogTitle>
						<DialogDescription>
							Update the details of this bucket.
						</DialogDescription>
					</DialogHeader>
					{children}
				</DialogContent>
			</Dialog>
		);
	}

	if (isLoading)
		return (
			<DialogContainer>
				<StateTemplate
					state="loading"
					heading="Loading bucket..."
					description="Please wait while we load your bucket"
				/>
			</DialogContainer>
		);

	if (error)
		return (
			<DialogContainer>
				<StateTemplate
					state="error"
					heading="Failed to load bucket"
					description="We encountered an error while loading your bucket."
				>
					<div>
						<Button onClick={async () => await refetch()}>Try Again</Button>
					</div>
				</StateTemplate>
			</DialogContainer>
		);

	if (!bucket)
		return (
			<DialogContainer>
				<StateTemplate
					state="empty"
					heading="We can't find that bucket"
					description="If you think this is a mistake, please contact us"
				/>
			</DialogContainer>
		);

	return (
		<DialogContainer>
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
		</DialogContainer>
	);
}
