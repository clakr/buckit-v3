import { IconPlus } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Heading } from "#/components/heading";
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
import { Button } from "#/components/ui/button";
import { DrawerTrigger } from "#/components/ui/drawer";
import { MODULE_ICONS } from "#/lib/constants";
import { PAGE_SIZES } from "#/lib/paging";
import { formatPageTitle } from "#/lib/utils";
import { INDEX_COLUMNS } from "#/modules/bank-accounts/columns";
import { AccountsTable } from "#/modules/bank-accounts/components/accounts-table";
import { registerBankAccountDrawerHandle } from "#/modules/bank-accounts/components/register-bank-account-drawer";
import { bankAccountsWithTrendQueryOption } from "#/modules/bank-accounts/query-options";

const accountsSearchSchema = z.object({
  pageIndex: z.number().int().min(0).optional().catch(undefined),
  pageSize: z.literal(PAGE_SIZES).optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/accounts/")({
  validateSearch: accountsSearchSchema,
  head: () => ({ meta: [{ title: formatPageTitle("Accounts") }] }),
  context: () => ({ bankAccountsQueryOptions: bankAccountsWithTrendQueryOption() }),
  loader: async ({ context: { queryClient, bankAccountsQueryOptions } }) => {
    await queryClient.query(bankAccountsQueryOptions);
  },
  pendingComponent: () => (
    <Main>
      <Heading>Accounts</Heading>

      <StateTemplate
        state="loading"
        title="Loading accounts..."
        description="Fetching your bank accounts..."
      />
    </Main>
  ),
  errorComponent: () => (
    <Main>
      <Heading>Accounts</Heading>

      <StateTemplate
        state="error"
        title="Could not load accounts."
        description="We weren't able to retrieve your accounts. Please try again."
        content={<RouteRetryButton />}
      />
    </Main>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { bankAccountsQueryOptions } = Route.useRouteContext();
  const { data: bankAccounts } = useSuspenseQuery(bankAccountsQueryOptions);
  const { pageIndex: requestedPageIndex = 0, pageSize = PAGE_SIZES[0] } = Route.useSearch();
  const navigate = Route.useNavigate();

  const isEmpty = bankAccounts.length === 0;
  const total = bankAccounts.length;
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const pageIndex = Math.min(requestedPageIndex, pageCount - 1);

  return (
    <Main>
      <InsetCard>
        <InsetCardTitle
          as="h1"
          subtitle={`${bankAccounts.length} ${bankAccounts.length === 1 ? "account" : "accounts"}`}
          action={
            <DrawerTrigger
              handle={registerBankAccountDrawerHandle}
              payload={{ currency: "PHP" }}
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
            <AccountsTable
              columns={INDEX_COLUMNS}
              data={bankAccounts}
              initialSorting={[{ id: "lastTransactionDate", desc: true }]}
              pageIndex={pageIndex}
              pageSize={pageSize}
              onSortingChange={() => {
                if (pageIndex !== 0) navigate({ search: { pageIndex: 0, pageSize } });
              }}
            />
          )}
        </InsetCardContent>

        {total > PAGE_SIZES[0] ? (
          <InsetCardFooter>
            <Pager
              paging={{ pageIndex, pageSize, pageCount, total }}
              onPageChange={(nextPageIndex) =>
                navigate({ search: { pageIndex: nextPageIndex, pageSize } })
              }
              onPageSizeChange={(nextPageSize) =>
                navigate({ search: { pageIndex: 0, pageSize: nextPageSize } })
              }
            />
          </InsetCardFooter>
        ) : null}
      </InsetCard>
    </Main>
  );
}
