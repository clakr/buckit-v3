import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAppForm } from "@/hooks/form";
import { useCreateBucketMutation } from "@/modules/buckets/mutations";
import { createBucketFormSchema } from "@/modules/buckets/schemas";
import { createDialogStore } from "@/stores/create-dialog-store";
import { Icon } from "@iconify/react";
import type z from "zod";
import { useShallow } from "zustand/react/shallow";

export const useCreateBucketDialogStore = createDialogStore();

export function CreateBucketDialog() {
	/**
	 * dialog state
	 */
	const { isOpen, handleToggle } = useCreateBucketDialogStore(
		useShallow((state) => ({
			isOpen: state.isOpen,
			handleToggle: state.handleToggle,
		})),
	);

	/**
	 * form
	 */
	const mutation = useCreateBucketMutation();

	const defaultValues: z.input<typeof createBucketFormSchema> = {
		name: "",
		description: "",
		current_amount: 0,
	};

	const form = useAppForm({
		defaultValues,
		validators: {
			onBlur: createBucketFormSchema,
		},
		onSubmit: async ({ value }) => {
			const payload = createBucketFormSchema.parse(value);

			mutation.mutate(payload);

			form.reset();

			handleToggle();
		},
	});

	return (
		<Dialog open={isOpen} onOpenChange={handleToggle}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Bucket</DialogTitle>
					<DialogDescription>
						{/* todo: add create bucket description */}
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
					<form.AppField name="name">
						{(field) => <field.Input label="Name" id="name" type="text" />}
					</form.AppField>
					<form.AppField name="description">
						{(field) => <field.Textarea label="Description" id="description" />}
					</form.AppField>
					<form.AppField name="current_amount">
						{(field) => (
							<field.Input
								label="Initial Amount"
								id="current-amount"
								type="number"
							/>
						)}
					</form.AppField>
					<form.AppForm>
						<form.Button className="self-end">
							<Icon icon="bx:plus" />
							Create Bucket
						</form.Button>
					</form.AppForm>
				</form>
			</DialogContent>
		</Dialog>
	);
}
