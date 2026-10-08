import React, { useState } from 'react';
import { usePomodoro } from '../../context/PomodoroContext';
import { formatSecondsToTime } from '../../utils/timeUtils';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Settings,
  Flame,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const PomodoroFloatingWidget: React.FC = () => {
  const {
    mode,
    timeLeft,
    isRunning,
    sessionsCompleted,
    activeSubject,
    settings,
    startTimer,
    pauseTimer,
    resetTimer,
    skipSession,
    setMode,
    updateSettings,
  } = usePomodoro();

  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const getModeBadge = () => {
    switch (mode) {
      case 'work':
        return { label: 'Deep Focus', color: 'bg-brand-500/20 text-brand-600 dark:text-brand-300 border-brand-500/40' };
      case 'shortBreak':
        return { label: 'Short Break', color: 'bg-accent-teal/20 text-teal-600 dark:text-teal-300 border-accent-teal/40' };
      case 'longBreak':
        return { label: 'Long Break', color: 'bg-accent-amber/20 text-amber-600 dark:text-amber-300 border-accent-amber/40' };
    }
  };

  const badge = getModeBadge();

  return (
    <>
      <div className="fixed bottom-20 right-3.5 md:bottom-5 md:right-5 z-40 liquid-glass shadow-2xl rounded-3xl p-3.5 sm:p-4 text-slate-800 dark:text-slate-100 transition-all duration-300 border border-white/70 dark:border-white/10 max-w-[280px] sm:max-w-xs">
        {/* Minimized or Title Bar */}
        <div className="flex items-center justify-between space-x-3">
          <div className="flex items-center space-x-2 truncate">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isRunning ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
              }`}
            />
            <span className={`text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full border ${badge.color}`}>
              {badge.label}
            </span>
            {activeSubject && (
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 max-w-[110px] truncate" title={activeSubject}>
                • {activeSubject}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Timer Preferences"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Expanded Timer Controls */}
        {isExpanded && (
          <div className="mt-3 flex flex-col items-center">
            {/* Big Countdown Display */}
            <div className="text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white my-1">
              {formatSecondsToTime(timeLeft)}
            </div>

            {/* Mode Selector Buttons */}
            <div className="flex items-center space-x-1 liquid-glass-subtle p-1 rounded-xl my-2">
              <button
                onClick={() => setMode('work')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  mode === 'work' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Focus
              </button>
              <button
                onClick={() => setMode('shortBreak')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  mode === 'shortBreak' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Short
              </button>
              <button
                onClick={() => setMode('longBreak')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  mode === 'longBreak' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Long
              </button>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-2 mt-2">
              <button
                onClick={resetTimer}
                className="p-2.5 rounded-xl liquid-glass-subtle hover:bg-white/70 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                title="Reset Session"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={isRunning ? pauseTimer : startTimer}
                className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center space-x-1.5 transition-all shadow-lg glass-pill ${
                  isRunning
                    ? 'bg-amber-500 text-slate-950 shadow-amber-500/30'
                    : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-500/30'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start</span>
                  </>
                )}
              </button>

              <button
                onClick={skipSession}
                className="p-2.5 rounded-xl liquid-glass-subtle hover:bg-white/70 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                title="Skip to next phase"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Streak & session stats */}
            <div className="flex items-center space-x-1.5 mt-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{sessionsCompleted} focus sessions logged</span>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xs liquid-glass rounded-3xl p-5 shadow-2xl text-slate-800 dark:text-slate-100 border border-white/70 dark:border-white/10">
            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-3">Timer Preferences</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Focus Duration (mins)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={settings.workMinutes}
                  onChange={(e) => updateSettings({ workMinutes: Number(e.target.value) })}
                  className="w-full liquid-glass-subtle rounded-xl px-3 py-1.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Short Break (mins)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.shortBreakMinutes}
                  onChange={(e) => updateSettings({ shortBreakMinutes: Number(e.target.value) })}
                  className="w-full liquid-glass-subtle rounded-xl px-3 py-1.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Long Break (mins)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.longBreakMinutes}
                  onChange={(e) => updateSettings({ longBreakMinutes: Number(e.target.value) })}
                  className="w-full liquid-glass-subtle rounded-xl px-3 py-1.5 text-xs font-bold"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-pill"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
