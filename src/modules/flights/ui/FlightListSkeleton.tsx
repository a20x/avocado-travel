import { Card } from '@/shared/ui/Card';
import { Skeleton, SkeletonGroup } from '@/shared/ui/Skeleton';

/** Заглушка списка рейсов, пока идёт поиск: те же размеры, что у карточек. */
export function FlightListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonGroup label="Ищем рейсы…">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="grid gap-4 p-4 md:px-6 md:py-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-8" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-0.5" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-4 w-56" />
        </Card>
      ))}
    </SkeletonGroup>
  );
}
