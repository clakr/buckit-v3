import { Link } from "@tanstack/react-router";

import { Main } from "#/components/main";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";

type Props = { title: string; description: string };

/**
 * Full-page not-found state with a way back to the dashboard. Signed-out visitors following the
 * link are sent to login by the protected layout's guard.
 */
export function NotFoundScreen({ title, description }: Props) {
  return (
    <Main>
      <StateTemplate
        state="error"
        title={title}
        description={description}
        content={
          <Button nativeButton={false} render={<Link to="/dashboard" />}>
            Back to dashboard
          </Button>
        }
      />
    </Main>
  );
}
