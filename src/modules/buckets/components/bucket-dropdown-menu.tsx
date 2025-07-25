import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserBucket } from "@/integrations/supabase/types";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link } from "@tanstack/react-router";

type Props = {
	id: UserBucket["id"];
};

export function BucketDropdownMenu({ id }: Props) {
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
				<DropdownMenuItem disabled>
					<Icon icon="bx:edit" />
					Edit
				</DropdownMenuItem>
				<DropdownMenuItem disabled>
					<Icon icon="bx:trash" />
					Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
