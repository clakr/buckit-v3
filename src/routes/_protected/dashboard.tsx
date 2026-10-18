import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";

import { Button } from "#/components/ui/button";
import { getSession } from "#/modules/authentication/functions";
import { signOut } from "#/modules/authentication/session";

export const Route = createFileRoute("/_protected/dashboard")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await getSession();

    if (!session)
      throw redirect({
        to: "/",
      });

    return { user: session.user };
  },
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
