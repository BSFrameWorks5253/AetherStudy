import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [justCameOnline, setJustCameOnline] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setJustCameOnline(true);
      const timer = setTimeout(() => {
        setJustCameOnline(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setJustCameOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !justCameOnline) return null;

  return (
    <aside
      aria-label="Network status"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 animate-slide-up"
    >
      {isOffline ? (
        <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/95 dark:bg-slate-950/95 text-amber-300 border border-amber-500/30 shadow-lg backdrop-blur-md text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span>Offline Mode • Cached Notes & Syllabus Ready</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/95 dark:bg-slate-950/95 text-emerald-300 border border-emerald-500/30 shadow-lg backdrop-blur-md text-xs font-medium">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span>Back Online • Sync Active</span>
        </div>
      )}
    </aside>
  );
};
