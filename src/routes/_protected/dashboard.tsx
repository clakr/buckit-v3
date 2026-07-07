import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "#/components/ui/button";
import { getSession, signOutUser } from "#/modules/authentication/functions";

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

  const navigate = Route.useNavigate();
  const logoutUserServerFn = useServerFn(signOutUser);

  async function handleLogout() {
    await logoutUserServerFn();

    navigate({
      to: "/",
      replace: true,
    });
  }

  return (
    <main>
      <pre>{JSON.stringify(foo, null, 2)}</pre>
      <div>Hello "/dashboard"!</div>
      <Button onClick={handleLogout}>logout</Button>
    </main>
  );
}
