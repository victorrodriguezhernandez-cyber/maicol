import { Skeleton } from "@/components/ui/Skeleton";

export default function ProgresoLoading() {
  return (
    <div className="flex flex-col gap-5 pb-6">
      <Skeleton className="h-8 w-32" />

      <div className="surface-hero flex flex-col gap-4 p-5">
        <div className="flex items-baseline justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-[152px] w-full" />
        <div className="flex justify-center">
          <Skeleton className="h-8 w-64 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </div>
  );
}
