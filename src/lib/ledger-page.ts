import { z } from "zod";

export const LEDGER_PAGE_SIZES = [10, 25, 50] as const;

export const DEFAULT_LEDGER_PAGE = { pageIndex: 0, pageSize: LEDGER_PAGE_SIZES[0] };

export const ledgerPageSchema = z.object({
  pageIndex: z.number().int().min(0),
  pageSize: z.literal(LEDGER_PAGE_SIZES),
});

export type LedgerPageRequest = z.infer<typeof ledgerPageSchema>;

export type LedgerPaging = {
  pageIndex: number;
  pageSize: LedgerPageRequest["pageSize"];
  pageCount: number;
  total: number;
};

export function getLedgerPage<T>(
  newestFirst: T[],
  { pageIndex, pageSize }: LedgerPageRequest,
): LedgerPaging & { items: T[]; end: number } {
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
