---
status: ready-for-agent
module: dashboard
---

# Spec: Dashboard

## Problem statement

Every other screen shows one kind of thing: Accounts, Buckets, Debts or Distributions. A user who opens the app wants to know where they stand overall. That means how much money they have, how much of it is spoken for, what changed lately, and which Goals and Debts need attention. Before `/dashboard` had real content, it was a placeholder with a logout button and a dump of the route context.

## Solution

`/dashboard` is a read-only overview of one currency at a time, with shortcuts to the most common writes. It never converts between currencies, so every figure, chart and list on the page belongs to the currency picked in the header. The page loads everything in one server call (`getDashboard`), and switching currency only changes which summary the client shows.

The page was built in issues #55 and #89 to #94 between 2026-10-28 and 2026-10-31. A review on 2026-11-03 reworked the layout for phones, the account breakdown chart, the income and expense chart and the server queries. This spec recaps both, so test cases can be written against the whole page.

## User stories

### Already implemented: picking a currency and acting

1. As a user with Bank Accounts in several currencies, I want to pick which currency the dashboard shows, so I never see amounts in different currencies added together. The choice lives in the URL as `?currency=`, and an unknown or missing value falls back to the currency with the largest Balance. With only one currency there is no picker.
2. As a user, I want Log Transaction, Allocate Money and Trigger Distribution in the header for the selected currency. With one Account, Log Transaction and Allocate Money open straight away. With several, they first ask which Account. Trigger Distribution lists that currency's Distributions.
3. As a user, I want a header action that can't work yet to stay visible but disabled, with a reason on hover or focus, such as "Register a PHP account first", "Set up a bucket first" or "Save a PHP distribution first".
4. As a new user, I want a Getting Started card listing three steps (register an Account, set up a Bucket, allocate money), with done steps ticked and a button on each open step. The card disappears once all three are done. The Allocate Money step starts from the Account with the most Unallocated.

### Already implemented: the figures

5. As a user, I want four tiles for the selected currency: Balance (with its change over the last 90 days and a sparkline), Unallocated, Earmarked in Buckets, and Net Debts (owed to me minus what I owe, amber when negative, with both parts listed underneath).
6. As a user, I want a Balance Trend chart of the combined Balance across that currency's Accounts over the last 90 days. With no Transactions in the window it shows an empty state instead.
7. As a user, I want an Income vs Expense chart with one pair of bars per month for the last 6 months.
8. As a user, I want a Where It Sits chart showing each Account's Balance split into Unallocated and Earmarked, with Register Account and View Accounts below it.

### Already implemented: the lists

9. As a user, I want a Goals card listing that currency's Goals, Overdue first, then by nearest target date, then by name. Each row shows the Bucket name, status, progress ring and amounts, and links to the Bucket. The card shows 5 and says "Showing 5 of n Goals" when there are more.
10. As a user, I want a Debts card listing that currency's open Debts, largest Outstanding first. Each row shows the name, direction, progress ring and amounts, and links to the Debt. It shows 5, with the same "Showing 5 of n" note, and has Record Debt and View All below.
11. As a user, I want a Recent Activity card listing the newest 10 movements in that currency: Transactions, Allocations and Repayments, newest first. Each row shows what kind of movement it is, links to its Account, Bucket or Debt, and gives the date and signed amount. A Repayment logged through a Bank Account shows once, as the Repayment and not also as its Transaction.

### Changed on 2026-11-03

12. As a user on a phone, I want the dashboard to fit the screen with no sideways scrolling. The title, currency picker and actions share one row that wraps. Below the `sm` breakpoint the three actions show icons only, and their labels stay readable to screen readers.
13. As a user with more than 4 currencies, I want the currency picker to be a dropdown instead of a long row of toggle buttons. With 2 to 4 currencies it stays a toggle group. It sits beside the page title, because it sets what the whole page shows. The actions stay on the right.
14. As a user with many Accounts, I want Where It Sits to stay readable. Bars run horizontally, one per row. Names are shortened to one line on the left, and each Account's Balance shows in compact form on the right, such as ₱1.4M. It shows the 7 largest Accounts and groups the rest into an "Other (n)" bar, with the note "Largest 7 of n Accounts, the rest grouped as Other". With 8 or fewer it shows them all. Hovering a bar shows the exact Unallocated and Earmarked amounts.
15. As a user, I want Income vs Expense to count only money I actually earned or spent. A Debt's originating Transaction and every Repayment's Transaction are left out, because lending and repaying move money without earning or spending it. A Withdrawal's expense still counts, because that money was spent. The current month's bars are faded, its tooltip says "(to date)", and the card description says so.
16. As a user, I want a Withdrawal in Recent Activity to read "Withdrawal · <Bucket>" and link to the Bucket, instead of a plain "Expense · <Account>".
17. As a user, I want the Goals card's button to add a Goal to a Bucket I already have. "Add Goal" lists every Bucket without a Goal and opens Add Goal for the one I pick. The list ends with "New Bucket" for starting fresh. With no goal-less Bucket, the button is "New Bucket" and opens Set Up Bucket. The button used to say "Create Goal" but only ever created a new Bucket.
18. As a user, I want a loading state shaped like the dashboard, instead of a single spinner, so the page doesn't jump when the data arrives.

## Implementation decisions

- **One server call.** `getDashboard` (`src/modules/dashboard/functions.ts`) runs every query in one `Promise.all`. `getCurrencySummaries` (`utils.ts`) folds the results into one `CurrencySummary` per currency, and `selectCurrencySummary` picks the one to show. Successful mutations already invalidate every query except the Session, so the dashboard refetches after any write.
- **Recent Activity in two queries.** `getRecentLedgerMovements` (`activity.server.ts`) ranks Transactions and Allocations with `row_number() over (partition by currency order by date desc, createdAt desc)` and keeps the top 10 per currency. That makes two queries however many currencies the user has. Before, it ran two queries per currency, and only after the Bank Account query had finished, to learn which currencies existed. Repayment Transactions are left out with a left join on `repayments.transactionId`, which is unique and indexed. The old `NOT IN (SELECT transactionId FROM repayments)` read every user's repayments. Repayments themselves come from `getDebtsWithFigures`, which already loads every repayment to compute Outstanding, so picking the newest 10 from it costs nothing more.
- **Income vs Expense.** `getCashflowByCurrency` (`cashflow.server.ts`) left-joins `repayments` and `debts.originatingTransactionId` and keeps only Transactions matching neither. Months are UTC months, like the Account ledgers. The planned Transfer between own accounts (`docs/specs/transaction-list-and-transfer.md`) will write an ordinary expense and income pair, and both halves should be left out here too.
- **Where It Sits.** It is a vertical-layout recharts `BarChart` with one category axis per side, both keyed by the Account id. Keying by id keeps two Accounts with the same name as separate bars. The left axis draws its own single-line `<text>` ticks, because recharts wraps tick text to the axis width. The chart's height grows with the number of rows.
- **Legends follow series order.** Recharts 3 sorts legend items by name by default. Both bar charts pass `itemSorter={null}`, so Income comes before Expense and Unallocated before Earmarked.
- **Copy.** Card titles and card empty states use Title Case, such as "Getting Started", "Net Debts" and "No PHP Activity". The page-level loading and error states keep the sentence case every route uses, such as "Could not load dashboard.".

## Out of scope

- **A "View All" link on Recent Activity.** There is no all-Transactions list to link to yet. It is specified, not built, in `docs/specs/transaction-list-and-transfer.md`, and the link should be added once it exists.
- **Time zones.** Every chart uses UTC days and months, like the Account ledger, the Unallocated check and the Accounts list trend. The date picker returns local midnight and the default date is now, so for a user east of UTC, such as in Manila (UTC+8), a Transaction logged between midnight and 8am lands on the previous UTC day. On the 1st of a month, that's the previous month. Fixing it is app-wide, not dashboard work.
- **Converting currencies** to show one grand total.

## Further notes

- `CONTEXT.md` defines Balance, Unallocated, Earmarked (Allocated minus Withdrawals), Outstanding, Goal status and Progress. The dashboard only reads them.
- The Goal module spec says a Goal appears "as a lane on the Dashboard". The Goals card is that lane.
