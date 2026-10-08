import React, { useState } from 'react';
import { Timetable } from './Timetable';
import { PomodoroTimer } from '../pomodoro/PomodoroTimer';
import { Calendar, Clock } from 'lucide-react';

export const TimetableGrid: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'focus'>('schedule');

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Tab Switcher Header */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-20 shrink-0">
        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
          <button
            onClick={() => setActiveSubTab('schedule')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'schedule'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Weekly Study Timetable</span>
          </button>
          <button
            onClick={() => setActiveSubTab('focus')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'focus'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pomodoro Focus Timer</span>
          </button>
        </div>
      </div>

      {/* Main View */}
      <div className="flex-1 overflow-y-auto">
        {activeSubTab === 'schedule' ? (
          <Timetable />
        ) : (
          <div className="p-6 md:p-12 flex items-center justify-center min-h-full">
            <PomodoroTimer />
          </div>
        )}
      </div>
    </div>
  );
};
