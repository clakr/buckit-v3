import { useMutation } from "@tanstack/react-query";

import { addBucket } from "#/modules/buckets/functions";

export function useAddBucketMutation() {
  return useMutation({
    mutationFn: addBucket,
    meta: {
      success: {
        title: "Bucket created",
        description: "[name] has been created.",
        toReplace: ["name"],
      },
      error: {
        title: "Failed to create bucket",
        description: "Please try again.",
      },
    },
  });
}
