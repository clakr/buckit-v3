import { useMutation } from "@tanstack/react-query";

import { addBucket } from "#/modules/buckets/functions";

export function useAddBucketMutation() {
  return useMutation({
    mutationFn: addBucket,
    meta: {
      success: {
        title: "Bucket Created",
        description: "Your bucket has been created.",
      },
      error: {
        title: "Failed to Create Bucket",
        description: "Please try again.",
      },
    },
  });
}
