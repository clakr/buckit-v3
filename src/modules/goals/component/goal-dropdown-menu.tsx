import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Goal } from "@/integrations/supabase/types";
import { useUpdateGoalDialogStore } from "@/modules/goals/component/update-goal-dialog";
import { Icon } from "@iconify/react";
import { useShallow } from "zustand/react/shallow";

type Props = {
	id: Goal["id"];
};

export function GoalDropdownMenu({ id }: Props) {
	/**
	 * edit bucket
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
						Edit
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
