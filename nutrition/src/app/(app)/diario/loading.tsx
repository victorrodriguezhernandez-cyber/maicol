import { Skeleton } from "@/components/ui/Skeleton";

export default function DiarioLoading() {
  return (
    <div className="flex flex-col gap-1 pb-6">
      <div className="flex items-baseline justify-between pb-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="flex flex-col">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-[var(--border-soft)] py-3">
            <Skeleton className="h-9 w-[3px] shrink-0 rounded-full" />
            <div className="flex w-14 shrink-0 flex-col gap-1">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-2.5 w-10" />
            </div>
            <Skeleton className="h-8 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
