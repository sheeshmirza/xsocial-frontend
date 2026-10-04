"use client";

import { cn } from "@/src/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse bg-slate-200/80 rounded-md", className)}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="crm-panel p-5 rounded-2xl flex flex-col gap-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-20 w-full mt-2" />
    </div>
  );
}

export function KpiSkeleton() {
  return (
    <div className="kpi-card flex flex-col gap-2 p-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-14 mt-1" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="posts-table-wrap p-2" aria-label="Loading table data" role="region">
      <div className="flex flex-col gap-3">
        <div className="flex gap-4 border-b border-slate-200 pb-2">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={`head-${i}`} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={`row-${r}`} className="flex gap-4 py-2 border-b border-slate-100">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={`cell-${r}-${c}`} className="h-5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
