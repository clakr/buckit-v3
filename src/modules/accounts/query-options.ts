import { queryOptions } from "@tanstack/react-query";
import { Result } from "better-result";

import type { ExtractSerializedErr, ExtractSerializedOk } from "#/lib/types";

import { getBankAccounts } from "./functions";

export const bankAccountsQueryOptions = queryOptions({
  queryKey: ["bank-accounts"],
  queryFn: async () => {
    const networkResult = await Result.tryPromise({
      try: getBankAccounts,
      catch: (e) => (e instanceof TypeError ? e.message : e),
    });

    if (networkResult.status === "error")
      throw new Error(
        networkResult.error instanceof Error
          ? networkResult.error.message
          : String(networkResult.error),
      );

    const server = Result.deserialize<
      ExtractSerializedOk<typeof networkResult.value>,
      ExtractSerializedErr<typeof networkResult.value>
    >(networkResult.value);

    if (server.status === "error") throw new Error(String(server.error));

    return server.value;
  },
});
