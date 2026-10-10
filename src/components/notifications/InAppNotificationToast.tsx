import React, { useState, useEffect } from 'react';
import { Bell, X, ArrowRight, ShieldAlert, Megaphone } from 'lucide-react';
import { nativeNotifications, NotificationPermissionState } from '../../services/nativeNotifications';
import { getUserStorageItem, setUserStorageItem } from '../../utils/userStorage';

interface ToastAnnouncement {
  id: string;
  title: string;
  message: string;
  priority?: string;
  standard?: string;
}

const DISMISSED_PERM_BANNER_KEY = 'aether_notif_perm_banner_dismissed';

export const InAppNotificationToast: React.FC = () => {
  const [activeToast, setActiveToast] = useState<ToastAnnouncement | null>(null);
  const [permState, setPermState] = useState<NotificationPermissionState>(() =>
    nativeNotifications.getPermission()
  );
  const [showPermBanner, setShowPermBanner] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isDismissed = getUserStorageItem<boolean>(DISMISSED_PERM_BANNER_KEY, false);
    return !isDismissed && nativeNotifications.getPermission() === 'default';
  });

  useEffect(() => {
    // Listen for incoming announcements dispatched by nativeNotifications
    const handleAnnouncement = (e: Event) => {
      const customEvent = e as CustomEvent<ToastAnnouncement>;
      if (customEvent.detail) {
        setActiveToast(customEvent.detail);
      }
    };

    window.addEventListener('aether_new_announcement', handleAnnouncement);
    return () => window.removeEventListener('aether_new_announcement', handleAnnouncement);
  }, []);

  // Auto-dismiss toast after 7 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  const handleOpenNotice = () => {
    if (activeToast) {
      nativeNotifications.markRead(activeToast.id);
      setActiveToast(null);
    }
    window.dispatchEvent(new CustomEvent('aether_open_notifications_modal'));
  };

  const handleDismissToast = () => {
    if (activeToast) {
      nativeNotifications.markRead(activeToast.id);
    }
    setActiveToast(null);
  };

  const handleEnablePermissions = async () => {
    const res = await nativeNotifications.requestPermission();
    setPermState(res);
    setShowPermBanner(false);
    setUserStorageItem(DISMISSED_PERM_BANNER_KEY, true);

    if (res === 'granted') {
      nativeNotifications.playNotificationChime();
      await nativeNotifications.sendNativeAlert(
        '🔔 Notifications Activated',
        'You will now receive official exam notices and timetable updates directly on your device!',
        { tag: 'aether-activated' }
      );
    }
  };

  const handleDismissPermBanner = () => {
    setShowPermBanner(false);
    setUserStorageItem(DISMISSED_PERM_BANNER_KEY, true);
  };

  return (
    <>
      {/* 1. Realtime In-App Notification Toast */}
      {activeToast && (
        <div
          role="alert"
          className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-md animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
        >
          <div className="p-4 rounded-2xl ios-glass border border-brand-500/30 dark:border-brand-400/30 shadow-2xl shadow-brand-500/10 flex items-start space-x-3.5 backdrop-blur-xl">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                activeToast.priority === 'urgent'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                  : 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20'
              }`}
            >
              {activeToast.priority === 'urgent' ? (
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              ) : (
                <Megaphone className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center space-x-1.5 mb-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    activeToast.priority === 'urgent'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                  }`}
                >
                  {activeToast.priority === 'urgent' ? 'Urgent Alert' : 'New Notice'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">• Just now</span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {activeToast.title}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
                {activeToast.message}
              </p>

              <div className="mt-2.5 flex items-center space-x-2">
                <button
                  onClick={handleOpenNotice}
                  className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white text-[11px] font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1 cursor-pointer"
                >
                  <span>View Notice</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  onClick={handleDismissToast}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>

            <button
              onClick={handleDismissToast}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all shrink-0 cursor-pointer"
              aria-label="Close Notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Notification Permission Opt-in Banner (Shown once when permission is 'default') */}
      {showPermBanner && !activeToast && permState === 'default' && (
        <div className="fixed bottom-18 md:bottom-5 left-1/2 -translate-x-1/2 z-40 w-[94vw] max-w-lg pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="p-3.5 sm:p-4 rounded-2xl ios-glass border border-brand-500/20 dark:border-brand-400/20 shadow-xl flex items-center justify-between space-x-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-brand-500/10 dark:bg-brand-400/15 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  Stay updated with official notices
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Get exam dates and new textbook notes on your lock screen
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                onClick={handleEnablePermissions}
                className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-[11px] font-bold rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                Turn On
              </button>
              <button
                onClick={handleDismissPermBanner}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InAppNotificationToast;
