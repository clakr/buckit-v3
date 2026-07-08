import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/buckets")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_protected/buckets"!</div>;
}
