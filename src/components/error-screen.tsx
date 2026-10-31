import { IconMoodWrrr } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { RouteRetryButton } from "#/components/route-retry-button";
import { Button } from "#/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#/components/ui/empty";

type Props = { description: string };

export function ErrorScreen({ description }: Props) {
  return (
    <Empty className="min-h-svh rounded-none bg-linear-to-b from-muted/50 from-30% to-background">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconMoodWrrr />
        </EmptyMedia>
        <EmptyTitle>Something Went Wrong</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <RouteRetryButton />
        <Button variant="outline" nativeButton={false} render={<Link to="/dashboard" />}>
          Back to Dashboard
        </Button>
      </EmptyContent>
    </Empty>
  );
}
