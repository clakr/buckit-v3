import { IconPlus } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { DataTable } from "#/components/ui/data-table";
import { DrawerTrigger } from "#/components/ui/drawer";
import { MODULE_ICONS } from "#/lib/constants";
import { formatPageTitle } from "#/lib/utils";
import { INDEX_COLUMNS } from "#/modules/distributions/columns";
import { createDistributionDrawerHandle } from "#/modules/distributions/components/create-distribution-drawer";
import { distributionsQueryOptions } from "#/modules/distributions/query-options";

export const Route = createFileRoute("/_protected/distributions/")({
  head: () => ({ meta: [{ title: formatPageTitle("Distributions") }] }),
  context: () => ({ distributionsQueryOptions }),
  loader: async ({ context: { queryClient, distributionsQueryOptions } }) => {
    await queryClient.query(distributionsQueryOptions);
  },
  pendingComponent: () => (
    <Main>
      <Heading>Distributions</Heading>

      <StateTemplate
        state="loading"
        title="Loading distributions..."
        description="Fetching your distributions..."
      />
    </Main>
  ),
  errorComponent: () => (
    <Main>
      <Heading>Distributions</Heading>

      <StateTemplate
        state="error"
        title="Could not load distributions."
        description="We weren't able to retrieve your distributions. Please try again."
        content={<RouteRetryButton />}
      />
    </Main>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { distributionsQueryOptions } = Route.useRouteContext();
  const { data: distributions } = useSuspenseQuery(distributionsQueryOptions);

  return (
    <Main>
      <div className="flex items-center justify-between">
        <Heading>Distributions</Heading>
        <DrawerTrigger handle={createDistributionDrawerHandle} render={<Button />}>
          <IconPlus />
          Create Distribution
        </DrawerTrigger>
      </div>

      {distributions.length === 0 ? (
        <StateTemplate
          state="empty"
          title="No distributions yet."
          description="Save a routine, like your payday split, to trigger whenever you need it."
          icon={<MODULE_ICONS.distributions />}
          content={
            <DrawerTrigger handle={createDistributionDrawerHandle} render={<Button />}>
              <IconPlus />
              Create Distribution
            </DrawerTrigger>
          }
        />
      ) : (
        <DataTable
          columns={INDEX_COLUMNS}
          data={distributions}
          initialSorting={[{ id: "name", desc: false }]}
        />
      )}
    </Main>
  );
}
