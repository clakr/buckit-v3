import { StateTemplate } from "@/components/states-template";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
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
import type { PropsWithChildren } from "react";
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
			onChange: updateGoalFormSchema,
		},
		onSubmit: async ({ value }) => {
			const payload = updateGoalFormSchema.parse(value);

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
						<DialogTitle>Update Goal</DialogTitle>
						<DialogDescription>
							Update the details of this goal.
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
					heading="Loading goal..."
					description="Please wait while we load your goal"
				/>
			</DialogContainer>
		);

	if (error)
		return (
			<StateTemplate
				state="error"
				heading="Failed to load goal"
				description="We encountered an error while loading your goal."
			>
				<div>
					<Button onClick={async () => await refetch()}>Try Again</Button>
				</div>
			</StateTemplate>
		);

	if (!goal)
		return (
			<DialogContainer>
				<Empty className="border border-dashed">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Icon icon="mage:goals-fill" />
						</EmptyMedia>
						<EmptyTitle>We can't find that goal</EmptyTitle>
						<EmptyDescription>
							If you think this is a mistake, please contact us
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
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
		</DialogContainer>
	);
}
