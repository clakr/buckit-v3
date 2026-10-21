import { createFileRoute, useRouter } from "@tanstack/react-router";

import { Button } from "#/components/ui/button";
import { formatPageTitle } from "#/lib/utils";
import { signOut } from "#/modules/authentication/session";

export const Route = createFileRoute("/_protected/dashboard")({
  head: () => ({ meta: [{ title: formatPageTitle("Dashboard") }] }),
  component: RouteComponent,
});

function RouteComponent() {
  const foo = Route.useRouteContext();

  const router = useRouter();

  return (
    <main>
      <pre>{JSON.stringify(foo, null, 2)}</pre>
      <div>Hello "/dashboard"!</div>
      <Button onClick={() => signOut(router)}>logout</Button>
    </main>
  );
}
