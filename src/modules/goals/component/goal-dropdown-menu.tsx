import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAlert } from "@/hooks/use-alert";
import type { Goal } from "@/integrations/supabase/types";
import { useCreateTransactionStore } from "@/modules/goals/component/create-transaction-dialog";
import { useUpdateGoalDialogStore } from "@/modules/goals/component/update-goal-dialog";
import { useDeleteGoalMutation } from "@/modules/goals/mutations";
import { Icon } from "@iconify/react";
import { Link } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";

type Props = {
	id: Goal["id"];
};

export function GoalDropdownMenu({ id }: Props) {
	/**
	 * update goal
	 */
	const updateGoalDialogStore = useUpdateGoalDialogStore(
		useShallow((state) => ({
			handleOpen: state.handleOpen,
			setGoalId: state.setGoalId,
		})),
	);

	function handleOpenUpdateGoalDialog() {
		updateGoalDialogStore.setGoalId(id);
		updateGoalDialogStore.handleOpen();
	}

	/**
	 * delete goal
	 */
	const { show } = useAlert();
	const mutation = useDeleteGoalMutation();

	function handleDeleteGoal() {
		show({
			title: "Are you absolutely sure?",
			description:
				"This action cannot be undone. This will permanently delete your goal along with its respective data.",
			actionText: "Delete this Goal",
			onAction: () => {
				mutation.mutate(id);
			},
		});
	}

	/**
	 * create transaction
	 */
	const createTransactionDialogStore = useCreateTransactionStore(
		useShallow((state) => ({
			handleOpen: state.handleOpen,
			setGoalId: state.setGoalId,
		})),
	);

	function handleOpenCreateTransactionDialog() {
		createTransactionDialogStore.setGoalId(id);
		createTransactionDialogStore.handleOpen();
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="absolute top-2 right-2">
					<Icon icon="bx:dots-vertical-rounded" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuGroup>
					<DropdownMenuLabel>Transactions</DropdownMenuLabel>
					<DropdownMenuItem onClick={handleOpenCreateTransactionDialog}>
						<Icon icon="bx:plus" />
						Create
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuGroup>
					<DropdownMenuLabel>Goal</DropdownMenuLabel>
					<DropdownMenuItem asChild>
						<Link
							to="/goals/$id"
							params={{
								id,
							}}
						>
							<Icon icon="bx:show" />
							View
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleOpenUpdateGoalDialog}>
						<Icon icon="bx:edit" />
						Update
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleDeleteGoal}>
						<Icon icon="bx:trash" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
