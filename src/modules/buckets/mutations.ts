import { useMutation } from "@tanstack/react-query";

import {
  addBucket,
  deleteBucket,
  editBucket,
} from "#/modules/buckets/functions";

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

export function useEditBucketMutation() {
  return useMutation({
    mutationFn: editBucket,
    meta: {
      success: {
        title: "Bucket Updated",
        description: "Your changes have been saved.",
      },
      error: {
        title: "Failed to Update Bucket",
        description: "Please try again.",
      },
    },
  });
}

export function useDeleteBucketMutation() {
  return useMutation({
    mutationFn: deleteBucket,
    meta: {
      success: {
        title: "Bucket Deleted",
        description: "The bucket and all its allocations have been removed.",
      },
      error: {
        title: "Failed to Delete Bucket",
        description: "Please try again.",
      },
    },
  });
}
