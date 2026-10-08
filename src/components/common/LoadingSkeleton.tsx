import React from 'react';
import { RefreshCw, FileText, Sparkles } from 'lucide-react';

/**
 * Shimmer effect base style for consistent skeleton pulses across light/dark themes
 */
export const ShimmerPulse: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700/60 dark:to-slate-800 rounded-lg ${className}`}
  />
);

/**
 * Card Skeleton - for Subject Room Cards, Notes Cards, and Textbook Cards
 */
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 sm:p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between space-y-4"
        >
          <div className="flex items-start justify-between">
            <ShimmerPulse className="w-12 h-12 rounded-2xl" />
            <ShimmerPulse className="w-16 h-5 rounded-full" />
          </div>

          <div className="space-y-2">
            <ShimmerPulse className="h-5 w-3/4" />
            <ShimmerPulse className="h-3.5 w-full" />
            <ShimmerPulse className="h-3.5 w-2/3" />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <ShimmerPulse className="h-4 w-20" />
            <ShimmerPulse className="h-6 w-24 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Row / List Skeleton - for Chapter lists, PYQ Paper rows, or Timetable slots
 */
export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between gap-4"
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <ShimmerPulse className="w-8 h-8 rounded-xl shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <ShimmerPulse className="h-4 w-1/2" />
              <ShimmerPulse className="h-3 w-1/3" />
            </div>
          </div>
          <ShimmerPulse className="h-6 w-20 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
};

/**
 * PDF Viewer Loading Overlay with Glassmorphism
 */
export const PdfLoaderOverlay: React.FC<{ message?: string }> = ({
  message = 'Loading document viewer...',
}) => {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col items-center space-y-4 max-w-xs text-center">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-100 dark:border-brand-900">
            <FileText className="w-7 h-7 animate-pulse" />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-xs">
            <RefreshCw className="w-3 h-3 animate-spin" />
          </div>
        </div>

        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            {message}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Rendering high-resolution pages...
          </p>
        </div>

        <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-brand-600 rounded-full animate-indeterminate" />
        </div>
      </div>
    </div>
  );
};

/**
 * Unified Empty State Component
 */
export const UnifiedEmptyState: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}> = ({ icon: Icon, title, description, actionText, onAction }) => {
  return (
    <div className="p-8 sm:p-12 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 text-center space-y-3.5 max-w-md mx-auto my-6 shadow-xs backdrop-blur-sm">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-700 shadow-xs">
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      </div>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-102"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default CardSkeleton;
