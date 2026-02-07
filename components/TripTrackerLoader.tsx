
import React from 'react';

const TripTrackerLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-500 animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-8 max-w-xs w-full px-6">
        {/* Animated App Name */}
        <h1 className="text-4xl font-black tracking-tighter text-blue-600 dark:text-blue-400 animate-pulse">
          TRIPTRACKER
        </h1>

        {/* Skeleton Shimmer Bars */}
        <div className="w-full space-y-3">
          <div className="h-4 w-3/4 rounded-full bg-slate-200 dark:bg-slate-900 overflow-hidden relative">
            <div className="absolute inset-0 animate-shimmer"></div>
          </div>
          <div className="h-4 w-full rounded-full bg-slate-200 dark:bg-slate-900 overflow-hidden relative">
            <div className="absolute inset-0 animate-shimmer" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <div className="h-4 w-1/2 rounded-full bg-slate-200 dark:bg-slate-900 overflow-hidden relative">
            <div className="absolute inset-0 animate-shimmer" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>

        {/* Loading Text Hint */}
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 animate-bounce mt-4">
          Syncing Assets
        </p>
      </div>
    </div>
  );
};

export default TripTrackerLoader;
