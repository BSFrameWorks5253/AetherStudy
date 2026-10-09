import React, { useState, useEffect } from 'react';
import { usePomodoro } from '../../context/PomodoroContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { NotificationsModal } from '../notifications/NotificationsModal';
import { api } from '../../services/api';
import { formatSecondsToTime } from '../../utils/timeUtils';
import {
  Maximize2,
  Minimize2,
  Timer,
  Sun,
  Moon,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Bell,
  LogOut,
  LogIn,
  Download,
  ChevronDown,
} from 'lucide-react';
import { triggerPWAInstall } from '../common/PWAInstallBanner';
import { nativeNotifications } from '../../services/nativeNotifications';
import { firebaseNotifications } from '../../services/firebase';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const {
    timeLeft,
    isRunning,
    activeSubject,
    mode,
    startTimer,
    pauseTimer,
    resetTimer,
    skipSession,
    setMode,
  } = usePomodoro();

  const { theme, toggleTheme } = useTheme();
  const { currentUser, isAuthenticated, isSuperAdmin, activeStandard, setActiveStandard, logout, openAuthModal } = useAuth();

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showTimerPopover, setShowTimerPopover] = useState<boolean>(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const [canInstall, setCanInstall] = useState<boolean>(false);

  useEffect(() => {
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    setCanInstall(!isStandaloneMode);
  }, []);

  const handleHeaderInstall = async () => {
    const res = await triggerPWAInstall();
    if (res === 'ios') {
      alert('To install on iPhone/iPad:\n1. Tap the Share button [⎋] in Safari\n2. Select "Add to Home Screen" [+]\n3. Tap "Add" in top-right corner.');
    } else if (res === 'fallback') {
      alert('To install on this device:\nOpen browser menu (⋮) -> tap "Install app" or "Add to Home screen".');
    }
  };

  useEffect(() => {
    const checkNotifs = async () => {
      try {
        const notifs = await api.getNotifications(isSuperAdmin ? undefined : activeStandard);
        const unread = nativeNotifications.getUnreadCount(notifs);
        setUnreadNotifsCount(unread);
      } catch {
        // silent
      }
    };

    checkNotifs();
    const interval = setInterval(checkNotifs, 20000);

    const handleReadChange = () => {
      checkNotifs();
    };
    window.addEventListener('aetherstudy_announcements_read_change', handleReadChange);

    // Realtime notification sync & native phone notification tray alerts
    const unsubscribe = firebaseNotifications.subscribe((cloudNotifs) => {
      if (Array.isArray(cloudNotifs) && cloudNotifs.length > 0) {
        const unread = nativeNotifications.getUnreadCount(cloudNotifs);
        setUnreadNotifsCount(unread);
        const latest = cloudNotifs[0];
        if (latest) {
          nativeNotifications.notifyIfNew(latest);
        }
      }
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('aetherstudy_announcements_read_change', handleReadChange);
      unsubscribe();
    };
  }, [activeStandard, isSuperAdmin]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Split title into short mobile header vs full desktop title
  const [shortTitle] = title.includes('•') ? title.split('•').map(s => s.trim()) : [title];

  return (
    <>
      <header className="pt-[env(safe-area-inset-top,0px)] h-[calc(3.5rem+env(safe-area-inset-top,0px))] md:h-16 px-4 md:px-7 ios-glass border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between select-none z-30 sticky top-0 transition-all">
        {/* Module Title with Apple SF Pro Hierarchy */}
        <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-3">
          <div className="w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(124,58,237,0.6)] shrink-0 hidden sm:block" />
          <span className="text-xs sm:text-sm font-semibold tracking-tight text-slate-900 dark:text-white truncate sm:hidden">
            {shortTitle}
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white truncate hidden sm:inline">
            {title}
          </span>
        </div>

        {/* Header Right Actions - Apple Spatial Capsule Layout */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Universal Grade Switcher Pill */}
          <div className="relative flex items-center bg-black/[0.04] dark:bg-white/[0.07] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] rounded-full px-3 py-1.5 transition-all border border-black/[0.04] dark:border-white/[0.06]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mr-1.5 hidden sm:inline">
              Class
            </span>
            <select
              value={activeStandard}
              onChange={(e) => setActiveStandard(e.target.value)}
              className="bg-transparent text-xs font-semibold tracking-tight outline-none cursor-pointer text-slate-900 dark:text-white pr-4 appearance-none"
              title="Switch Grade / Standard"
            >
              <option value="12" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">12 (HSC)</option>
              <option value="11" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">11 (FYJC)</option>
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All (11+12)</option>
              <option value="10" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">10 (SSC)</option>
              <option value="9" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">9 (Found.)</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>

          {/* User Profile Capsule */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={openAuthModal}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.07] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] border border-black/[0.04] dark:border-white/[0.06] text-xs font-medium text-slate-800 dark:text-slate-200 transition-all ios-pill"
                title="Account Settings"
              >
                <div className="w-5 h-5 rounded-full bg-brand-500/15 dark:bg-brand-400/20 text-brand-600 dark:text-brand-300 flex items-center justify-center font-bold text-[10px]">
                  {currentUser?.email.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline max-w-[110px] truncate text-xs font-medium">
                  {currentUser?.email.split('@')[0]}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isSuperAdmin
                      ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                      : currentUser?.role === 'ADMIN'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-black/[0.05] dark:bg-white/[0.08] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isSuperAdmin ? 'Admin' : currentUser?.role === 'ADMIN' ? 'Faculty' : 'Student'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Log out of AetherStudy? You can return anytime.')) {
                    logout();
                  }
                }}
                className="hidden md:flex p-2 rounded-full hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openAuthModal}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold tracking-tight shadow-sm transition-all ios-pill"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Apple Dynamic Island Style Focus Timer */}
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setShowTimerPopover(!showTimerPopover)}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full border transition-all ios-pill ${
                isRunning
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-black/[0.04] dark:bg-white/[0.07] border-black/[0.04] dark:border-white/[0.06] text-slate-700 dark:text-slate-200'
              }`}
              title="Focus Timer"
            >
              <Timer className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span className="font-mono text-xs font-semibold tracking-tight">
                {formatSecondsToTime(timeLeft)}
              </span>
              {activeSubject && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-slate-700 pl-2 max-w-[80px] truncate hidden md:inline">
                  {activeSubject}
                </span>
              )}
            </button>

            {/* iOS Floating Island Popover */}
            {showTimerPopover && (
              <div className="absolute top-full right-0 mt-3 w-72 ios-glass rounded-[24px] p-5 shadow-2xl z-50 animate-fade-in text-center border border-black/[0.08] dark:border-white/[0.1]">
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <span>Focus Block Timer</span>
                  <span className="text-[10px] text-brand-600 dark:text-brand-400 font-mono">
                    {mode === 'work' ? 'Study' : 'Rest'}
                  </span>
                </div>

                <div className="text-4xl font-mono font-bold tracking-tight text-slate-900 dark:text-white my-4">
                  {formatSecondsToTime(timeLeft)}
                </div>

                {/* Segmented Mode Controller */}
                <div className="ios-segmented w-full justify-between mb-4">
                  <button
                    type="button"
                    onClick={() => setMode('work')}
                    className={`ios-segmented-item flex-1 ${
                      mode === 'work' ? 'ios-segmented-item-active' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Study
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('shortBreak')}
                    className={`ios-segmented-item flex-1 ${
                      mode === 'shortBreak' ? 'ios-segmented-item-active' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Break
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('longBreak')}
                    className={`ios-segmented-item flex-1 ${
                      mode === 'longBreak' ? 'ios-segmented-item-active' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Long
                  </button>
                </div>

                <div className="flex items-center justify-center space-x-2">
                  <button
                    type="button"
                    onClick={resetTimer}
                    className="p-2.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] text-slate-600 dark:text-slate-300 transition-colors ios-pill"
                    title="Reset"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={isRunning ? pauseTimer : startTimer}
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-full shadow-md flex items-center space-x-1.5 transition-all ios-pill"
                  >
                    {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isRunning ? 'Pause' : 'Start Focus'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={skipSession}
                    className="p-2.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] text-slate-600 dark:text-slate-300 transition-colors ios-pill"
                    title="Skip"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Install App Capsule */}
          {canInstall && (
            <button
              type="button"
              onClick={handleHeaderInstall}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300 hover:bg-brand-500/20 border border-brand-500/20 text-xs font-semibold transition-all ios-pill"
              title="Install AetherStudy"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          {/* Announcements & Notifications Bell */}
          <button
            type="button"
            onClick={() => setShowNotificationsModal(true)}
            className="relative p-2 rounded-full bg-black/[0.04] dark:bg-white/[0.07] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-black/[0.04] dark:border-white/[0.06] transition-all ios-pill"
            title="Official Announcements"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-0 right-0 min-w-[15px] h-[15px] px-1 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Theme Toggle Capsule */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-full bg-black/[0.04] dark:bg-white/[0.07] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-black/[0.04] dark:border-white/[0.06] transition-all ios-pill"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-black/[0.04] dark:bg-white/[0.07] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-black/[0.04] dark:border-white/[0.06] transition-all hidden sm:flex ios-pill"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Official Notifications & Admin Announcements Modal */}
      {showNotificationsModal && (
        <NotificationsModal
          isOpen={showNotificationsModal}
          onClose={() => setShowNotificationsModal(false)}
          onNotificationsCountChange={(cnt) => setUnreadNotifsCount(cnt)}
        />
      )}
    </>
  );
};
export default Header;
