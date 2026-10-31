import { queryOptions } from "@tanstack/react-query";

import { getDashboard } from "#/modules/dashboard/functions";

export const dashboardQueryOptions = queryOptions({
  queryKey: ["dashboard"],
  queryFn: getDashboard,
});
