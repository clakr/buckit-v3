---
status: accepted
---

# A Goal is a target on a Bucket, not a money container

A Goal is a savings target attached to exactly one Bucket. It has a target amount, a currency and an optional date, and it measures its Bucket's Subtotal in that currency. Money never goes to a Goal directly. It goes to the Bucket through Allocations, as it always has. A Bucket has at most one Goal.

Before this, `CONTEXT.md` left the Goal's shape open, and the Distribution entry spoke of splitting money "across Goals and Debts", which read as if a Goal could receive Allocations itself.

## Considered options

- **A Goal holds money itself, alongside Buckets.** Rejected. Allocations would need to point at either a Bucket or a Goal, and every rule a Bucket already enforces would have to be built a second time: Unallocated never going negative, Withdrawals, what's held per Bank Account never going negative, and the cascade on deleting a Bank Account. It would also leave two near-identical concepts for "money set aside for something."
- **A Goal sums several Buckets.** Rejected. Progress would have to be added up across Buckets, and one Bucket could count toward two Goals, double-counting the same money.
- **A target on one Bucket.** Chosen. The Bucket keeps doing the hard part, holding earmarked money with its rules enforced, and a Goal adds only a target and a date on top.

## Consequences

- Funding a Goal means allocating to its Bucket. Distribution, once designed, splits across Buckets and Debts, never Goals.
- A Goal's Progress is what the Bucket holds now, so a Withdrawal lowers it. Status is computed, and a Goal that was Reached and then spent goes back to In progress.
- A Goal's currency is fixed, and money the Bucket holds in other currencies doesn't count toward it, because the app never converts currencies.
- Reversing this means migrating Allocations to point at Goals, so it is hard to undo.
