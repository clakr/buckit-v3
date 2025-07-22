import { Template } from "@/components/authed-template";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/buckets/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <Template heading="Buckets">Hello "/_authed/buckets"!</Template>;
}
