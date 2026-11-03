import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTransition } from "react";

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
import { loadOrThrowRouteNotFound } from "#/lib/errors";
import { ledgerPageSearchSchema } from "#/lib/ledger-page";
import { PAGE_SIZES } from "#/lib/paging";
import { formatPageTitle } from "#/lib/utils";
import { AccountLedgerTable } from "#/modules/bank-accounts/components/account-ledger-table";
import { BankAccountActivity } from "#/modules/bank-accounts/components/bank-account-activity";
import { BankAccountDetailActions } from "#/modules/bank-accounts/components/bank-account-detail-actions";
import {
  bankAccountActivityQueryOption,
  bankAccountLedgerQueryOption,
  bankAccountQueryOption,
} from "#/modules/bank-accounts/query-options";

export const Route = createFileRoute("/_protected/accounts/$accountId")({
  validateSearch: ledgerPageSearchSchema,
  loaderDeps: ({ search: { pageIndex, pageSize } }) => ({ pageIndex, pageSize }),
  context: ({ params, deps }) => ({
    bankAccountQueryOptions: bankAccountQueryOption(params.accountId),
    bankAccountLedgerQueryOptions: bankAccountLedgerQueryOption(params.accountId, deps),
    bankAccountActivityQueryOptions: bankAccountActivityQueryOption(params.accountId),
  }),
  loader: async ({
    context: {
      queryClient,
      bankAccountQueryOptions,
      bankAccountLedgerQueryOptions,
      bankAccountActivityQueryOptions,
    },
  }) => {
    const [bankAccount] = await loadOrThrowRouteNotFound(
      Promise.all([
        queryClient.query(bankAccountQueryOptions),
        queryClient.query(bankAccountLedgerQueryOptions),
        queryClient.query(bankAccountActivityQueryOptions),
      ]),
    );

    return { name: bankAccount.name };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: formatPageTitle(loaderData?.name ?? "Account") }],
  }),
  pendingComponent: () => (
    <Main>
      <InsetCard>
        <InsetCardTitle as="h1">Account</InsetCardTitle>
        <InsetCardContent>
          <StateTemplate
            state="loading"
            title="Loading account..."
            description="Fetching account details and history..."
          />
        </InsetCardContent>
      </InsetCard>
    </Main>
  ),
  notFoundComponent: () => (
    <Main>
      <InsetCard>
        <InsetCardTitle as="h1">Account</InsetCardTitle>
        <InsetCardContent>
          <StateTemplate
            state="error"
            title="Account not found"
            description="This account doesn't exist or may have been deleted."
            content={
              <Button variant="secondary" nativeButton={false} render={<Link to="/accounts" />}>
                Go back to accounts
              </Button>
            }
          />
        </InsetCardContent>
      </InsetCard>
    </Main>
  ),
  errorComponent: () => (
    <Main>
      <InsetCard>
        <InsetCardTitle as="h1">Account</InsetCardTitle>
        <InsetCardContent>
          <StateTemplate
            state="error"
            title="Could not load account"
            description="We weren't able to retrieve this account. Please check your connection and try again."
            content={<RouteRetryButton />}
          />
        </InsetCardContent>
      </InsetCard>
    </Main>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { accountId } = Route.useParams();
  const { bankAccountQueryOptions, bankAccountActivityQueryOptions } = Route.useRouteContext();
  const page = Route.useSearch();
  const navigate = Route.useNavigate();
  const [isPending, startTransition] = useTransition();

  const { data: bankAccount } = useSuspenseQuery(bankAccountQueryOptions);
  const { data: activity } = useSuspenseQuery(bankAccountActivityQueryOptions);
  const { data: ledgerPage } = useSuspenseQuery(bankAccountLedgerQueryOption(accountId, page));
  const { pageIndex, pageSize, pageCount, total } = ledgerPage;

  return (
    <Main>
      <InsetCard>
        <InsetCardTitle
          as="h1"
          className="[&_h1]:capitalize"
          subtitle={`${bankAccount.currency} account · ${total} ${total === 1 ? "entry" : "entries"}`}
          action={<BankAccountDetailActions bankAccountId={accountId} />}
        >
          {bankAccount.name}
        </InsetCardTitle>

        <InsetCardContent cardClassName="gap-0 py-0" className="gap-y-0 px-0">
          <BankAccountActivity bankAccount={bankAccount} activity={activity} />
          <AccountLedgerTable
            bankAccount={bankAccount}
            ledgerPage={ledgerPage}
            isPending={isPending}
          />
        </InsetCardContent>

        {total > PAGE_SIZES[0] ? (
          <InsetCardFooter>
            <Pager
              paging={{ pageIndex, pageSize, pageCount, total }}
              onPageChange={(nextPageIndex) =>
                startTransition(async () => {
                  await navigate({ search: { pageIndex: nextPageIndex, pageSize } });
                })
              }
              onPageSizeChange={(nextPageSize) =>
                startTransition(async () => {
                  await navigate({ search: { pageIndex: 0, pageSize: nextPageSize } });
                })
              }
            />
          </InsetCardFooter>
        ) : null}
      </InsetCard>
    </Main>
  );
}
