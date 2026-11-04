import type { SortingState } from "@tanstack/react-table";

import { IconPlus, IconSearch } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import type { Debt } from "#/db/schema";
import type { DebtStatus } from "#/modules/debts/figures.server";

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
  DEBT_SORT_COLUMN_IDS,
  getIndexColumns,
  sortDebtsByQuietness,
} from "#/modules/debts/columns";
import { DebtsDirectionToggle } from "#/modules/debts/components/debts-direction-toggle";
import { DebtsOverview, getDebtCurrencyTotals } from "#/modules/debts/components/debts-overview";
import { DEBT_STATUSES, DebtsStatusFilter } from "#/modules/debts/components/debts-status-filter";
import { recordDebtDrawerHandle } from "#/modules/debts/components/record-debt-drawer";
import { debtsQueryOptions } from "#/modules/debts/query-options";

const debtsSearchSchema = z.object({
  pageIndex: z.number().int().min(0).optional().catch(undefined),
  pageSize: z.literal(PAGE_SIZES).optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  currencies: z.array(z.enum(CURRENCIES_CODES)).optional().catch(undefined),
  direction: z.enum(["receivable", "payable"]).optional().catch(undefined),
  statuses: z.array(z.enum(DEBT_STATUSES)).optional().catch(undefined),
  sortBy: z.enum(DEBT_SORT_COLUMN_IDS).optional().catch(undefined),
  sortDirection: z.enum(["asc", "desc"]).optional().catch(undefined),
});

const DEFAULT_SORTING: SortingState = [];

export const Route = createFileRoute("/_protected/debts/")({
  validateSearch: debtsSearchSchema,
  head: () => ({ meta: [{ title: formatPageTitle("Debts") }] }),
  context: () => ({ debtsQueryOptions }),
  loader: async ({ context: { queryClient, debtsQueryOptions } }) => {
    await queryClient.query(debtsQueryOptions);
  },
  pendingComponent: () => (
    <Main>
      <InsetCard>
        <InsetCardTitle as="h1">Debts</InsetCardTitle>
        <InsetCardContent>
          <StateTemplate
            state="loading"
            title="Loading debts..."
            description="Fetching your debts..."
          />
        </InsetCardContent>
      </InsetCard>
    </Main>
  ),
  errorComponent: () => (
    <Main>
      <InsetCard>
        <InsetCardTitle as="h1">Debts</InsetCardTitle>
        <InsetCardContent>
          <StateTemplate
            state="error"
            title="Could not load debts."
            description="We weren't able to retrieve your debts. Please try again."
            content={<RouteRetryButton />}
          />
        </InsetCardContent>
      </InsetCard>
    </Main>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { debtsQueryOptions } = Route.useRouteContext();
  const { data: debts } = useSuspenseQuery(debtsQueryOptions);
  const {
    pageIndex: requestedPageIndex = 0,
    pageSize = PAGE_SIZES[0],
    q = "",
    currencies: requestedCurrencies = [],
    direction: selectedDirection,
    statuses: selectedStatuses = [],
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

  const currencyTotals = getDebtCurrencyTotals(debts);
  const getSelectedCurrencies = (currencies: Debt["currency"][]) =>
    currencies.filter((currency) => currencyTotals.some((totals) => totals.currency === currency));
  const getOutstandingSortCurrency = (currencies: Debt["currency"][]) => {
    if (currencies.length === 1) return currencies[0];
    if (currencyTotals.length === 1) return currencyTotals[0].currency;
    return null;
  };

  const selectedCurrencies = getSelectedCurrencies(requestedCurrencies);
  const outstandingSortCurrency = getOutstandingSortCurrency(selectedCurrencies);
  const sorting =
    sortBy && (sortBy !== "outstanding" || outstandingSortCurrency)
      ? [{ id: sortBy, desc: sortDirection === "desc" }]
      : DEFAULT_SORTING;

  const normalizedQuery = query.trim().toLowerCase();
  const debtsInSelectedCurrencies = debts.filter(
    ({ currency }) => selectedCurrencies.length === 0 || selectedCurrencies.includes(currency),
  );
  const debtsInSelectedStatuses = debtsInSelectedCurrencies.filter(
    ({ status }) => selectedStatuses.length === 0 || selectedStatuses.includes(status),
  );
  const filteredDebts = sortDebtsByQuietness(debtsInSelectedStatuses).filter(
    ({ direction, name, note }) =>
      (!selectedDirection || direction === selectedDirection) &&
      (name.toLowerCase().includes(normalizedQuery) ||
        Boolean(note?.toLowerCase().includes(normalizedQuery))),
  );

  const isEmpty = debts.length === 0;
  const total = filteredDebts.length;
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const pageIndex = Math.min(requestedPageIndex, pageCount - 1);

  function handleFiltersChange(filters: {
    q?: string;
    currencies?: Debt["currency"][];
    direction?: Debt["direction"];
    statuses?: DebtStatus[];
  }) {
    void navigate({
      search: (previous) => {
        const next = { ...previous, ...filters, pageIndex: undefined };
        const canSortOutstanding = getOutstandingSortCurrency(
          getSelectedCurrencies(next.currencies ?? []),
        );

        return next.sortBy === "outstanding" && !canSortOutstanding
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
    handleFiltersChange({
      q: undefined,
      currencies: undefined,
      direction: undefined,
      statuses: undefined,
    });
  }

  function handleSortingChange(nextSorting: SortingState) {
    const [nextSort] = nextSorting;
    const nextSortBy = DEBT_SORT_COLUMN_IDS.find((id) => id === nextSort?.id);
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
            total === debts.length
              ? `${total} ${total === 1 ? "debt" : "debts"}`
              : `${total} of ${debts.length} debts`
          }
          action={
            <DrawerTrigger handle={recordDebtDrawerHandle} render={<Button />}>
              <IconPlus />
              Record Debt
            </DrawerTrigger>
          }
        >
          Debts
        </InsetCardTitle>

        <InsetCardContent cardClassName="gap-0 py-0" className="gap-y-0 px-0">
          {isEmpty ? (
            <StateTemplate
              state="empty"
              title="No debts yet."
              description="Record your first debt to start tracking what you owe or are owed."
              icon={<MODULE_ICONS.debts />}
            />
          ) : (
            <>
              <section className="flex flex-col gap-y-4 border-b p-4">
                <DebtsOverview
                  currencyTotals={currencyTotals.filter(
                    (totals) =>
                      selectedCurrencies.length === 0 ||
                      selectedCurrencies.includes(totals.currency),
                  )}
                  debts={debtsInSelectedCurrencies}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <DebtsDirectionToggle
                    debts={debtsInSelectedStatuses}
                    selectedDirection={selectedDirection}
                    onSelectedDirectionChange={(direction) => handleFiltersChange({ direction })}
                  />

                  <InputGroup className="sm:max-w-64">
                    <InputGroupAddon>
                      <IconSearch />
                    </InputGroupAddon>
                    <InputGroupInput
                      type="search"
                      aria-label="Search debts"
                      placeholder="Search debts..."
                      value={query}
                      onChange={(event) => handleQueryChange(event.target.value)}
                    />
                  </InputGroup>

                  {currencyTotals.length > 1 ? (
                    <CurrencyFilter
                      currencyCounts={currencyTotals.map(({ currency, debtCount }) => ({
                        currency,
                        count: debtCount,
                      }))}
                      selectedCurrencies={selectedCurrencies}
                      onSelectedCurrenciesChange={(currencies) =>
                        handleFiltersChange({
                          currencies: currencies.length ? currencies : undefined,
                        })
                      }
                    />
                  ) : null}

                  <DebtsStatusFilter
                    debts={debtsInSelectedCurrencies}
                    selectedStatuses={selectedStatuses}
                    onSelectedStatusesChange={(statuses) =>
                      handleFiltersChange({ statuses: statuses.length ? statuses : undefined })
                    }
                  />
                </div>
              </section>

              {total === 0 ? (
                <StateTemplate
                  state="empty"
                  title="No matching debts."
                  description="No debts match these filters. Try another name, direction, currency or status."
                  icon={<IconSearch />}
                  content={
                    <Button variant="secondary" onClick={handleClearFilters}>
                      Clear Filters
                    </Button>
                  }
                />
              ) : (
                <ControlledDataTable
                  columns={getIndexColumns({ outstandingSortCurrency })}
                  data={filteredDebts}
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
