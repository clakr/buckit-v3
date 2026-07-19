import { queryOptions } from "@tanstack/react-query";

import { getBankAccounts } from "#/modules/accounts/functions";

export const bankAccountsQueryOptions = queryOptions({
  queryKey: ["bank-accounts"],
  queryFn: getBankAccounts,
});
