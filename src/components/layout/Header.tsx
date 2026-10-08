import React, { useState } from 'react';
import { usePomodoro } from '../../context/PomodoroContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';
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
} from 'lucide-react';

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
  const { currentUser, isAuthenticated, isSuperAdmin } = useAuth();

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showTimerPopover, setShowTimerPopover] = useState<boolean>(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <>
      <header className="h-16 px-4 md:px-6 liquid-glass border-b border-white/50 dark:border-white/10 flex items-center justify-between select-none z-30 shadow-sm relative">
        {/* Module Title */}
        <div className="flex items-center space-x-3 truncate">
          <span className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
            {title}
          </span>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* User Sign In / Role Chip */}
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl liquid-glass-subtle hover:bg-white/70 dark:hover:bg-slate-800 transition-all text-xs font-bold shadow-sm"
          >
            <User className={`w-3.5 h-3.5 ${isSuperAdmin ? 'text-purple-500' : 'text-brand-500'}`} />
            <span className="hidden sm:inline max-w-[120px] truncate">
              {isAuthenticated ? currentUser?.email.split('@')[0] : 'Sign In'}
            </span>
            {isAuthenticated && (
              <span
                className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full ${
                  isSuperAdmin
                    ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300'
                    : currentUser?.role === 'ADMIN'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                    : 'bg-slate-500/20 text-slate-500'
                }`}
              >
                {isSuperAdmin ? 'Owner' : currentUser?.role}
              </span>
            )}
          </button>

          {/* Clean Integrated Header Pomodoro Timer with Click Popover */}
          <div className="relative">
            <button
              onClick={() => setShowTimerPopover(!showTimerPopover)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl liquid-glass-subtle hover:bg-white/70 dark:hover:bg-slate-800 text-xs shadow-sm cursor-pointer transition-all"
              title="Click to control focus timer"
            >
              <Timer className={`w-3.5 h-3.5 ${isRunning ? 'text-amber-500 animate-spin' : 'text-slate-400'}`} />
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
              <div className="absolute top-full right-0 mt-2 w-72 liquid-glass rounded-2xl p-4 shadow-2xl z-50 animate-fade-in border border-white/60 dark:border-white/10 text-center">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/5 dark:border-white/10 text-xs font-bold text-slate-500">
                  <span>Focus Timer</span>
                  <button onClick={() => setShowTimerPopover(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <div className="text-3xl font-black font-mono text-slate-900 dark:text-white my-2">
                  {formatSecondsToTime(timeLeft)}
                </div>

                <div className="flex justify-center space-x-1 liquid-glass-subtle p-1 rounded-xl mb-3">
                  <button
                    onClick={() => setMode('work')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${
                      mode === 'work' ? 'bg-brand-600 text-white' : 'text-slate-500'
                    }`}
                  >
                    Focus
                  </button>
                  <button
                    onClick={() => setMode('shortBreak')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${
                      mode === 'shortBreak' ? 'bg-brand-600 text-white' : 'text-slate-500'
                    }`}
                  >
                    Short
                  </button>
                  <button
                    onClick={() => setMode('longBreak')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${
                      mode === 'longBreak' ? 'bg-brand-600 text-white' : 'text-slate-500'
                    }`}
                  >
                    Long
                  </button>
                </div>

                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={resetTimer}
                    className="p-2 rounded-xl liquid-glass-subtle hover:bg-white/80 dark:hover:bg-slate-800 text-slate-500"
                    title="Reset"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={isRunning ? pauseTimer : startTimer}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl glass-pill shadow-md flex items-center space-x-1"
                  >
                    {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isRunning ? 'Pause' : 'Start'}</span>
                  </button>
                  <button
                    onClick={skipSession}
                    className="p-2 rounded-xl liquid-glass-subtle hover:bg-white/80 dark:hover:bg-slate-800 text-slate-500"
                    title="Skip"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl liquid-glass-subtle hover:bg-white/80 dark:hover:bg-slate-800 transition-all text-slate-700 dark:text-slate-200 shadow-sm"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-brand-600" />
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl liquid-glass-subtle hover:bg-white/80 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300 shadow-sm"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* User Login & Role Manager Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};
