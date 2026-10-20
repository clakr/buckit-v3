import { queryOptions } from "@tanstack/react-query";

import { getSession } from "#/modules/authentication/functions";

export function sessionQueryOption() {
  return queryOptions({
    queryKey: ["session"],
    queryFn: () => getSession(),
    staleTime: Infinity,
    meta: { keepOnWrite: true },
  });
}
