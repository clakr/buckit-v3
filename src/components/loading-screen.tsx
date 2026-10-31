import { useMatch, useRouterState } from "@tanstack/react-router";

import { Main } from "#/components/main";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#/components/ui/empty";
import { Spinner } from "#/components/ui/spinner";

/**
 * Pending screen. Fills the whole screen when it replaces a layout route directly under the root
 * (cold start), and loads inside the existing layout when a child route is pending.
 *
 * Decided from the route tree rather than `resolvedLocation`: the server sets that before
 * rendering but the client doesn't until its load finishes, so the two rendered different variants.
 */
export function LoadingScreen() {
  const matchId = useMatch({ strict: false, select: (match) => match.id });
  const isColdStart = useRouterState({
    select: (state) => state.matches.findIndex((match) => match.id === matchId) <= 1,
  });

  const content = (
    <>
      <EmptyMedia variant="icon">
        <Spinner />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>Loading Buckit</EmptyTitle>
        <EmptyDescription>Getting everything ready.</EmptyDescription>
      </EmptyHeader>
    </>
  );

  if (isColdStart)
    return (
      <Empty className="min-h-svh rounded-none bg-linear-to-b from-muted/50 from-30% to-background">
        {content}
      </Empty>
    );

  return (
    <Main>
      <Empty className="border border-dashed">{content}</Empty>
    </Main>
  );
}
