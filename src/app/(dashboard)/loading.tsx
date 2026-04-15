import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function LoadingCard({
  className,
}: {
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <LoadingCard />
        <LoadingCard />
      </div>

      <div className="grid flex-1 grid-cols-12 gap-4">
        <LoadingCard className="col-span-12 min-h-[280px] sm:col-span-6 xl:col-span-4" />
        <LoadingCard className="col-span-12 min-h-[280px] sm:col-span-6 xl:col-span-3" />
        <LoadingCard className="col-span-12 min-h-[280px] sm:col-span-6 xl:col-span-2" />
        <LoadingCard className="col-span-12 min-h-[280px] sm:col-span-6 xl:col-span-3" />
      </div>
    </div>
  );
}
