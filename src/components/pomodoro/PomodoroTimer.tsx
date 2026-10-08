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
  Clock,
} from 'lucide-react';

export const PomodoroTimer: React.FC = () => {
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

  const [showSettings, setShowSettings] = useState<boolean>(false);

  const getModeDetails = () => {
    switch (mode) {
      case 'work':
        return {
          title: 'Deep Cognitive Focus',
          color: 'from-brand-600 to-indigo-600',
          badge: 'Work Session',
          accent: 'text-brand-400',
        };
      case 'shortBreak':
        return {
          title: 'Restorative Short Break',
          color: 'from-accent-teal to-emerald-600',
          badge: 'Short Break',
          accent: 'text-teal-400',
        };
      case 'longBreak':
        return {
          title: 'Full Cognitive Reset',
          color: 'from-accent-amber to-orange-600',
          badge: 'Long Break',
          accent: 'text-amber-400',
        };
    }
  };

  const details = getModeDetails();

  return (
    <div className="w-full max-w-lg mx-auto liquid-glass rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/60 dark:border-white/10 text-slate-100 animate-fade-in relative">
      {/* Top Details */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-md">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white leading-none">
              {details.title}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {activeSubject ? `Linked Focus: ${activeSubject}` : 'Standalone Focus Interval'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-xl liquid-glass-subtle text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          title="Interval Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Main Countdown Display */}
      <div className="flex flex-col items-center justify-center my-6">
        <div className="relative flex items-center justify-center">
          <div className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-slate-900 dark:text-white drop-shadow-md">
            {formatSecondsToTime(timeLeft)}
          </div>
        </div>

        {/* Dynamic Mode Switcher */}
        <div className="flex items-center space-x-1.5 liquid-glass-subtle p-1.5 rounded-2xl my-6">
          <button
            onClick={() => setMode('work')}
            className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
              mode === 'work'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Deep Focus
          </button>
          <button
            onClick={() => setMode('shortBreak')}
            className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
              mode === 'shortBreak'
                ? 'bg-accent-teal text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Short Break
          </button>
          <button
            onClick={() => setMode('longBreak')}
            className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
              mode === 'longBreak'
                ? 'bg-accent-amber text-slate-950 font-black shadow-md'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Long Break
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={resetTimer}
            className="p-3 rounded-2xl liquid-glass-subtle hover:bg-white/70 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            title="Reset Timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={isRunning ? pauseTimer : startTimer}
            className={`px-8 py-3.5 rounded-2xl text-sm font-black flex items-center space-x-2 transition-all shadow-xl glass-pill ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30'
                : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-500/30'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause Focus</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Start Session</span>
              </>
            )}
          </button>

          <button
            onClick={skipSession}
            className="p-3 rounded-2xl liquid-glass-subtle hover:bg-white/70 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            title="Skip Session"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-2 mt-6 text-xs text-slate-500 dark:text-slate-400 font-mono">
          <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>{sessionsCompleted} Deep Focus Sessions Completed Today</span>
        </div>
      </div>

      {/* Interval Preferences Dialog */}
      {showSettings && (
        <div className="mt-4 p-4 rounded-2xl liquid-glass-subtle border border-white/50 dark:border-white/10 space-y-3 animate-fade-in">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Customize Intervals
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Focus (min)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={settings.workMinutes}
                onChange={(e) => updateSettings({ workMinutes: Number(e.target.value) })}
                className="w-full liquid-glass rounded-xl px-2.5 py-1 text-xs font-bold text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Short (min)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.shortBreakMinutes}
                onChange={(e) => updateSettings({ shortBreakMinutes: Number(e.target.value) })}
                className="w-full liquid-glass rounded-xl px-2.5 py-1 text-xs font-bold text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Long (min)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.longBreakMinutes}
                onChange={(e) => updateSettings({ longBreakMinutes: Number(e.target.value) })}
                className="w-full liquid-glass rounded-xl px-2.5 py-1 text-xs font-bold text-center"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
