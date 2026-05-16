import React from 'react';

export default function GlobalSkeletonLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50/50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-4xl space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-md w-1/4"></div>
          <div className="h-10 w-10 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
        </div>

        {/* Banner/Hero Skeleton */}
        <div className="h-48 bg-gray-200 dark:bg-slate-700 rounded-xl w-full"></div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
          <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
          <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
        </div>

        {/* List Skeleton */}
        <div className="space-y-4">
          <div className="h-16 bg-gray-200 dark:bg-slate-700 rounded-lg w-full"></div>
          <div className="h-16 bg-gray-200 dark:bg-slate-700 rounded-lg w-full"></div>
          <div className="h-16 bg-gray-200 dark:bg-slate-700 rounded-lg w-full"></div>
        </div>
      </div>

      <div className="mt-8 text-gray-400 dark:text-slate-500 text-sm font-medium animate-pulse">
        جاري تحميل البيانات... / Loading Data...
      </div>
    </div>
  );
}
