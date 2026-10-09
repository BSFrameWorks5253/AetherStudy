import React, { useState, useRef } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void> | void;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const startYRef = useRef<number>(0);
  const isPullingRef = useRef<boolean>(false);

  const PULL_THRESHOLD = 70;

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // Only engage pull-to-refresh when an explicit onRefresh handler is passed
    if (!onRefresh || isRefreshing) return;
    const container = containerRef.current;
    if (!container) return;

    // Do not trigger pull-to-refresh when interacting with form controls or modal overlays
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, button, form, [role="dialog"], .fixed')) {
      return;
    }

    // Only allow pull to refresh when scrolled at the very top
    if (container.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!onRefresh || !isPullingRef.current || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0) {
      // Apply rubber band resistance
      const resistedDistance = Math.min(Math.pow(diff, 0.85) * 1.5, 95);
      setPullDistance(resistedDistance);

      // Light haptic feedback once threshold is reached
      if (resistedDistance >= PULL_THRESHOLD && pullDistance < PULL_THRESHOLD) {
        try {
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(12);
          }
        } catch {}
      }
    } else {
      setPullDistance(0);
      isPullingRef.current = false;
    }
  };

  const handleTouchEnd = async () => {
    if (!onRefresh || !isPullingRef.current || isRefreshing) return;
    isPullingRef.current = false;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);

      try {
        await onRefresh();
      } catch (err) {
        console.warn('Pull-to-refresh action error:', err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 500);
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative h-full overflow-y-auto overscroll-y-contain ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Pull-to-refresh Pill Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="absolute top-0 inset-x-0 flex items-center justify-center z-50 pointer-events-none transition-transform duration-100 ease-out"
          style={{
            transform: `translateY(${Math.min(pullDistance, PULL_THRESHOLD) - 48}px)`,
          }}
        >
          <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-slate-900/90 border border-brand-500/40 text-white shadow-xl backdrop-blur-md text-xs font-bold animate-fade-in">
            {isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 text-brand-400 animate-spin" />
                <span>Refreshing study desk...</span>
              </>
            ) : pullDistance >= PULL_THRESHOLD ? (
              <>
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Release to refresh</span>
              </>
            ) : (
              <>
                <ArrowDown className="w-4 h-4 text-brand-400 animate-bounce" />
                <span>Pull down to refresh</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content with soft transform push when pulling */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance * 0.3}px)` : 'none',
          transition: isPullingRef.current ? 'none' : 'transform 0.2s ease-out',
        }}
        className="h-full"
      >
        {children}
      </div>
    </div>
  );
};
