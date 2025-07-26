import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAlert } from "@/hooks/use-alert";
import type { Bucket } from "@/integrations/supabase/types";
import { useDeleteBucket } from "@/modules/buckets/mutations";
import { Icon } from "@iconify/react";
import { Link } from "@tanstack/react-router";

type Props = {
	id: Bucket["id"];
};

export function BucketDropdownMenu({ id }: Props) {
	/**
	 * delete bucket action
	 */
	/**
	 * delete bucket action
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

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="absolute top-2 right-2">
					<Icon icon="bx:dots-vertical" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
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
				<DropdownMenuItem asChild>
					<Link
						to="/buckets/$id/edit"
						params={{
							id,
						}}
					>
						<Icon icon="bx:edit" />
						Edit
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem onClick={handleDeleteBucket}>
					<Icon icon="bx:trash" />
					Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
