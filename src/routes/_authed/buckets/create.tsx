import { Template } from "@/components/authed-template";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/buckets/create")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<Template heading="Create Bucket">
			Hello "/_authed/buckets/create"!
		</Template>
	);
}
