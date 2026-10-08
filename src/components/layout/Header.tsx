import React, { useState, useEffect } from 'react';
import { usePomodoro } from '../../context/PomodoroContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { NotificationsModal } from '../notifications/NotificationsModal';
import { api } from '../../services/api';
import { formatSecondsToTime } from '../../utils/timeUtils';
import {
  Maximize2,
  Minimize2,
  Timer,
  Sun,
  Moon,
  User,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Bell,
  LogOut,
  LogIn,
} from 'lucide-react';

interface HeaderProps {
  title: string;
  isMobileChatOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, isMobileChatOpen = false }) => {
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
  const { currentUser, isAuthenticated, isSuperAdmin, activeStandard, setActiveStandard, logout } = useAuth();

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showTimerPopover, setShowTimerPopover] = useState<boolean>(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);

  useEffect(() => {
    const checkNotifs = async () => {
      try {
        const notifs = await api.getNotifications(isSuperAdmin ? undefined : activeStandard);
        setUnreadNotifsCount(notifs.length);
      } catch {
        // silent
      }
    };
    checkNotifs();
    const interval = setInterval(checkNotifs, 15000);
    return () => clearInterval(interval);
  }, [activeStandard, isSuperAdmin]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <>
      <header className={`h-14 md:h-16 px-3 md:px-6 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 items-center justify-between select-none z-30 shadow-xs relative backdrop-blur-md ${isMobileChatOpen ? 'hidden md:flex' : 'flex'}`}>
        {/* Module Title */}
        <div className="flex items-center space-x-3 truncate">
          <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {title}
          </span>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Super Admin Grade Preview Switcher */}
          {isAuthenticated && isSuperAdmin && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/60 text-xs font-semibold text-purple-900 dark:text-purple-200 shadow-xs">
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider hidden sm:inline">
                Viewing:
              </span>
              <select
                value={activeStandard}
                onChange={(e) => setActiveStandard(e.target.value)}
                className="bg-transparent font-bold text-xs outline-none cursor-pointer text-purple-900 dark:text-purple-100"
                title="Switch Standard Preview"
              >
                <option value="12" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Class 12 (HSC)</option>
                <option value="10" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Class 10 (SSC)</option>
                <option value="11" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Class 11 (FYJC)</option>
                <option value="9" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Class 9 (Found.)</option>
                <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Classes</option>
              </select>
            </div>
          )}

          {/* Enrolled Standard Badge for Students */}
          {isAuthenticated && !isSuperAdmin && (
            <div className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs">
              <span className="text-brand-600 dark:text-brand-400">Class</span>
              <span>{activeStandard}</span>
            </div>
          )}

          {/* User Sign In / Profile / Dedicated Log Out Control */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs"
                title="Account Settings & Permissions"
              >
                <User className={`w-3.5 h-3.5 ${isSuperAdmin ? 'text-purple-600 dark:text-purple-400' : 'text-brand-600 dark:text-brand-400'}`} />
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {currentUser?.email.split('@')[0]}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isSuperAdmin
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300'
                      : currentUser?.role === 'ADMIN'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-slate-200/80 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isSuperAdmin ? 'Owner' : currentUser?.role === 'ADMIN' ? 'Admin' : 'Student'}
                </span>
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Log out of AetherStudy? You can log back in anytime.')) {
                    logout();
                  }
                }}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 text-xs font-bold transition-all shadow-xs"
                title="Log Out of this account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
          )}

          {/* Clean Integrated Header Pomodoro Timer with Click Popover */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setShowTimerPopover(!showTimerPopover)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs shadow-xs cursor-pointer transition-all"
              title="Click to control focus timer"
            >
              <Timer className={`w-3.5 h-3.5 ${isRunning ? 'text-amber-500 animate-spin' : 'text-slate-500 dark:text-slate-400'}`} />
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {formatSecondsToTime(timeLeft)}
              </span>
              {activeSubject && (
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-slate-700 pl-2 max-w-[80px] truncate hidden md:inline">
                  {activeSubject}
                </span>
              )}
            </button>

            {/* Non-intrusive Timer Dropdown Control Box */}
            {showTimerPopover && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xl z-50 animate-fade-in border border-slate-200 dark:border-slate-800 text-center">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Focus Timer</span>
                  <span className="text-[10px] text-brand-600 dark:text-brand-400 font-mono font-semibold">
                    {mode === 'work' ? 'Study Block' : 'Rest Break'}
                  </span>
                </div>

                <div className="text-3xl font-mono font-black text-slate-900 dark:text-white my-3">
                  {formatSecondsToTime(timeLeft)}
                </div>

                <div className="flex justify-center space-x-1.5 mb-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setMode('work')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                      mode === 'work' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Focus
                  </button>
                  <button
                    onClick={() => setMode('shortBreak')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                      mode === 'shortBreak' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Short
                  </button>
                  <button
                    onClick={() => setMode('longBreak')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                      mode === 'longBreak' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Long
                  </button>
                </div>

                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={resetTimer}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    title="Reset"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={isRunning ? pauseTimer : startTimer}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-sm flex items-center space-x-1 transition-all"
                  >
                    {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isRunning ? 'Pause' : 'Start'}</span>
                  </button>
                  <button
                    onClick={skipSession}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    title="Skip"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Official Announcements & Notifications Bell */}
          <button
            onClick={() => setShowNotificationsModal(true)}
            className="relative p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-slate-700 dark:text-slate-200 shadow-xs cursor-pointer"
            title="Official Announcements & Notices"
          >
            <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse shadow-sm">
                {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-slate-700 dark:text-slate-200 shadow-xs"
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
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-slate-700 dark:text-slate-200 shadow-xs hidden sm:flex"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Global Auth Modal */}
      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}

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
