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
import type { Split } from "@/integrations/supabase/types";
import { useDistributeSplitMutation } from "@/modules/splits/mutations";
import { Icon } from "@iconify/react";
import { Link } from "@tanstack/react-router";

type Props = {
	id: Split["id"];
};

export function SplitDropdownMenu({ id }: Props) {
	/**
	 * execute split
	 */
	const { show } = useAlert();
	const mutation = useDistributeSplitMutation();

	function handleDistributeSplit() {
		show({
			title: "Distribute this split?",
			description:
				"This will distribute funds according to your split allocations. Transactions will be created for each bucket and goal in this split.",
			actionText: "Distribute Split",
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
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
