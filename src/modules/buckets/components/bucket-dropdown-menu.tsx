import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAlert } from "@/hooks/use-alert";
import type { Bucket } from "@/integrations/supabase/types";
import { useEditBucketDialogStore } from "@/modules/buckets/components/edit-bucket-dialog";
import { useDeleteBucket } from "@/modules/buckets/mutations";
import { Icon } from "@iconify/react";
import { Link } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";

type Props = {
	id: Bucket["id"];
};

export function BucketDropdownMenu({ id }: Props) {
	/**
	 * delete bucket
	 */
	const { show } = useAlert();
	const mutation = useDeleteBucket();

	function handleDeleteBucket() {
		show({
			title: "Are you absolutely sure?",
			description:
				"This action cannot be undone. This will permanently delete your bucket along with its respective data.",
			actionText: "Delete this Bucket",
			onAction: () => {
				mutation.mutate(id);
			},
		});
	}

	/**
	 * edit bucket
	 */
	const { handleOpen, setBucketId } = useEditBucketDialogStore(
		useShallow((state) => ({
			handleOpen: state.handleOpen,
			setBucketId: state.setBucketId,
		})),
	);

	function handleOpenEditBucketDialog() {
		setBucketId(id);
		handleOpen();
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
					<DropdownMenuItem asChild>
						<Link
							to="/buckets/$id/create-transaction"
							params={{
								id,
							}}
						>
							<Icon icon="bx:plus" />
							Create
						</Link>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
				</DropdownMenuGroup>
				<DropdownMenuGroup>
					<DropdownMenuLabel>Bucket</DropdownMenuLabel>
					<DropdownMenuItem asChild>
						<Link
							to="/buckets/$id"
							params={{
								id,
							}}
						>
							<Icon icon="bx:show" />
							View
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleOpenEditBucketDialog}>
						<Icon icon="bx:edit" />
						Edit
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleDeleteBucket}>
						<Icon icon="bx:trash" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
