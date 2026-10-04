import React from 'react';
import { Skeleton } from './ui/Skeleton';

/**
 * Thematic skeleton for ServiceLanding to prevent screen flicker and layout shifts
 * during Suspense and route transitions between trades/rubros in Bahía Blanca.
 */
export const ServiceLandingSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors animate-fade-in">
      {/* Thematic Hero Skeleton with Identical Gradient Background */}
      <div className="relative bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white py-12 sm:py-16 border-b border-indigo-950 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-4 w-12 bg-white/10 rounded-md animate-pulse" />
            <span className="text-white/20">/</span>
            <div className="h-4 w-16 bg-white/10 rounded-md animate-pulse" />
            <span className="text-white/20">/</span>
            <div className="h-4 w-24 bg-white/20 rounded-md animate-pulse" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-3xl space-y-4">
              {/* Barrio Badge Skeleton */}
              <div className="h-6 w-48 bg-indigo-500/20 border border-indigo-400/20 rounded-full animate-pulse" />

              {/* Title Skeleton */}
              <div className="space-y-2">
                <div className="h-10 sm:h-12 w-3/4 max-w-md bg-white/20 rounded-2xl animate-pulse" />
              </div>

              {/* Subtitle / Description Skeleton */}
              <div className="space-y-2 max-w-2xl pt-1">
                <div className="h-4 w-full bg-white/10 rounded-md animate-pulse" />
                <div className="h-4 w-5/6 bg-white/10 rounded-md animate-pulse" />
                <div className="h-4 w-2/3 bg-white/10 rounded-md animate-pulse" />
              </div>

              {/* Action Buttons Skeleton */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <div className="h-10 w-44 bg-white/10 rounded-xl animate-pulse" />
                <div className="h-10 w-36 bg-white/10 rounded-xl animate-pulse" />
              </div>
            </div>

            {/* Unified CTA Card Skeleton */}
            <div className="bg-white/10 dark:bg-slate-900/80 backdrop-blur-md border border-white/20 dark:border-slate-800 rounded-3xl p-6 md:p-8 shrink-0 max-w-sm w-full space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 bg-indigo-500/40 rounded-2xl animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-28 bg-indigo-300/30 rounded-md animate-pulse" />
                  <div className="h-5 w-36 bg-white/30 rounded-md animate-pulse" />
                </div>
              </div>

              <div className="space-y-2 py-1">
                <div className="h-3 w-full bg-white/10 rounded-md animate-pulse" />
                <div className="h-3 w-4/5 bg-white/10 rounded-md animate-pulse" />
              </div>

              <div className="h-11 w-full bg-indigo-500/40 rounded-xl animate-pulse" />

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <div className="h-3 w-24 bg-white/10 rounded-md animate-pulse" />
                <div className="h-3 w-24 bg-white/10 rounded-md animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Professional Listings Skeleton */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <div className="space-y-2 mb-6">
                <div className="h-7 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
                <div className="h-4 w-80 bg-slate-100 dark:bg-slate-800/60 rounded-md animate-pulse" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div 
                    key={i} 
                    className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
                        <div className="h-3 w-20 bg-slate-100 dark:bg-slate-700/60 rounded-md animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-slate-100 dark:bg-slate-700/50 rounded-md animate-pulse" />
                      <div className="h-3 w-4/5 bg-slate-100 dark:bg-slate-700/50 rounded-md animate-pulse" />
                    </div>
                    <div className="h-10 w-full bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar Skeleton */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-700/50 rounded-md animate-pulse" />
              <div className="space-y-3 pt-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 animate-pulse shrink-0" />
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-700/50 rounded-md animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
