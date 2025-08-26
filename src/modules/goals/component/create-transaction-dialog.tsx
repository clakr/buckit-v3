import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAppForm } from "@/hooks/form";
import type { Goal } from "@/integrations/supabase/types";
import { transactionTypeEnum } from "@/lib/schemas";
import { useCreateTransactionMutation } from "@/modules/goals/mutations";
import { createTransactionFormSchema } from "@/modules/goals/schemas";
import {
	type BaseDialogStore,
	createDialogStore,
} from "@/stores/create-dialog-store";
import { Icon } from "@iconify/react";
import type z from "zod";
import { useShallow } from "zustand/react/shallow";

interface CreateTransactionDialogStore extends BaseDialogStore {
	goalId: Goal["id"] | null;
	setGoalId: (id: Goal["id"] | null) => void;
}

export const useCreateTransactionStore =
	createDialogStore<CreateTransactionDialogStore>((set) => ({
		goalId: null,
		setGoalId: (id) => set({ goalId: id }),
	}));

export function CreateTransactionDialog() {
	/**
	 * dialog state
	 */
	const { isOpen, handleToggle, goalId } = useCreateTransactionStore(
		useShallow((state) => ({
			isOpen: state.isOpen,
			handleToggle: state.handleToggle,
			goalId: state.goalId,
		})),
	);

	/**
	 * form
	 */
	const mutation = useCreateTransactionMutation();

	const defaultValues: z.input<typeof createTransactionFormSchema> = {
		goal_id: "",
		description: "",
		amount: 0,
		type: "inbound",
	};

	const form = useAppForm({
		defaultValues,
		validators: {
			onBlur: createTransactionFormSchema,
		},
		onSubmit: async ({ value }) => {
			const payload = createTransactionFormSchema.parse(value);

			mutation.mutate(payload);

			form.reset();

			handleToggle();
		},
	});

	if (!goalId) return null;

	return (
		<Dialog open={isOpen} onOpenChange={handleToggle}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Transaction</DialogTitle>
					<DialogDescription>
						Record a new transaction for this goal.
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
					<form.AppField name="goal_id" defaultValue={goalId}>
						{(field) => (
							<field.Input label="Goal ID" id="goal-id" type="hidden" />
						)}
					</form.AppField>
					<form.AppField name="amount">
						{(field) => (
							<field.Input label="Amount" id="amount" type="number" />
						)}
					</form.AppField>
					<form.AppField name="description">
						{(field) => (
							<field.Input label="Description" id="description" type="text" />
						)}
					</form.AppField>
					<form.AppField name="type">
						{(field) => (
							<field.Radio
								label="Type"
								id="type"
								enumSchema={transactionTypeEnum}
							/>
						)}
					</form.AppField>
					<form.AppForm>
						<form.Button className="self-end">
							<Icon icon="bx:plus" />
							Create Transaction
						</form.Button>
					</form.AppForm>
				</form>
			</DialogContent>
		</Dialog>
	);
}
