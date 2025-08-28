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
import type { Expense } from "@/integrations/supabase/types";
import { useDeleteExpenseMutation } from "@/modules/expenses/mutations";
import { Icon } from "@iconify/react";
import { Link } from "@tanstack/react-router";

type Props = {
	id: Expense["id"];
};

export function ExpenseDropdownMenu({ id }: Props) {
	/**
	 * delete expense
	 */
	const { show } = useAlert();
	const deleteMutation = useDeleteExpenseMutation();

	function handleDelete() {
		show({
			title: "Are you absolutely sure?",
			description:
				"This action cannot be undone. This will permanently delete your expense along with its respective data.",
			actionText: "Delete Expense",
			onAction: () => {
				deleteMutation.mutate(id);
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
					<DropdownMenuLabel>Expense</DropdownMenuLabel>
					<DropdownMenuItem asChild>
						<Link
							to="/expenses/$id/edit"
							params={{
								id,
							}}
						>
							<Icon icon="bx:edit" />
							Update
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleDelete}>
						<Icon icon="bx:trash" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
