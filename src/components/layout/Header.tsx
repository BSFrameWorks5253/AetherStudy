import React, { useState, useEffect, useRef } from 'react';
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
  GraduationCap,
  FileQuestion,
  User,
  ChevronDown,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { triggerPWAInstall } from '../common/PWAInstallBanner';
import { nativeNotifications } from '../../services/nativeNotifications';
import { firebaseNotifications } from '../../services/firebase';
import { PaperRequestsManagerModal } from '../vault/PaperRequestsManagerModal';
import { StudentPaperRequestModal } from '../vault/StudentPaperRequestModal';
import { UsersManagerModal } from '../admin/UsersManagerModal';
import { DocumentReviewsModal } from '../admin/DocumentReviewsModal';

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
  const { currentUser, isAuthenticated, isSuperAdmin, activeStandard, logout, openAuthModal } = useAuth();

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showTimerPopover, setShowTimerPopover] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [showPaperRequestsModal, setShowPaperRequestsModal] = useState<boolean>(false);
  const [showStudentRequestModal, setShowStudentRequestModal] = useState<boolean>(false);
  const [showUsersModal, setShowUsersModal] = useState<boolean>(false);
  const [showDocumentReviewsModal, setShowDocumentReviewsModal] = useState<boolean>(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const [pendingPaperReqsCount, setPendingPaperReqsCount] = useState<number>(0);
  const [pendingReviewsCount, setPendingReviewsCount] = useState<number>(0);
  const [canInstall, setCanInstall] = useState<boolean>(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const timerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    setCanInstall(!isStandaloneMode);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (timerMenuRef.current && !timerMenuRef.current.contains(event.target as Node)) {
        setShowTimerPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleHeaderInstall = async () => {
    setShowProfileMenu(false);
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

      if (isSuperAdmin) {
        try {
          const reqs = await api.getPaperRequests();
          setPendingPaperReqsCount(reqs.filter((r) => r.status === 'pending').length);
        } catch {}

        try {
          const rev = await api.getPendingReviews();
          setPendingReviewsCount(rev.pendingUploads.length + rev.pendingRenames.length);
        } catch {}
      }
    };

    checkNotifs();
    const interval = setInterval(checkNotifs, 60000);

    const handleReadChange = () => {
      checkNotifs();
    };
    const handleOpenModal = () => {
      setShowNotificationsModal(true);
    };

    window.addEventListener('aetherstudy_announcements_read_change', handleReadChange);
    window.addEventListener('aether_open_notifications_modal', handleOpenModal);

    const handleOpenStudentRequest = () => {
      setShowStudentRequestModal(true);
    };
    const handlePaperRequestSubmitted = () => {
      checkNotifs();
      if (isSuperAdmin) setPendingPaperReqsCount((p) => p + 1);
    };
    const handleReviewsUpdated = () => {
      checkNotifs();
    };

    window.addEventListener('aether_open_paper_request', handleOpenStudentRequest);
    window.addEventListener('aether_paper_request_submitted', handlePaperRequestSubmitted);
    window.addEventListener('aether_reviews_updated', handleReviewsUpdated);

    // Realtime notification sync & native phone notification tray alerts
    const unsubscribe = firebaseNotifications.subscribe((cloudNotifs) => {
      if (Array.isArray(cloudNotifs) && cloudNotifs.length > 0) {
        const unread = nativeNotifications.getUnreadCount(cloudNotifs);
        setUnreadNotifsCount(unread);
        cloudNotifs.slice(0, 3).forEach((n) => {
          if (n) {
            nativeNotifications.notifyIfNew(n);
          }
        });
      }
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('aetherstudy_announcements_read_change', handleReadChange);
      window.removeEventListener('aether_open_notifications_modal', handleOpenModal);
      window.removeEventListener('aether_open_paper_request', handleOpenStudentRequest);
      window.removeEventListener('aether_paper_request_submitted', handlePaperRequestSubmitted);
      window.removeEventListener('aether_reviews_updated', handleReviewsUpdated);
      unsubscribe();
    };
  }, [activeStandard, isSuperAdmin]);

  const toggleFullscreen = () => {
    setShowProfileMenu(false);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Split title into short mobile header vs full desktop title
  const [shortTitle] = title.includes('•') ? title.split('•').map((s) => s.trim()) : [title];

  return (
    <>
      <header className="pt-[env(safe-area-inset-top,0px)] h-[calc(3.5rem+env(safe-area-inset-top,0px))] md:h-16 px-3 sm:px-5 md:px-7 ios-glass border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between select-none z-30 sticky top-0 transition-all">
        {/* Module Title with Apple SF Pro Hierarchy */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1 mr-2 sm:mr-4">
          <div className="w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(124,58,237,0.5)] shrink-0 hidden sm:block" />
          <span className="text-xs sm:text-sm font-semibold tracking-tight text-slate-900 dark:text-white truncate sm:hidden">
            {shortTitle}
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white truncate hidden sm:inline">
            {title}
          </span>
        </div>

        {/* Header Right Actions - Clean, Executive Layout */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
          {/* Subtle Board Pill */}
          <div className="hidden xl:flex items-center space-x-2 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-full px-3 py-1 select-none">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <GraduationCap className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
            <span className="text-xs font-semibold tracking-tight text-slate-700 dark:text-slate-200">
              Class 12 HSC
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-2">
              Commerce
            </span>
          </div>

          {/* Apple Dynamic Island Style Focus Timer */}
          <div className="relative" ref={timerMenuRef}>
            <button
              type="button"
              onClick={() => setShowTimerPopover(!showTimerPopover)}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full border transition-all ios-pill cursor-pointer active:scale-95 ${
                isRunning
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-black/[0.03] dark:bg-white/[0.06] border-black/[0.04] dark:border-white/[0.07] text-slate-700 dark:text-slate-200 hover:bg-black/[0.06] dark:hover:bg-white/[0.1]'
              }`}
              title="Focus Timer"
            >
              <Timer className={`w-3.5 h-3.5 shrink-0 ${isRunning ? 'animate-spin' : ''}`} />
              <span className="font-mono text-xs font-semibold tracking-tight">
                {formatSecondsToTime(timeLeft)}
              </span>
              {activeSubject && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-slate-700 pl-1.5 max-w-[70px] truncate hidden md:inline">
                  {activeSubject}
                </span>
              )}
            </button>

            {/* Focus Block Timer Popover */}
            {showTimerPopover && (
              <div className="fixed sm:absolute top-16 sm:top-full right-3 sm:right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-72 max-w-sm ios-popover rounded-[24px] p-5 shadow-2xl z-50 animate-fade-in text-center ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <span>Focus Block Timer</span>
                  <span className="text-[11px] text-brand-600 dark:text-brand-400 font-mono font-semibold">
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
                    className="p-2.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] text-slate-600 dark:text-slate-300 transition-colors ios-pill cursor-pointer"
                    title="Reset"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={isRunning ? pauseTimer : startTimer}
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-full shadow-md flex items-center space-x-1.5 transition-all ios-pill cursor-pointer"
                  >
                    {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isRunning ? 'Pause' : 'Start Focus'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={skipSession}
                    className="p-2.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] text-slate-600 dark:text-slate-300 transition-colors ios-pill cursor-pointer"
                    title="Skip"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Paper Request Action */}
          {isSuperAdmin ? (
            <button
              type="button"
              onClick={() => setShowPaperRequestsModal(true)}
              className="relative p-2 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-all ios-pill cursor-pointer active:scale-95 shrink-0"
              title="Student Paper Requests Manager"
            >
              <FileQuestion className="w-4 h-4" />
              {pendingPaperReqsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 bg-amber-500 text-black rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {pendingPaperReqsCount}
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowStudentRequestModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-black/[0.04] dark:border-white/[0.07] text-xs font-medium transition-all ios-pill cursor-pointer active:scale-95 shrink-0"
              title="Request Missing Board Paper or Solution"
            >
              <FileQuestion className="w-3.5 h-3.5 text-amber-500" />
              <span>Request Paper</span>
            </button>
          )}

          {/* SuperAdmin User Management Button */}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setShowUsersModal(true)}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-500/10 hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-500/25 text-xs font-bold transition-all ios-pill cursor-pointer active:scale-95 shrink-0"
              title="View all users, active/inactive statuses, and assign admin roles"
            >
              <Users className="w-3.5 h-3.5 text-brand-500" />
              <span>Users & Admins</span>
            </button>
          )}

          {/* SuperAdmin Document Reviews Desk Button */}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setShowDocumentReviewsModal(true)}
              className="relative hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-xs font-bold transition-all ios-pill cursor-pointer active:scale-95 shrink-0"
              title="SuperAdmin Review Desk: Authorize faculty admin uploads and renames"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Review Desk</span>
              {pendingReviewsCount > 0 && (
                <span className="min-w-[17px] h-[17px] px-1 bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {pendingReviewsCount}
                </span>
              )}
            </button>
          )}

          {/* Announcements & Notifications Bell */}
          <button
            type="button"
            onClick={() => setShowNotificationsModal(true)}
            className="relative p-2 rounded-full bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-black/[0.04] dark:border-white/[0.07] transition-all ios-pill cursor-pointer active:scale-95 shrink-0"
            title="Official Announcements"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-0 right-0 min-w-[15px] h-[15px] px-1 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-full bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-black/[0.04] dark:border-white/[0.07] transition-all ios-pill cursor-pointer active:scale-95 shrink-0"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Consolidated Executive User Profile Menu */}
          <div className="relative" ref={profileMenuRef}>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-1.5 p-1 pl-1.5 pr-2.5 rounded-full bg-black/[0.04] dark:bg-white/[0.07] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] border border-black/[0.05] dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 transition-all ios-pill cursor-pointer active:scale-95"
                title="Account Menu"
              >
                <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-xs">
                  {currentUser?.email.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:inline max-w-[95px] truncate text-xs font-medium">
                  {currentUser?.email.split('@')[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={openAuthModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold tracking-tight shadow-sm transition-all ios-pill cursor-pointer active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Apple Spatial Profile Menu Popover */}
            {/* Executive Profile Menu Popover (100% Solid Background, Zero Bleed-Through) */}
            {showProfileMenu && isAuthenticated && (
              <div className="absolute right-0 top-full mt-2.5 w-72 rounded-2xl ios-popover p-2.5 z-50 animate-fade-in text-left ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
                {/* User Identity Header Card */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 mb-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-base shadow-sm ring-2 ring-white dark:ring-slate-700 shrink-0">
                      {currentUser?.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate tracking-tight">
                        {currentUser?.email.split('@')[0]}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-normal">
                        {currentUser?.email}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isSuperAdmin
                          ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60'
                          : currentUser?.role === 'ADMIN'
                          ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60'
                          : 'bg-slate-200/70 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isSuperAdmin ? 'Administrator' : currentUser?.role === 'ADMIN' ? 'Faculty Admin' : 'Class 12 Student'}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">Class XII</span>
                  </div>
                </div>

                {/* Menu Action Items */}
                <div className="space-y-0.5 py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      openAuthModal();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
                  >
                    <User className="w-4 h-4 text-slate-400 group-hover:text-brand-500 transition-colors shrink-0" />
                    <span>Account Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-2.5">
                      {isFullscreen ? (
                        <Minimize2 className="w-4 h-4 text-slate-400 group-hover:text-brand-500 transition-colors shrink-0" />
                      ) : (
                        <Maximize2 className="w-4 h-4 text-slate-400 group-hover:text-brand-500 transition-colors shrink-0" />
                      )}
                      <span>{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">F11</span>
                  </button>

                  {canInstall && (
                    <button
                      type="button"
                      onClick={handleHeaderInstall}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-brand-500 shrink-0" />
                      <span>Install Web App</span>
                    </button>
                  )}

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowUsersModal(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center space-x-2.5">
                        <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span>User Directory & Admins</span>
                      </div>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    </button>
                  )}

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowPaperRequestsModal(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center space-x-2.5">
                        <FileQuestion className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Paper Requests Manager</span>
                      </div>
                      {pendingPaperReqsCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-amber-500 text-black rounded-full text-[10px] font-bold">
                          {pendingPaperReqsCount}
                        </span>
                      )}
                    </button>
                  )}

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowDocumentReviewsModal(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center space-x-2.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Document Review Desk</span>
                      </div>
                      {pendingReviewsCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold animate-pulse">
                          {pendingReviewsCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>

                {/* Sign Out Divider */}
                <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (window.confirm('Sign out of AetherStudy? You can sign back in anytime.')) {
                        logout();
                      }
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer active:scale-[0.99]"
                  >
                    <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
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

      {/* Student Paper Request Modal */}
      <StudentPaperRequestModal
        isOpen={showStudentRequestModal}
        onClose={() => setShowStudentRequestModal(false)}
      />

      {/* Admin Student Paper Requests Manager Modal */}
      {showPaperRequestsModal && (
        <PaperRequestsManagerModal
          isOpen={showPaperRequestsModal}
          onClose={() => setShowPaperRequestsModal(false)}
          onRequestCountChange={(cnt) => setPendingPaperReqsCount(cnt)}
        />
      )}

      {/* SuperAdmin & Admin User Directory & Role Assignment Modal */}
      {showUsersModal && (
        <UsersManagerModal
          isOpen={showUsersModal}
          onClose={() => setShowUsersModal(false)}
        />
      )}

      {/* SuperAdmin Document Reviews Modal */}
      {showDocumentReviewsModal && (
        <DocumentReviewsModal
          isOpen={showDocumentReviewsModal}
          onClose={() => setShowDocumentReviewsModal(false)}
          reviewerEmail={currentUser?.email || 'bs.framework5253@gmail.com'}
          onReviewsUpdated={() => {
            api.getPendingReviews().then(res => {
              setPendingReviewsCount(res.pendingUploads.length + res.pendingRenames.length);
            }).catch(() => {});
            window.dispatchEvent(new CustomEvent('aether_reviews_updated'));
          }}
        />
      )}
    </>
  );
};
export default Header;

