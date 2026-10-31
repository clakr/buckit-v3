import { IconError404 } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { Button } from "#/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#/components/ui/empty";

export function NotFoundScreen() {
  return (
    <Empty className="min-h-svh rounded-none bg-linear-to-b from-muted/50 from-30% to-background">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconError404 />
        </EmptyMedia>
        <EmptyTitle>Page Not Found</EmptyTitle>
        <EmptyDescription>This page doesn't exist or may have been moved.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <Button nativeButton={false} render={<Link to="/dashboard" />}>
          Back to Dashboard
        </Button>
      </EmptyContent>
    </Empty>
  );
}
