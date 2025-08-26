import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAppForm } from "@/hooks/form";
import { useCreateGoalMutation } from "@/modules/goals/mutations";
import { createGoalFormSchema } from "@/modules/goals/schemas";
import { createDialogStore } from "@/stores/create-dialog-store";
import { Icon } from "@iconify/react";
import type z from "zod";
import { useShallow } from "zustand/react/shallow";

export const useCreateGoalDialogStore = createDialogStore();

export function CreateGoalDialog() {
	/**
	 * dialog state
	 */
	const { isOpen, handleToggle } = useCreateGoalDialogStore(
		useShallow((state) => ({
			isOpen: state.isOpen,
			handleToggle: state.handleToggle,
		})),
	);

	/**
	 * form
	 */
	const mutation = useCreateGoalMutation();

	const defaultValues: z.input<typeof createGoalFormSchema> = {
		name: "",
		description: "",
		current_amount: 0,
		target_amount: 0,
	};

	const form = useAppForm({
		defaultValues,
		validators: {
			onBlur: createGoalFormSchema,
		},
		onSubmit: async ({ value }) => {
			const payload = createGoalFormSchema.parse(value);

			mutation.mutate(payload);

			form.reset();

			handleToggle();
		},
	});

	return (
		<Dialog open={isOpen} onOpenChange={handleToggle}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Goal</DialogTitle>
					<DialogDescription>Set up a new financial goal.</DialogDescription>
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
					<form.AppField name="target_amount">
						{(field) => (
							<field.Input
								label="Target Amount"
								id="target-amount"
								type="number"
							/>
						)}
					</form.AppField>
					<form.AppForm>
						<form.Button className="self-end">
							<Icon icon="bx:plus" />
							Create Goal
						</form.Button>
					</form.AppForm>
				</form>
			</DialogContent>
		</Dialog>
	);
}
