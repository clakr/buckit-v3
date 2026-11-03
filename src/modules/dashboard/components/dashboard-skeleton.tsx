import { Skeleton } from "#/components/ui/skeleton";

const KPI_TILE_COUNT = 4;
const LIST_CARD_COUNT = 3;

export function DashboardSkeleton() {
  return (
    <div role="status" aria-busy className="flex flex-col gap-y-3">
      <span className="sr-only">Loading dashboard...</span>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: KPI_TILE_COUNT }, (_, index) => (
          <Skeleton key={index} className="h-34" />
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-10">
        <Skeleton className="h-79 lg:col-span-6" />
        <Skeleton className="h-79 lg:col-span-4" />
      </div>

      <Skeleton className="h-96" />

      <div className="grid gap-3 lg:grid-cols-3">
        {Array.from({ length: LIST_CARD_COUNT }, (_, index) => (
          <Skeleton key={index} className="h-148" />
        ))}
      </div>
    </div>
  );
}
