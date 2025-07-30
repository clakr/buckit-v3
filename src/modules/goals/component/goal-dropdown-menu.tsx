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
import { useUpdateGoalDialogStore } from "@/modules/goals/component/update-goal-dialog";
import { useDeleteGoalMutation } from "@/modules/goals/mutations";
import { Icon } from "@iconify/react";
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

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="absolute top-2 right-2">
					<Icon icon="bx:dots-vertical-rounded" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuGroup>
					<DropdownMenuLabel>Goal</DropdownMenuLabel>
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
