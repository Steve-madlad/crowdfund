import type { HTMLAttributes } from 'react';
import cn from '@/lib/utils';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted motion-reduce:animate-none', className)}
      {...props}
      aria-hidden="true"
    />
  );
}

export function CampaignGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
      role="status"
      aria-label="Loading campaigns"
    >
      <span className="sr-only">Loading campaigns...</span>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="min-w-0 w-full overflow-hidden rounded-xl border border-border bg-card"
          aria-hidden="true"
        >
          <Skeleton className="h-39.5 rounded-none" />
          <div className="col gap-3 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="flex justify-between gap-4 pt-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
            <Skeleton className="mt-2 h-7 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CampaignDetailsSkeleton() {
  return (
    <div className="col mt-10 w-full gap-8" role="status" aria-label="Loading campaign details">
      <span className="sr-only">Loading campaign details...</span>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_9rem]">
        <Skeleton className="h-72 w-full rounded-xl sm:h-96" />
        <div className="flex gap-4 md:flex-col">
          <Skeleton className="h-24 flex-1 rounded-lg" />
          <Skeleton className="h-24 flex-1 rounded-lg" />
          <Skeleton className="h-24 flex-1 rounded-lg" />
        </div>
      </div>
      <div className="col gap-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
        <Skeleton className="h-5 w-2/3" />
      </div>
    </div>
  );
}
