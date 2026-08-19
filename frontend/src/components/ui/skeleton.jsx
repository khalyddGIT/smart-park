import React from 'react';

export const Skeleton = ({ className = '', ...props }) => {
  return (
    <div
      className={`skeleton-shimmer rounded-xl ${className}`}
      {...props}
    />
  );
};

// Preset Skeletons
export const SkeletonCard = () => (
  <div className="p-5 rounded-3xl border border-slate-200/90 bg-white shadow-xs space-y-3.5">
    <div className="flex items-center justify-between">
      <Skeleton className="w-24 h-4 rounded-lg" />
      <Skeleton className="w-8 h-8 rounded-xl" />
    </div>
    <Skeleton className="w-36 h-7 rounded-xl" />
    <Skeleton className="w-48 h-3 rounded-lg" />
  </div>
);

export const SkeletonParkingCard = () => (
  <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden flex flex-col justify-between">
    <Skeleton className="h-44 w-full rounded-none" />
    <div className="p-5 space-y-3">
      <div className="space-y-1.5">
        <Skeleton className="w-4/5 h-5 rounded-lg" />
        <Skeleton className="w-3/5 h-3.5 rounded-lg" />
      </div>
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="w-24 h-6 rounded-xl" />
        <Skeleton className="w-28 h-9 rounded-2xl" />
      </div>
    </div>
  </div>
);

export const SkeletonRow = () => (
  <div className="p-4 rounded-2xl border border-slate-100 bg-white flex items-center justify-between gap-3">
    <div className="flex items-center space-x-3 w-3/5">
      <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
      <div className="space-y-1.5 w-full">
        <Skeleton className="w-4/5 h-4 rounded-lg" />
        <Skeleton className="w-2/5 h-3 rounded-lg" />
      </div>
    </div>
    <Skeleton className="w-24 h-8 rounded-xl" />
  </div>
);
