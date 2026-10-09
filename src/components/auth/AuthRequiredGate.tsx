import React from 'react';
import { Lock, Sparkles, Shield, ArrowRight, BookOpen, Calendar, ListTodo } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthRequiredGateProps {
  feature: 'timetable' | 'syllabus';
  onContinueAsGuest?: () => void;
}

export const AuthRequiredGate: React.FC<AuthRequiredGateProps> = ({
  feature,
  onContinueAsGuest,
}) => {
  const { openAuthModal } = useAuth();

  const isTimetable = feature === 'timetable';
  const Icon = isTimetable ? Calendar : ListTodo;
  const featureName = isTimetable ? 'Weekly Study Timetable' : 'Curriculum Mastery Tracker';
  const featureDescription = isTimetable
    ? 'Your daily study routine, personalized subject blocks, and Pomodoro focus sessions are private to your student account. Sign in to synchronize your timetable across all your devices.'
    : 'Your chapter checklists, revision marks, and syllabus progress are securely isolated to your student profile. Sign in to track your Maharashtra State Board preparation safely.';

  return (
    <div className="h-full w-full flex items-center justify-center p-4 sm:p-6 md:p-10 select-none overflow-y-auto">
      <div className="relative w-full max-w-lg ios-glass rounded-[32px] p-6 sm:p-10 border border-black/[0.08] dark:border-white/[0.1] shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Glow Accent */}
        <div className="absolute -top-12 -left-12 w-44 h-44 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-44 h-44 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Feature Icon Shield */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-brand-500/25">
          <Icon className="w-10 h-10" />
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-900 border-2 border-white dark:border-slate-800 flex items-center justify-center text-amber-400">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Tag Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-300 text-[11px] font-bold uppercase tracking-wider">
          <Shield className="w-3 h-3" />
          <span>User-Isolated Student Workspace</span>
        </div>

        {/* Header Texts */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Sign In to Access {featureName}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
            {featureDescription}
          </p>
        </div>

        {/* Privacy & Cloud Isolation Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left text-xs">
          <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] space-y-0.5">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>🔒 100% Private</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Your slots and chapter data are never visible to any other student.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] space-y-0.5">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>⚡ Cloud Synced</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Real-time synchronization across your phone, tablet, and PC.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={openAuthModal}
            className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ios-pill"
          >
            <Sparkles className="w-4 h-4" />
            <span>Sign In / Register with Email (OTP)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {onContinueAsGuest && (
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="w-full py-2.5 px-4 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Browse Subject Rooms as Guest</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthRequiredGate;
