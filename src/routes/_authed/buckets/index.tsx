import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/buckets/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<>
			<Button asChild>
				<Link to="/buckets/create">
					<Icon icon="bx:plus" />
					Create Bucket
				</Link>
			</Button>
		</>
	);
}
