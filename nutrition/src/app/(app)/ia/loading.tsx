import { Skeleton } from "@/components/ui/Skeleton";

export default function IaLoading() {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex flex-col gap-1.5 pb-1">
        <Skeleton className="h-3.5 w-52" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="surface-hero flex flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-52" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-full" />
    </div>
  );
}
