import { Link } from "@tanstack/react-router";

import { Main } from "#/components/main";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";

type Props = { title: string; description: string };

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
