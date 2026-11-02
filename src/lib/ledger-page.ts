import { z } from "zod";

import { PAGE_SIZES, type Paging } from "#/lib/paging";

export const DEFAULT_LEDGER_PAGE = { pageIndex: 0, pageSize: PAGE_SIZES[0] };

export const ledgerPageSchema = z.object({
  pageIndex: z.number().int().min(0),
  pageSize: z.literal(PAGE_SIZES),
});

export const ledgerPageSearchSchema = z.object({
  pageIndex: ledgerPageSchema.shape.pageIndex
    .default(DEFAULT_LEDGER_PAGE.pageIndex)
    .catch(DEFAULT_LEDGER_PAGE.pageIndex),
  pageSize: ledgerPageSchema.shape.pageSize
    .default(DEFAULT_LEDGER_PAGE.pageSize)
    .catch(DEFAULT_LEDGER_PAGE.pageSize),
});

export type LedgerPageRequest = z.infer<typeof ledgerPageSchema>;

export function getLedgerPage<T>(
  newestFirst: T[],
  { pageIndex, pageSize }: LedgerPageRequest,
): Paging & { items: T[]; end: number } {
  const total = newestFirst.length;
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const clampedPageIndex = Math.min(pageIndex, pageCount - 1);
  const start = clampedPageIndex * pageSize;
  const items = newestFirst.slice(start, start + pageSize);

  return {
    items,
    end: start + items.length,
    pageIndex: clampedPageIndex,
    pageSize,
    pageCount,
    total,
  };
}
