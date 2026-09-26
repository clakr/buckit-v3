import { queryOptions } from "@tanstack/react-query";

import { getDebts } from "#/modules/debts/functions";

export const debtsQueryOptions = queryOptions({
  queryKey: ["debts"],
  queryFn: getDebts,
});

// export function bucketQueryOption(bucketId: Bucket["id"]) {
//   return queryOptions({
//     queryKey: ["buckets", bucketId],
//     queryFn: () =>
//       getBucket({
//         data: {
//           bucketId,
//         },
//       }),
//   });
// }
