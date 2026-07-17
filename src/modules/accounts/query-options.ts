import { queryOptions } from "@tanstack/react-query";

import { getBankAccounts } from "./functions";

export const bankAccountsQueryOptions = queryOptions({
  queryKey: ["bank-accounts"],
  queryFn: getBankAccounts,
});
