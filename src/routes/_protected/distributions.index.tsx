import type { SortingState } from "@tanstack/react-table";

import { IconPlus, IconSearch } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import {
  InsetCard,
  InsetCardContent,
  InsetCardFooter,
  InsetCardTitle,
} from "#/components/inset-card";
import { Main } from "#/components/main";
import { Pager } from "#/components/pager";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
import { ControlledDataTable } from "#/components/table/controlled-data-table";
import { Button } from "#/components/ui/button";
import { DrawerTrigger } from "#/components/ui/drawer";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { MODULE_ICONS } from "#/lib/constants";
import { PAGE_SIZES } from "#/lib/paging";
import { formatPageTitle } from "#/lib/utils";
import { bucketsQueryOptions } from "#/modules/buckets/query-options";
import { debtsQueryOptions } from "#/modules/debts/query-options";
import {
  indexTargetFigures,
  sortDistributionsByAttention,
  toDistributionRow,
} from "#/modules/distributions/attention";
import { DISTRIBUTION_SORT_COLUMN_IDS, getIndexColumns } from "#/modules/distributions/columns";
import { createDistributionDrawerHandle } from "#/modules/distributions/components/create-distribution-drawer";
import {
  DistributionsAccountFilter,
  getDistributionAccountCounts,
} from "#/modules/distributions/components/distributions-account-filter";
import { DistributionsOverview } from "#/modules/distributions/components/distributions-overview";
import { distributionsQueryOptions } from "#/modules/distributions/query-options";

const distributionsSearchSchema = z.object({
  pageIndex: z.number().int().min(0).optional().catch(undefined),
  pageSize: z.literal(PAGE_SIZES).optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  accounts: z.array(z.string()).optional().catch(undefined),
  sortBy: z.enum(DISTRIBUTION_SORT_COLUMN_IDS).optional().catch(undefined),
  sortDirection: z.enum(["asc", "desc"]).optional().catch(undefined),
});

const DEFAULT_SORTING: SortingState = [];

export const Route = createFileRoute("/_protected/distributions/")({
  validateSearch: distributionsSearchSchema,
  head: () => ({ meta: [{ title: formatPageTitle("Distributions") }] }),
  context: () => ({ distributionsQueryOptions, bucketsQueryOptions, debtsQueryOptions }),
  loader: async ({ context: { queryClient, ...queryOptions } }) => {
    await Promise.all([
      queryClient.query(queryOptions.distributionsQueryOptions),
      queryClient.query(queryOptions.bucketsQueryOptions),
      queryClient.query(queryOptions.debtsQueryOptions),
    ]);
  },
  pendingComponent: () => (
    <Main>
      <InsetCard>
        <InsetCardTitle as="h1">Distributions</InsetCardTitle>
        <InsetCardContent>
          <StateTemplate
            state="loading"
            title="Loading distributions..."
            description="Fetching your distributions..."
          />
        </InsetCardContent>
      </InsetCard>
    </Main>
  ),
  errorComponent: () => (
    <Main>
      <InsetCard>
        <InsetCardTitle as="h1">Distributions</InsetCardTitle>
        <InsetCardContent>
          <StateTemplate
            state="error"
            title="Could not load distributions."
            description="We weren't able to retrieve your distributions. Please try again."
            content={<RouteRetryButton />}
          />
        </InsetCardContent>
      </InsetCard>
    </Main>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const context = Route.useRouteContext();
  const { data: distributions } = useSuspenseQuery(context.distributionsQueryOptions);
  const { data: buckets } = useSuspenseQuery(context.bucketsQueryOptions);
  const { data: debts } = useSuspenseQuery(context.debtsQueryOptions);
  const {
    pageIndex: requestedPageIndex = 0,
    pageSize = PAGE_SIZES[0],
    q = "",
    accounts: requestedAccountIds = [],
    sortBy,
    sortDirection,
  } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState(q);
  const pushedQueryRef = useRef(q);

  useEffect(() => {
    if (q === pushedQueryRef.current) return;
    pushedQueryRef.current = q;
    setQuery(q);
  }, [q]);

  const figures = indexTargetFigures(buckets, debts);
  const rows = sortDistributionsByAttention(
    distributions.map((distribution) => toDistributionRow(distribution, figures)),
  );

  const accountCounts = getDistributionAccountCounts(distributions);
  const getSelectedAccountIds = (accountIds: string[]) =>
    accountIds.filter((accountId) => accountCounts.some(({ id }) => id === accountId));
  const getAmountSortCurrency = (accountIds: string[]) => {
    const accountsInView = accountIds.length
      ? accountCounts.filter(({ id }) => accountIds.includes(id))
      : accountCounts;
    const currencies = new Set(accountsInView.map(({ currency }) => currency));
    return currencies.size === 1 ? [...currencies][0] : null;
  };

  const selectedAccountIds = getSelectedAccountIds(requestedAccountIds);
  const amountSortCurrency = getAmountSortCurrency(selectedAccountIds);
  const sorting =
    sortBy && (sortBy !== "amount" || amountSortCurrency)
      ? [{ id: sortBy, desc: sortDirection === "desc" }]
      : DEFAULT_SORTING;

  const normalizedQuery = query.trim().toLowerCase();
  const rowsInSelectedAccounts = rows.filter(
    ({ bankAccount }) =>
      selectedAccountIds.length === 0 || selectedAccountIds.includes(bankAccount.id),
  );
  const filteredRows = rowsInSelectedAccounts.filter(
    ({ name, bankAccount, lines }) =>
      name.toLowerCase().includes(normalizedQuery) ||
      bankAccount.name.toLowerCase().includes(normalizedQuery) ||
      lines.some(({ targetName }) => targetName.toLowerCase().includes(normalizedQuery)),
  );

  const isEmpty = distributions.length === 0;
  const total = filteredRows.length;
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const pageIndex = Math.min(requestedPageIndex, pageCount - 1);

  function handleFiltersChange(filters: { q?: string; accounts?: string[] }) {
    void navigate({
      search: (previous) => {
        const next = { ...previous, ...filters, pageIndex: undefined };
        const canSortAmount = getAmountSortCurrency(getSelectedAccountIds(next.accounts ?? []));

        return next.sortBy === "amount" && !canSortAmount
          ? { ...next, sortBy: undefined, sortDirection: undefined }
          : next;
      },
      replace: true,
    });
  }

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    pushedQueryRef.current = nextQuery;
    handleFiltersChange({ q: nextQuery || undefined });
  }

  function handleClearFilters() {
    setQuery("");
    pushedQueryRef.current = "";
    handleFiltersChange({ q: undefined, accounts: undefined });
  }

  function handleSortingChange(nextSorting: SortingState) {
    const [nextSort] = nextSorting;
    const nextSortBy = DISTRIBUTION_SORT_COLUMN_IDS.find((id) => id === nextSort?.id);
    const isDefault = !nextSort || !nextSortBy;

    void navigate({
      search: (previous) => ({
        ...previous,
        sortBy: isDefault ? undefined : nextSortBy,
        sortDirection: isDefault ? undefined : nextSort.desc ? "desc" : "asc",
        pageIndex: undefined,
      }),
    });
  }

  return (
    <Main>
      <InsetCard>
        <InsetCardTitle
          as="h1"
          subtitle={
            total === distributions.length
              ? `${total} ${total === 1 ? "distribution" : "distributions"}`
              : `${total} of ${distributions.length} distributions`
          }
          action={
            <DrawerTrigger handle={createDistributionDrawerHandle} render={<Button />}>
              <IconPlus />
              Create Distribution
            </DrawerTrigger>
          }
        >
          Distributions
        </InsetCardTitle>

        <InsetCardContent cardClassName="gap-0 py-0" className="gap-y-0 px-0">
          {isEmpty ? (
            <StateTemplate
              state="empty"
              title="No distributions yet."
              description="Save a routine, like your payday split, to trigger whenever you need it."
              icon={<MODULE_ICONS.distributions />}
            />
          ) : (
            <>
              <section className="flex flex-col gap-y-4 border-b p-4">
                <DistributionsOverview
                  distributions={rowsInSelectedAccounts}
                  allDistributions={rows}
                  buckets={buckets}
                  debts={debts}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <InputGroup className="sm:max-w-64">
                    <InputGroupAddon>
                      <IconSearch />
                    </InputGroupAddon>
                    <InputGroupInput
                      type="search"
                      aria-label="Search distributions"
                      placeholder="Search distributions..."
                      value={query}
                      onChange={(event) => handleQueryChange(event.target.value)}
                    />
                  </InputGroup>

                  {accountCounts.length > 1 ? (
                    <DistributionsAccountFilter
                      accountCounts={accountCounts}
                      selectedAccountIds={selectedAccountIds}
                      onSelectedAccountIdsChange={(accounts) =>
                        handleFiltersChange({ accounts: accounts.length ? accounts : undefined })
                      }
                    />
                  ) : null}
                </div>
              </section>

              {total === 0 ? (
                <StateTemplate
                  state="empty"
                  title="No matching distributions."
                  description="No distributions match these filters. Try another name, Bucket, Debt or bank account."
                  icon={<IconSearch />}
                  content={
                    <Button variant="secondary" onClick={handleClearFilters}>
                      Clear Filters
                    </Button>
                  }
                />
              ) : (
                <ControlledDataTable
                  columns={getIndexColumns({ amountSortCurrency })}
                  data={filteredRows}
                  sorting={sorting}
                  pageIndex={pageIndex}
                  pageSize={pageSize}
                  onSortingChange={handleSortingChange}
                />
              )}
            </>
          )}
        </InsetCardContent>

        {total > PAGE_SIZES[0] ? (
          <InsetCardFooter>
            <Pager
              paging={{ pageIndex, pageSize, pageCount, total }}
              onPageChange={(nextPageIndex) =>
                navigate({ search: (previous) => ({ ...previous, pageIndex: nextPageIndex }) })
              }
              onPageSizeChange={(nextPageSize) =>
                navigate({
                  search: (previous) => ({ ...previous, pageIndex: 0, pageSize: nextPageSize }),
                })
              }
            />
          </InsetCardFooter>
        ) : null}
      </InsetCard>
    </Main>
  );
}
