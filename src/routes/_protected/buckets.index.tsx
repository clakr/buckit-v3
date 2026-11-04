import type { SortingState } from "@tanstack/react-table";

import { IconPlus, IconSearch } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import type { BankAccount } from "#/db/schema";

import { CurrencyFilter } from "#/components/currency-filter";
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
import { CURRENCIES_CODES, MODULE_ICONS } from "#/lib/constants";
import { PAGE_SIZES } from "#/lib/paging";
import { formatPageTitle } from "#/lib/utils";
import {
  BUCKET_SORT_COLUMN_IDS,
  getIndexColumns,
  sortBucketsByGoalUrgency,
} from "#/modules/buckets/columns";
import {
  BUCKET_GOAL_FILTERS,
  BucketsGoalFilter,
  getBucketGoalFilter,
  type BucketGoalFilter,
} from "#/modules/buckets/components/buckets-goal-filter";
import {
  BucketsOverview,
  getBucketCurrencyTotals,
} from "#/modules/buckets/components/buckets-overview";
import { setUpBucketDrawerHandle } from "#/modules/buckets/components/set-up-bucket-drawer";
import { bucketsQueryOptions } from "#/modules/buckets/query-options";

const bucketsSearchSchema = z.object({
  pageIndex: z.number().int().min(0).optional().catch(undefined),
  pageSize: z.literal(PAGE_SIZES).optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  currencies: z.array(z.enum(CURRENCIES_CODES)).optional().catch(undefined),
  goals: z.array(z.enum(BUCKET_GOAL_FILTERS)).optional().catch(undefined),
  sortBy: z.enum(BUCKET_SORT_COLUMN_IDS).optional().catch(undefined),
  sortDirection: z.enum(["asc", "desc"]).optional().catch(undefined),
});

const DEFAULT_SORTING: SortingState = [];

export const Route = createFileRoute("/_protected/buckets/")({
  validateSearch: bucketsSearchSchema,
  head: () => ({ meta: [{ title: formatPageTitle("Buckets") }] }),
  context: () => ({ bucketsQueryOptions }),
  loader: async ({ context: { queryClient, bucketsQueryOptions } }) => {
    await queryClient.query(bucketsQueryOptions);
  },
  pendingComponent: () => (
    <Main>
      <InsetCard>
        <InsetCardTitle as="h1">Buckets</InsetCardTitle>
        <InsetCardContent>
          <StateTemplate
            state="loading"
            title="Loading buckets..."
            description="Fetching your buckets..."
          />
        </InsetCardContent>
      </InsetCard>
    </Main>
  ),
  errorComponent: () => (
    <Main>
      <InsetCard>
        <InsetCardTitle as="h1">Buckets</InsetCardTitle>
        <InsetCardContent>
          <StateTemplate
            state="error"
            title="Could not load buckets."
            description="We couldn't load your buckets. Please try again."
            content={<RouteRetryButton />}
          />
        </InsetCardContent>
      </InsetCard>
    </Main>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { bucketsQueryOptions } = Route.useRouteContext();
  const { data: buckets } = useSuspenseQuery(bucketsQueryOptions);
  const {
    pageIndex: requestedPageIndex = 0,
    pageSize = PAGE_SIZES[0],
    q = "",
    currencies: requestedCurrencies = [],
    goals: selectedGoalFilters = [],
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

  const currencyTotals = getBucketCurrencyTotals(buckets);
  const getSelectedCurrencies = (currencies: BankAccount["currency"][]) =>
    currencies.filter((currency) => currencyTotals.some((totals) => totals.currency === currency));
  const getSubtotalSortCurrency = (currencies: BankAccount["currency"][]) => {
    if (currencies.length === 1) return currencies[0];
    if (currencyTotals.length === 1) return currencyTotals[0].currency;
    return null;
  };

  const selectedCurrencies = getSelectedCurrencies(requestedCurrencies);
  const subtotalSortCurrency = getSubtotalSortCurrency(selectedCurrencies);
  const sorting =
    sortBy && (sortBy !== "subtotal" || subtotalSortCurrency)
      ? [{ id: sortBy, desc: sortDirection === "desc" }]
      : DEFAULT_SORTING;

  const normalizedQuery = query.trim().toLowerCase();
  const bucketsInSelectedCurrencies = buckets.filter(
    ({ subtotals }) =>
      selectedCurrencies.length === 0 ||
      subtotals.some(({ currency }) => selectedCurrencies.includes(currency)),
  );
  const filteredBuckets = sortBucketsByGoalUrgency(bucketsInSelectedCurrencies).filter(
    (bucket) =>
      (selectedGoalFilters.length === 0 ||
        selectedGoalFilters.includes(getBucketGoalFilter(bucket.goal))) &&
      bucket.name.toLowerCase().includes(normalizedQuery),
  );
  const hasGoals = buckets.some(({ goal }) => goal !== null);

  const isEmpty = buckets.length === 0;
  const total = filteredBuckets.length;
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const pageIndex = Math.min(requestedPageIndex, pageCount - 1);

  function handleFiltersChange(filters: {
    q?: string;
    currencies?: BankAccount["currency"][];
    goals?: BucketGoalFilter[];
  }) {
    void navigate({
      search: (previous) => {
        const next = { ...previous, ...filters, pageIndex: undefined };
        const canSortSubtotal = getSubtotalSortCurrency(
          getSelectedCurrencies(next.currencies ?? []),
        );

        return next.sortBy === "subtotal" && !canSortSubtotal
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
    handleFiltersChange({ q: undefined, currencies: undefined, goals: undefined });
  }

  function handleSortingChange(nextSorting: SortingState) {
    const [nextSort] = nextSorting;
    const nextSortBy = BUCKET_SORT_COLUMN_IDS.find((id) => id === nextSort?.id);
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
            total === buckets.length
              ? `${total} ${total === 1 ? "bucket" : "buckets"}`
              : `${total} of ${buckets.length} buckets`
          }
          action={
            <DrawerTrigger handle={setUpBucketDrawerHandle} render={<Button />}>
              <IconPlus />
              Set Up Bucket
            </DrawerTrigger>
          }
        >
          Buckets
        </InsetCardTitle>

        <InsetCardContent cardClassName="gap-0 py-0" className="gap-y-0 px-0">
          {isEmpty ? (
            <StateTemplate
              state="empty"
              title="No buckets yet."
              description="Create a bucket to start organizing your money."
              icon={<MODULE_ICONS.buckets />}
            />
          ) : (
            <>
              <section className="flex flex-col gap-y-4 border-b p-4">
                <BucketsOverview
                  currencyTotals={currencyTotals.filter(
                    (totals) =>
                      selectedCurrencies.length === 0 ||
                      selectedCurrencies.includes(totals.currency),
                  )}
                  buckets={bucketsInSelectedCurrencies}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <InputGroup className="sm:max-w-64">
                    <InputGroupAddon>
                      <IconSearch />
                    </InputGroupAddon>
                    <InputGroupInput
                      type="search"
                      aria-label="Search buckets"
                      placeholder="Search buckets..."
                      value={query}
                      onChange={(event) => handleQueryChange(event.target.value)}
                    />
                  </InputGroup>

                  {currencyTotals.length > 1 ? (
                    <CurrencyFilter
                      currencyCounts={currencyTotals.map(({ currency, bucketCount }) => ({
                        currency,
                        count: bucketCount,
                      }))}
                      selectedCurrencies={selectedCurrencies}
                      onSelectedCurrenciesChange={(currencies) =>
                        handleFiltersChange({
                          currencies: currencies.length ? currencies : undefined,
                        })
                      }
                    />
                  ) : null}

                  {hasGoals ? (
                    <BucketsGoalFilter
                      buckets={buckets}
                      selectedGoalFilters={selectedGoalFilters}
                      onSelectedGoalFiltersChange={(goals) =>
                        handleFiltersChange({ goals: goals.length ? goals : undefined })
                      }
                    />
                  ) : null}
                </div>
              </section>

              {total === 0 ? (
                <StateTemplate
                  state="empty"
                  title="No matching buckets."
                  description="No buckets match these filters. Try another name, currency or goal."
                  icon={<IconSearch />}
                  content={
                    <Button variant="secondary" onClick={handleClearFilters}>
                      Clear Filters
                    </Button>
                  }
                />
              ) : (
                <ControlledDataTable
                  columns={getIndexColumns({ subtotalSortCurrency, selectedCurrencies })}
                  data={filteredBuckets}
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
