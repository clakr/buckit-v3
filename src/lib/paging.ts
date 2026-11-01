export const PAGE_SIZES = [10, 25, 50] as const;

export type PageSize = (typeof PAGE_SIZES)[number];

export type Paging = {
  pageIndex: number;
  pageSize: PageSize;
  pageCount: number;
  total: number;
};
