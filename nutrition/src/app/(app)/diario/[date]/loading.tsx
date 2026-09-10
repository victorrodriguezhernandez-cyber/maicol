import { Skeleton } from "@/components/ui/Skeleton";

export default function DiaryDateLoading() {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex items-center justify-between pb-1">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>

      <div className="surface-hero flex items-center justify-between p-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-[58px] w-[58px] rounded-full" />
      </div>

      <div className="surface-panel grid grid-cols-2 gap-4 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-[5px] w-full rounded-full" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
