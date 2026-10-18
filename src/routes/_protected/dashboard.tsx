import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";

import { Button } from "#/components/ui/button";
import { getSession } from "#/modules/authentication/functions";
import { signOut } from "#/modules/authentication/session";

export const Route = createFileRoute("/_protected/dashboard")({
  component: RouteComponent,
  beforeLoad: async () => {
    const user = await getSession();

    if (!user)
      throw redirect({
        to: "/",
      });

    return { user };
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
