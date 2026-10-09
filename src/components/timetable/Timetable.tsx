import React, { useState } from 'react';
import { useServerStorage } from '../../hooks/useServerStorage';
import { api } from '../../services/api';
import { usePomodoro } from '../../context/PomodoroContext';
import { DayOfWeek, TimeSlot } from '../../types/timetable';
import {
  Calendar,
  Clock,
  Plus,
  Play,
  Trash2,
  CheckCircle2,
  Circle,
  Tag,
  X,
  BookOpen,
  Server,
  Sparkles,
} from 'lucide-react';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const SUGGESTED_SUBJECTS = [
  'Book-Keeping & Accountancy',
  'Organization of Commerce (OCM)',
  'Economics',
  'Secretarial Practice (SP)',
  'Mathematics & Statistics',
  'Information Technology (IT)',
  'English (Yuvakbharati)',
  'Board PYQ Mock Exam',
];

const INITIAL_SCHEDULE: TimeSlot[] = [
  {
    id: 'ts-1',
    day: 'Monday',
    startTime: '08:30',
    endTime: '10:30',
    subject: 'Book-Keeping & Accountancy',
    topic: 'Partnership Final Accounts Balance Sheet Adjustments',
    color: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    isCompleted: true,
  },
  {
    id: 'ts-2',
    day: 'Monday',
    startTime: '11:00',
    endTime: '12:30',
    subject: 'Economics',
    topic: 'National Income Calculation & Macro Concepts Revision',
    color: 'border-cyan-400/50 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300',
    isCompleted: false,
  },
  {
    id: 'ts-3',
    day: 'Tuesday',
    startTime: '09:00',
    endTime: '11:00',
    subject: 'Mathematics & Statistics',
    topic: 'Mathematical Logic Truth Tables & Part 1 Differentiation',
    color: 'border-violet-400/50 bg-violet-500/10 text-violet-600 dark:text-violet-300',
    isCompleted: false,
  },
  {
    id: 'ts-4',
    day: 'Wednesday',
    startTime: '14:00',
    endTime: '16:00',
    subject: 'Organization of Commerce (OCM)',
    topic: 'Principles of Management Case Studies & Directing Functions',
    color: 'border-amber-400/50 bg-amber-500/10 text-amber-600 dark:text-amber-300',
    isCompleted: false,
  },
  {
    id: 'ts-5',
    day: 'Thursday',
    startTime: '10:00',
    endTime: '12:00',
    subject: 'Information Technology (IT)',
    topic: 'HTML5 Form Elements, CSS Grid & Cyber Law Provisions',
    color: 'border-blue-400/50 bg-blue-500/10 text-blue-600 dark:text-blue-300',
    isCompleted: false,
  },
  {
    id: 'ts-6',
    day: 'Friday',
    startTime: '15:00',
    endTime: '17:00',
    subject: 'Secretarial Practice (SP)',
    topic: 'Issue of Shares & Debentures Allotment Procedures',
    color: 'border-rose-400/50 bg-rose-500/10 text-rose-600 dark:text-rose-300',
    isCompleted: false,
  },
  {
    id: 'ts-7',
    day: 'Saturday',
    startTime: '10:00',
    endTime: '12:00',
    subject: 'English (Yuvakbharati)',
    topic: 'Writing Skills (Expansion of Ideas & Film Review)',
    color: 'border-sky-400/50 bg-sky-500/10 text-sky-600 dark:text-sky-300',
    isCompleted: false,
  },
  {
    id: 'ts-8',
    day: 'Sunday',
    startTime: '09:00',
    endTime: '12:00',
    subject: 'Board PYQ Mock Exam',
    topic: 'Timed 3-Hour Exam Simulation & Model Solution Analysis',
    color: 'border-purple-400/50 bg-purple-500/10 text-purple-600 dark:text-purple-300',
    isCompleted: false,
  },
];

const COLOR_OPTIONS = [
  { label: 'Emerald / Accounts', value: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' },
  { label: 'Cyan / Economics', value: 'border-cyan-400/50 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300' },
  { label: 'Violet / Maths', value: 'border-violet-400/50 bg-violet-500/10 text-violet-600 dark:text-violet-300' },
  { label: 'Amber / OCM', value: 'border-amber-400/50 bg-amber-500/10 text-amber-600 dark:text-amber-300' },
  { label: 'Blue / IT', value: 'border-blue-400/50 bg-blue-500/10 text-blue-600 dark:text-blue-300' },
  { label: 'Rose / SP', value: 'border-rose-400/50 bg-rose-500/10 text-rose-600 dark:text-rose-300' },
  { label: 'Purple / Mock Test', value: 'border-purple-400/50 bg-purple-500/10 text-purple-600 dark:text-purple-300' },
];

export const Timetable: React.FC = () => {
  // Sync schedule directly with hidden GitHub Database pipeline with local server fallback
  const [schedule, setSchedule, isSaving, isConnected] = useServerStorage<TimeSlot[]>(
    async () => {
      try {
        const ghTimetable = await api.syncGet<TimeSlot[]>('timetable.json');
        if (Array.isArray(ghTimetable) && ghTimetable.length > 0) return ghTimetable;
      } catch {
        // Fallback
      }
      return await api.getTimetable<TimeSlot[]>();
    },
    async (slots) => {
      try {
        await api.syncPut('timetable.json', slots);
      } catch {
        // Fallback
      }
      return await api.saveTimetable(slots);
    },
    INITIAL_SCHEDULE
  );

  const [activeDay, setActiveDay] = useState<DayOfWeek>('Monday');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New block form fields
  const [newDay, setNewDay] = useState<DayOfWeek>('Monday');
  const [newStartTime, setNewStartTime] = useState<string>('09:00');
  const [newEndTime, setNewEndTime] = useState<string>('10:30');
  const [newSubject, setNewSubject] = useState<string>('');
  const [newTopic, setNewTopic] = useState<string>('');
  const [newColor, setNewColor] = useState<string>(COLOR_OPTIONS[0].value);

  const { startForSubject, activeSubject, isRunning } = usePomodoro();

  const allSubjects = Array.from(new Set(schedule.map((s) => s.subject))).filter(Boolean);

  const handleToggleCompleted = (id: string) => {
    setSchedule((prev) =>
      prev.map((slot) => (slot.id === id ? { ...slot, isCompleted: !slot.isCompleted } : slot))
    );
  };

  const handleDeleteSlot = (id: string) => {
    setSchedule((prev) => prev.filter((slot) => slot.id !== id));
  };

  const handleLoadModelSchedule = () => {
    setSchedule(INITIAL_SCHEDULE);
    try {
      localStorage.setItem('aether_user_timetable', JSON.stringify(INITIAL_SCHEDULE));
    } catch {}
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newSubject.trim()) return;

    const newSlot: TimeSlot = {
      id: `ts-${Date.now()}`,
      day: newDay,
      startTime: newStartTime,
      endTime: newEndTime,
      subject: newSubject.trim(),
      topic: newTopic.trim(),
      color: newColor,
      isCompleted: false,
    };

    setSchedule((prev) => {
      const next = [...prev, newSlot];
      try {
        localStorage.setItem('aether_user_timetable', JSON.stringify(next));
      } catch {}
      return next;
    });

    setNewSubject('');
    setNewTopic('');
    setShowAddModal(false);
  };

  const currentDaySlots = schedule
    .filter((slot) => slot.day === activeDay)
    .filter((slot) => selectedSubjectFilter === 'All' || slot.subject === selectedSubjectFilter)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-8 relative">
      {/* Top Banner and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            <span>Academic Scheduler & Dispatcher</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Academic Timetable
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <span>Coordinate multi-hour focus blocks linked with Pomodoro triggers.</span>
            <span className="flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-full liquid-glass-subtle">
              <Server className={`w-3 h-3 ${isConnected ? 'text-emerald-500' : 'text-amber-500'}`} />
              {isSaving ? 'Syncing...' : isConnected ? 'Server Stored' : 'Offline Buffer'}
            </span>
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="liquid-glass text-xs text-slate-700 dark:text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
          >
            <option value="All">All Subjects ({allSubjects.length})</option>
            {allSubjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setNewDay(activeDay);
              setShowAddModal(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/25 transition-all active:scale-95 glass-pill"
          >
            <Plus className="w-4 h-4" />
            <span>Add Study Block</span>
          </button>
        </div>
      </div>

      {/* Weekday Switcher Tabs */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 p-1.5 liquid-glass rounded-2xl mb-6 shadow-sm select-none shrink-0">
        {DAYS.map((day) => {
          const count = schedule.filter((s) => s.day === day).length;
          const isSelected = activeDay === day;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center sm:justify-between ${
                isSelected
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40'
              }`}
            >
              <span className="hidden sm:inline">{day.slice(0, 3)}</span>
              <span className="sm:hidden text-[10px] font-bold tracking-tight">{day.slice(0, 3)}</span>
              <span
                className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full mt-0.5 sm:mt-0 ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Time Slots List */}
      <div className="space-y-3">
        {currentDaySlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 md:p-14 liquid-glass rounded-3xl text-center border border-slate-200/50 dark:border-slate-800/50">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3 border border-brand-100 dark:border-brand-900/40 shadow-xs">
              <Clock className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No study blocks planned for {activeDay}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Schedule your focused revision blocks to lock in productive flow.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setNewDay(activeDay);
                  setShowAddModal(true);
                }}
                className="flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Block for {activeDay.slice(0, 3)}</span>
              </button>
              {schedule.length === 0 && (
                <button
                  type="button"
                  onClick={handleLoadModelSchedule}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-xl border border-purple-200 dark:border-purple-800 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Load Model HSC Schedule</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          currentDaySlots.map((slot) => {
            const isPomodoroActive = isRunning && activeSubject === slot.subject;

            return (
              <div
                key={slot.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 rounded-2xl liquid-glass border transition-all ${
                  slot.color
                } ${
                  slot.isCompleted ? 'opacity-65' : ''
                } hover:shadow-lg`}
              >
                {/* Details */}
                <div className="flex items-start space-x-3.5 mb-3 sm:mb-0">
                  <button
                    type="button"
                    onClick={() => handleToggleCompleted(slot.id)}
                    className="mt-1 transition-transform active:scale-90 cursor-pointer"
                    title={slot.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {slot.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400 dark:text-slate-500 hover:text-brand-500" />
                    )}
                  </button>

                  <div>
                    <div className="flex items-center space-x-2.5">
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {slot.startTime} – {slot.endTime}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full liquid-glass-subtle">
                        {slot.subject}
                      </span>
                    </div>

                    {slot.topic && (
                      <div className="flex items-center space-x-2 mt-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span className={slot.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''}>
                          {slot.topic}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => startForSubject(slot.subject)}
                    className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                      isPomodoroActive
                        ? 'bg-amber-500 text-slate-950 animate-pulse'
                        : 'bg-white/60 dark:bg-slate-800/80 hover:bg-brand-600 hover:text-white text-slate-700 dark:text-slate-200 border border-white/40 dark:border-white/10'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isPomodoroActive ? 'Focus Running' : 'Focus Now'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                    title="Delete session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Block Modal Dialog */}
      {showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-brand-500" />
                Schedule Study Block
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSlot} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Day</label>
                  <select
                    value={newDay}
                    onChange={(e) => setNewDay(e.target.value as DayOfWeek)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Color Palette</label>
                  <select
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  >
                    {COLOR_OPTIONS.map((c) => (
                      <option key={c.label} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Academic Subject
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {SUGGESTED_SUBJECTS.slice(0, 5).map((subj) => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setNewSubject(subj)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-brand-50 dark:bg-slate-800 dark:hover:bg-brand-950 text-slate-600 dark:text-slate-300 hover:text-brand-600 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    >
                      {subj.replace(/\s*\(.*\)/, '')}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="e.g. Book-Keeping & Accountancy, Economics"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Topic / Revision Goal</label>
                <input
                  type="text"
                  placeholder="e.g. Partnership Final Accounts, Price Elasticity of Demand"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-lg shadow-brand-500/30 transition-all cursor-pointer"
                >
                  Save Study Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
