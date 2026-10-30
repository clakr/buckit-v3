import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";

import { Button } from "#/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { LEDGER_PAGE_SIZES, type LedgerPaging } from "#/lib/ledger-page";

type Props = {
  paging: LedgerPaging;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: (typeof LEDGER_PAGE_SIZES)[number]) => void;
};

function getPageNumbers(current: number, count: number): (number | "gap")[] {
  const wanted = new Set([0, count - 1, current - 1, current, current + 1]);
  const pages = [...wanted].filter((page) => page >= 0 && page < count).sort((a, b) => a - b);

  return pages.flatMap((page, index) =>
    index > 0 && page - pages[index - 1] > 1 ? (["gap", page] as const) : [page],
  );
}

export function LedgerPager({ paging, onPageChange, onPageSizeChange }: Props) {
  const { pageIndex, pageSize, pageCount, total } = paging;

  if (total <= LEDGER_PAGE_SIZES[0]) return null;

  const first = pageIndex * pageSize + 1;
  const last = Math.min(first + pageSize - 1, total);
  const isFirstPage = pageIndex === 0;
  const isLastPage = pageIndex === pageCount - 1;

  return (
    <nav
      aria-label="Ledger pages"
      className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"
    >
      <div className="flex items-center gap-2">
        <span id="ledger-page-size-label">Rows per page</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) =>
            onPageSizeChange(Number(value) as (typeof LEDGER_PAGE_SIZES)[number])
          }
        >
          <SelectTrigger size="sm" aria-labelledby="ledger-page-size-label">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectGroup>
              {LEDGER_PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <span className="tabular-nums">
        {first}–{last} of {total}
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          aria-label="First page"
          disabled={isFirstPage}
          onClick={() => onPageChange(0)}
        >
          <IconChevronsLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous page"
          disabled={isFirstPage}
          onClick={() => onPageChange(pageIndex - 1)}
        >
          <IconChevronLeft />
        </Button>
        {getPageNumbers(pageIndex, pageCount).map((page, index) =>
          page === "gap" ? (
            <span key={`gap-${index}`} className="px-1">
              …
            </span>
          ) : (
            <Button
              key={page}
              variant={page === pageIndex ? "default" : "outline"}
              size="icon"
              aria-label={`Page ${page + 1}`}
              aria-current={page === pageIndex ? "page" : undefined}
              onClick={() => onPageChange(page)}
            >
              {page + 1}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon"
          aria-label="Next page"
          disabled={isLastPage}
          onClick={() => onPageChange(pageIndex + 1)}
        >
          <IconChevronRight />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Last page"
          disabled={isLastPage}
          onClick={() => onPageChange(pageCount - 1)}
        >
          <IconChevronsRight />
        </Button>
      </div>
    </nav>
  );
}
