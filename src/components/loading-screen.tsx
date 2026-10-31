import { useRouterState } from "@tanstack/react-router";

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
 * Root-level pending screen. Fills the whole screen on cold start, when the router has not
 * resolved any location yet. Later navigations load inside the existing layout instead.
 */
export function LoadingScreen() {
  const isColdStart = useRouterState({ select: (state) => state.resolvedLocation === undefined });

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
