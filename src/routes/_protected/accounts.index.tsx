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
  BANK_ACCOUNT_SORT_COLUMN_IDS,
  getIndexColumns,
  isAmountSortColumn,
} from "#/modules/bank-accounts/columns";
import {
  AccountsOverview,
  getCurrencyTotals,
} from "#/modules/bank-accounts/components/accounts-overview";
import { registerBankAccountDrawerHandle } from "#/modules/bank-accounts/components/register-bank-account-drawer";
import { bankAccountsWithTrendQueryOption } from "#/modules/bank-accounts/query-options";

const accountsSearchSchema = z.object({
  pageIndex: z.number().int().min(0).optional().catch(undefined),
  pageSize: z.literal(PAGE_SIZES).optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  currencies: z.array(z.enum(CURRENCIES_CODES)).optional().catch(undefined),
  sortBy: z.enum(BANK_ACCOUNT_SORT_COLUMN_IDS).optional().catch(undefined),
  sortDirection: z.enum(["asc", "desc"]).optional().catch(undefined),
});

const DEFAULT_SORT = { id: "lastTransactionDate", desc: true };
const DEFAULT_SORTING: SortingState = [DEFAULT_SORT];

export const Route = createFileRoute("/_protected/accounts/")({
  validateSearch: accountsSearchSchema,
  head: () => ({ meta: [{ title: formatPageTitle("Accounts") }] }),
  context: () => ({ bankAccountsQueryOptions: bankAccountsWithTrendQueryOption() }),
  loader: async ({ context: { queryClient, bankAccountsQueryOptions } }) => {
    await queryClient.query(bankAccountsQueryOptions);
  },
  pendingComponent: () => (
    <Main>
      <InsetCard>
        <InsetCardTitle as="h1">Accounts</InsetCardTitle>
        <InsetCardContent>
          <StateTemplate
            state="loading"
            title="Loading accounts..."
            description="Fetching your bank accounts..."
          />
        </InsetCardContent>
      </InsetCard>
    </Main>
  ),
  errorComponent: () => (
    <Main>
      <InsetCard>
        <InsetCardTitle as="h1">Accounts</InsetCardTitle>
        <InsetCardContent>
          <StateTemplate
            state="error"
            title="Could not load accounts."
            description="We couldn't load your accounts. Please try again."
            content={<RouteRetryButton />}
          />
        </InsetCardContent>
      </InsetCard>
    </Main>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { bankAccountsQueryOptions } = Route.useRouteContext();
  const { data: bankAccounts } = useSuspenseQuery(bankAccountsQueryOptions);
  const {
    pageIndex: requestedPageIndex = 0,
    pageSize = PAGE_SIZES[0],
    q = "",
    currencies: requestedCurrencies = [],
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

  const currencyTotals = getCurrencyTotals(bankAccounts);
  const getSelectedCurrencies = (currencies: BankAccount["currency"][]) =>
    currencies.filter((currency) => currencyTotals.some((totals) => totals.currency === currency));
  const getCanSortAmounts = (currencies: BankAccount["currency"][]) =>
    currencyTotals.length === 1 || currencies.length === 1;

  const selectedCurrencies = getSelectedCurrencies(requestedCurrencies);
  const isInSelectedCurrencies = (currency: string) =>
    selectedCurrencies.length === 0 || selectedCurrencies.includes(currency);
  const canSortAmounts = getCanSortAmounts(selectedCurrencies);
  const sorting =
    sortBy && sortDirection && (canSortAmounts || !isAmountSortColumn(sortBy))
      ? [{ id: sortBy, desc: sortDirection === "desc" }]
      : DEFAULT_SORTING;

  const normalizedQuery = query.trim().toLowerCase();
  const filteredAccounts = bankAccounts.filter(
    (bankAccount) =>
      isInSelectedCurrencies(bankAccount.currency) &&
      bankAccount.name.toLowerCase().includes(normalizedQuery),
  );

  const isEmpty = bankAccounts.length === 0;
  const total = filteredAccounts.length;
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const pageIndex = Math.min(requestedPageIndex, pageCount - 1);

  function handleFiltersChange(filters: { q?: string; currencies?: BankAccount["currency"][] }) {
    void navigate({
      search: (previous) => {
        const next = { ...previous, ...filters, pageIndex: undefined };
        const canSortNextAmounts = getCanSortAmounts(getSelectedCurrencies(next.currencies ?? []));

        return next.sortBy && isAmountSortColumn(next.sortBy) && !canSortNextAmounts
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
    handleFiltersChange({ q: undefined, currencies: undefined });
  }

  function handleSortingChange(nextSorting: SortingState) {
    const [nextSort] = nextSorting;
    const nextSortBy = BANK_ACCOUNT_SORT_COLUMN_IDS.find((id) => id === nextSort?.id);
    const isDefault =
      !nextSort ||
      !nextSortBy ||
      (nextSort.id === DEFAULT_SORT.id && nextSort.desc === DEFAULT_SORT.desc);

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
            total === bankAccounts.length
              ? `${total} ${total === 1 ? "account" : "accounts"}`
              : `${total} of ${bankAccounts.length} accounts`
          }
          action={
            <DrawerTrigger
              handle={registerBankAccountDrawerHandle}
              payload={{
                currency: selectedCurrencies.length === 1 ? selectedCurrencies[0] : "PHP",
              }}
              render={<Button />}
            >
              <IconPlus />
              Register Account
            </DrawerTrigger>
          }
        >
          Accounts
        </InsetCardTitle>

        <InsetCardContent cardClassName="gap-0 py-0" className="gap-y-0 px-0">
          {isEmpty ? (
            <StateTemplate
              state="empty"
              title="No accounts yet."
              description="Add your first bank account to start tracking."
              icon={<MODULE_ICONS.accounts />}
            />
          ) : (
            <>
              <section className="flex flex-col gap-y-4 border-b p-4">
                <AccountsOverview
                  currencyTotals={currencyTotals.filter((totals) =>
                    isInSelectedCurrencies(totals.currency),
                  )}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <InputGroup className="sm:max-w-64">
                    <InputGroupAddon>
                      <IconSearch />
                    </InputGroupAddon>
                    <InputGroupInput
                      type="search"
                      aria-label="Search accounts"
                      placeholder="Search accounts..."
                      value={query}
                      onChange={(event) => handleQueryChange(event.target.value)}
                    />
                  </InputGroup>

                  {currencyTotals.length > 1 ? (
                    <CurrencyFilter
                      currencyCounts={currencyTotals.map(({ currency, accountCount }) => ({
                        currency,
                        count: accountCount,
                      }))}
                      selectedCurrencies={selectedCurrencies}
                      onSelectedCurrenciesChange={(currencies) =>
                        handleFiltersChange({
                          currencies: currencies.length ? currencies : undefined,
                        })
                      }
                    />
                  ) : null}
                </div>
              </section>

              {total === 0 ? (
                <StateTemplate
                  state="empty"
                  title="No matching accounts."
                  description="No accounts match these filters. Try another name or currency."
                  icon={<IconSearch />}
                  content={
                    <Button variant="secondary" onClick={handleClearFilters}>
                      Clear Filters
                    </Button>
                  }
                />
              ) : (
                <ControlledDataTable
                  columns={getIndexColumns({ canSortAmounts })}
                  data={filteredAccounts}
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
