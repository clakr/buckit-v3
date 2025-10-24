import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useAlert } from "@/hooks/use-alert";
import type { Split } from "@/integrations/supabase/types";
import {
	useDeleteSplitMutation,
	useDistributeSplitMutation,
} from "@/modules/splits/mutations";
import { Icon } from "@iconify/react";
import { Link } from "@tanstack/react-router";

type Props = PropsWithChildren<{
	id: Split["id"];
}>;

export function SplitDropdownMenu({ id, children }: Props) {
	/**
	 * execute split
	 */
	const { show } = useAlert();
	const distributeMutation = useDistributeSplitMutation();

	function handleDistributeSplit() {
		show({
			title: "Distribute this split?",
			description:
				"This will distribute funds according to your split allocations. Transactions will be created for each bucket and goal in this split.",
			actionText: "Distribute Split",
			onAction: () => {
				distributeMutation.mutate(id);
			},
		});
	}

	/**
	 * delete split
	 */
	const deleteMutation = useDeleteSplitMutation();

	function handleDeleteSplit() {
		show({
			title: "Are you absolutely sure?",
			description:
				"This action cannot be undone. This will permanently delete your split along with its respective data.",
			actionText: "Delete Split",
			onAction: () => {
				deleteMutation.mutate(id);
			},
		});
	}

	return (
		<DropdownMenu>
			{children}
			<DropdownMenuContent>
				<DropdownMenuGroup>
					<DropdownMenuLabel>Split</DropdownMenuLabel>
					<DropdownMenuItem onClick={handleDistributeSplit}>
						<Icon icon="fluent-mdl2:distribute-down" />
						Distribute
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link
							to="/splits/$id"
							params={{
								id,
							}}
						>
							<Icon icon="bx:show" />
							View
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link
							to="/splits/$id/edit"
							params={{
								id,
							}}
						>
							<Icon icon="bx:edit" />
							Update
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleDeleteSplit}>
						<Icon icon="bx:trash" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
