import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAppForm } from "@/hooks/form";
import type { Goal } from "@/integrations/supabase/types";
import { useUpdateGoalMutation } from "@/modules/goals/mutations";
import { goalQueryOption } from "@/modules/goals/query-options";
import { updateGoalFormSchema } from "@/modules/goals/schemas";
import {
	type BaseDialogStore,
	createDialogStore,
} from "@/stores/create-dialog-store";
import { Icon } from "@iconify/react";
import { useQuery } from "@tanstack/react-query";
import type z from "zod";
import { useShallow } from "zustand/react/shallow";

interface UpdateGoalDialogStore extends BaseDialogStore {
	goalId: Goal["id"] | null;
	setGoalId: (id: Goal["id"] | null) => void;
}

export const useUpdateGoalDialogStore =
	createDialogStore<UpdateGoalDialogStore>((set) => ({
		goalId: null,
		setGoalId: (id) => set({ goalId: id }),
	}));

export function UpdateGoalDialog() {
	/**
	 * dialog state
	 */
	const { isOpen, handleToggle, goalId } = useUpdateGoalDialogStore(
		useShallow((state) => ({
			isOpen: state.isOpen,
			handleToggle: state.handleToggle,
			goalId: state.goalId,
		})),
	);

	/**
	 * data fetching
	 */
	const {
		isLoading,
		error,
		data: goal,
	} = useQuery({
		...goalQueryOption(goalId || ""),
		enabled: !!goalId,
	});

	/**
	 * form
	 */
	const mutation = useUpdateGoalMutation();

	const defaultValues: z.input<typeof updateGoalFormSchema> = {
		id: "",
		name: "",
		description: "",
		target_amount: 0,
	};

	const form = useAppForm({
		defaultValues,
		validators: {
			onBlur: updateGoalFormSchema,
		},
		onSubmit: async ({ value }) => {
			const payload = updateGoalFormSchema.parse(value);

			mutation.mutate(payload);

			form.reset();

			handleToggle();
		},
	});

	if (isLoading) return <div>Loading...</div>;
	if (error) return <div>Error: {error.message}</div>;
	if (!goal) return null;

	return (
		<Dialog open={isOpen} onOpenChange={handleToggle}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Update Goal</DialogTitle>
					<DialogDescription>
						{/* todo: add update goal description */}
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
					<form.AppField name="id" defaultValue={goal.id}>
						{(field) => <field.Input label="ID" id="id" type="hidden" />}
					</form.AppField>
					<form.AppField name="name" defaultValue={goal.name}>
						{(field) => <field.Input label="Name" id="name" type="text" />}
					</form.AppField>
					<form.AppField name="description" defaultValue={goal.description}>
						{(field) => <field.Textarea label="Description" id="description" />}
					</form.AppField>
					<form.AppField name="target_amount" defaultValue={goal.target_amount}>
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
							Update Goal
						</form.Button>
					</form.AppForm>
				</form>
			</DialogContent>
		</Dialog>
	);
}
