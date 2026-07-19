# Delete Bucket

## Design Decisions

- Delete cascades all allocations with the money returning to source accounts. This avoids requiring the user to manually delete every allocation before removing a bucket (which would be tedious for buckets with many allocations).
- The warning dialog shows the count and total per currency to prevent accidental deletion of a heavily-funded bucket.
- Cascade is chosen over blocking because a bucket with allocations is the expected state — requiring manual cleanup defeats the purpose of the bucket as an organizational tool.

## Trigger

User clicks "Delete" from the bucket list or bucket detail page.

## Behavior

1. Count the number of Allocations referencing this Bucket, grouped by currency with totals.
2. Show a confirmation dialog with details:
   - If there are allocations: "Delete [bucket name]? This will also remove [N] allocations ([total QAR] + [total PHP]). Money will return to the source accounts' unallocated pools. This action cannot be undone."
   - If there are zero allocations: "Delete [bucket name]? This action cannot be undone."
3. On confirm → cascade-delete the Bucket and all its Allocations. Redirect to buckets list.

## Toast

### Success Message

- **Title:** Bucket deleted
- **Description:** [name] has been removed. Money has returned to source accounts.

### Error Message

- **Title:** Failed to delete bucket
- **Description:** Please try again.

## Edge Cases

- Bucket with no allocations → simple confirmation, no cascade.
- Bucket with allocations from 3+ currencies → all currencies listed in the warning.
- Bucket is shared reference in many accounts → all allocations cascade regardless of source account.
