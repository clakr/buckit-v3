import { queryOptions } from "@tanstack/react-query";

import { getDistributions } from "#/modules/distributions/functions";

export const distributionsQueryOptions = queryOptions({
  queryKey: ["distributions"],
  queryFn: getDistributions,
});
