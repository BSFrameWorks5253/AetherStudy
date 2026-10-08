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
} from 'lucide-react';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const INITIAL_SCHEDULE: TimeSlot[] = [
  {
    id: 'ts-1',
    day: 'Monday',
    startTime: '08:30',
    endTime: '10:30',
    subject: 'Distributed Systems',
    topic: 'MIT 6.824 Lab 2: Raft Consensus RPC Implementation',
    color: 'border-cyan-400/50 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300',
    isCompleted: true,
  },
  {
    id: 'ts-2',
    day: 'Monday',
    startTime: '11:00',
    endTime: '12:30',
    subject: 'Quantum Information',
    topic: 'Surface Codes & Stabilizer Generators Problem Set',
    color: 'border-violet-400/50 bg-violet-500/10 text-violet-600 dark:text-violet-300',
    isCompleted: false,
  },
  {
    id: 'ts-3',
    day: 'Tuesday',
    startTime: '09:00',
    endTime: '11:00',
    subject: 'Machine Learning Theory',
    topic: 'FlashAttention Kernel Derivations & CUDA Memory Benchmarks',
    color: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    isCompleted: false,
  },
  {
    id: 'ts-4',
    day: 'Wednesday',
    startTime: '14:00',
    endTime: '16:00',
    subject: 'Computer Systems & OS',
    topic: 'TSO Memory Fences & Lock-Free Multi-Producer Queues',
    color: 'border-amber-400/50 bg-amber-500/10 text-amber-600 dark:text-amber-300',
    isCompleted: false,
  },
  {
    id: 'ts-5',
    day: 'Thursday',
    startTime: '10:00',
    endTime: '12:00',
    subject: 'Distributed Systems',
    topic: 'Byzantine Agreement & View Change Proofs',
    color: 'border-cyan-400/50 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300',
    isCompleted: false,
  },
  {
    id: 'ts-6',
    day: 'Friday',
    startTime: '15:00',
    endTime: '17:00',
    subject: 'Quantum Information',
    topic: 'Anyon Braiding Simulation & Clifford Synthesis',
    color: 'border-violet-400/50 bg-violet-500/10 text-violet-600 dark:text-violet-300',
    isCompleted: false,
  },
];

const COLOR_OPTIONS = [
  { label: 'Cyan / Cloud', value: 'border-cyan-400/50 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300' },
  { label: 'Violet / Quantum', value: 'border-violet-400/50 bg-violet-500/10 text-violet-600 dark:text-violet-300' },
  { label: 'Emerald / AI', value: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' },
  { label: 'Amber / Systems', value: 'border-amber-400/50 bg-amber-500/10 text-amber-600 dark:text-amber-300' },
  { label: 'Rose / Math', value: 'border-rose-400/50 bg-rose-500/10 text-rose-600 dark:text-rose-300' },
];

export const Timetable: React.FC = () => {
  // Sync schedule directly with backend Server Storage
  const [schedule, setSchedule, isSaving, isConnected] = useServerStorage<TimeSlot[]>(
    async () => {
      const res = await api.getTimetable<TimeSlot[]>();
      return res;
    },
    async (slots) => {
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

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
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

    setSchedule((prev) => [...prev, newSlot]);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
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

        <div className="flex items-center space-x-3">
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
      <div className="flex space-x-2 p-1.5 liquid-glass rounded-2xl mb-6 overflow-x-auto no-scrollbar shadow-sm">
        {DAYS.map((day) => {
          const count = schedule.filter((s) => s.day === day).length;
          const isSelected = activeDay === day;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`flex-1 min-w-[105px] py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                isSelected
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40'
              }`}
            >
              <span>{day.slice(0, 3)}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
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
          <div className="flex flex-col items-center justify-center p-14 liquid-glass rounded-3xl text-center">
            <Clock className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No study blocks planned for {activeDay}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Schedule your focused blocks now to lock in productive flow.
            </p>
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
                    onClick={() => handleToggleCompleted(slot.id)}
                    className="mt-1 transition-transform active:scale-90"
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
                    onClick={() => startForSubject(slot.subject)}
                    className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      isPomodoroActive
                        ? 'bg-amber-500 text-slate-950 animate-pulse'
                        : 'bg-white/60 dark:bg-slate-800/80 hover:bg-brand-600 hover:text-white text-slate-700 dark:text-slate-200 border border-white/40 dark:border-white/10'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isPomodoroActive ? 'Focus Running' : 'Focus Now'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md liquid-glass rounded-3xl p-6 shadow-2xl text-slate-800 dark:text-slate-100 border border-white/60 dark:border-white/10">
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-brand-500" />
                Schedule Study Block
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
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
                    className="w-full liquid-glass-subtle rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
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
                    className="w-full liquid-glass-subtle rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
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
                    className="w-full liquid-glass-subtle rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full liquid-glass-subtle rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Academic Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Systems, Quantum Information"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full liquid-glass-subtle rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Topic / Lab Assignment</label>
                <input
                  type="text"
                  placeholder="e.g. Lab 2: Raft Leader Election & Heartbeats"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  className="w-full liquid-glass-subtle rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-lg shadow-brand-500/30 glass-pill"
                >
                  Save to Server
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
