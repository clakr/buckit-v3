import { queryOptions } from "@tanstack/react-query";

import { getSession } from "#/modules/authentication/functions";

/**
 * The signed-in User, or `null`. Read once and kept: the Session module clears the cache whenever
 * a Session starts or ends, and a Session that ends while cached is caught by the next request's
 * `UnauthorizedError`, which signs the client out.
 */
export function sessionQueryOption() {
  return queryOptions({
    queryKey: ["session"],
    queryFn: () => getSession(),
    staleTime: Infinity,
  });
}
