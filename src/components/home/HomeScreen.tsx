import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileCheck2,
  CalendarDays,
  ListTodo,
  Sparkles,
  Flame,
  ArrowRight,
  TrendingUp,
  FileText,
  Printer,
  FileQuestion,
  Compass,
  GraduationCap,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ActiveTab } from '../layout/Sidebar';
import { PaperRequestsManagerModal } from '../vault/PaperRequestsManagerModal';
import { RevisionExporterModal } from '../common/RevisionExporterModal';
import { api } from '../../services/api';

interface HomeScreenProps {
  onNavigate: (tab: ActiveTab, subjectOverride?: string) => void;
  onOpenPaperRequestModal?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  onOpenPaperRequestModal,
}) => {
  const { currentUser, isSuperAdmin } = useAuth();
  const [showAdminRequestsModal, setShowAdminRequestsModal] = useState<boolean>(false);
  const [showDossierModal, setShowDossierModal] = useState<boolean>(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [countdown, setCountdown] = useState<{ days: number; hours: number; mins: number }>({
    days: 0,
    hours: 0,
    mins: 0,
  });

  // Calculate live countdown to Maharashtra State Board HSC Exam (typically mid February)
  useEffect(() => {
    const calculateCountdown = () => {
      const currentYear = new Date().getFullYear();
      // Target exam start: Feb 21 of next or current academic year
      let examDate = new Date(`${currentYear}-02-21T09:00:00+05:30`);
      if (Date.now() > examDate.getTime()) {
        examDate = new Date(`${currentYear + 1}-02-21T09:00:00+05:30`);
      }
      const diff = examDate.getTime() - Date.now();
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown({ days, hours, mins });
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  // For Admins: poll or fetch pending paper requests count
  useEffect(() => {
    if (isSuperAdmin) {
      api.getPaperRequests()
        .then((reqs) => {
          setPendingRequestsCount(reqs.filter((r) => r.status === 'pending').length);
        })
        .catch(() => {});
    }
  }, [isSuperAdmin]);

  // Greeting by hour
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const studentName = currentUser?.email
    ? currentUser.email.split('@')[0].replace(/[._]/g, ' ')
    : 'Scholar';

  const subjects = [
    {
      id: 'bk',
      name: 'Book-Keeping & Accountancy',
      short: 'BK & Accounts',
      code: 'BK',
      color: 'from-amber-500/20 to-orange-500/20',
      border: 'border-amber-500/30',
      text: 'text-amber-600 dark:text-amber-400',
      icon: BarChart3,
      chapters: '10 Chapters',
    },
    {
      id: 'ocm',
      name: 'Organisation of Commerce & Management',
      short: 'O.C.M.',
      code: 'OCM',
      color: 'from-blue-500/20 to-indigo-500/20',
      border: 'border-blue-500/30',
      text: 'text-blue-600 dark:text-blue-400',
      icon: Compass,
      chapters: '8 Chapters',
    },
    {
      id: 'eco',
      name: 'Economics',
      short: 'Economics',
      code: 'ECO',
      color: 'from-emerald-500/20 to-teal-500/20',
      border: 'border-emerald-500/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      icon: TrendingUp,
      chapters: '10 Chapters',
    },
    {
      id: 'sp',
      name: 'Secretarial Practice',
      short: 'S.P.',
      code: 'SP',
      color: 'from-purple-500/20 to-pink-500/20',
      border: 'border-purple-500/30',
      text: 'text-purple-600 dark:text-purple-400',
      icon: FileText,
      chapters: '12 Chapters',
    },
    {
      id: 'eng',
      name: 'English Yuvakbharati',
      short: 'English',
      code: 'ENG',
      color: 'from-sky-500/20 to-cyan-500/20',
      border: 'border-sky-500/30',
      text: 'text-sky-600 dark:text-sky-400',
      icon: BookOpen,
      chapters: '4 Sections',
    },
    {
      id: 'it',
      name: 'Information Technology',
      short: 'IT / Maths',
      code: 'IT',
      color: 'from-rose-500/20 to-violet-500/20',
      border: 'border-rose-500/30',
      text: 'text-rose-600 dark:text-rose-400',
      icon: GraduationCap,
      chapters: 'Class 12',
    },
  ];

  return (
    <div className="h-full w-full overflow-y-auto pb-24 md:pb-12 px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* 🌟 HERO GREETING & BOARD COUNTDOWN BANNER */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 ios-glass border border-black/[0.08] dark:border-white/[0.1] shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/25 text-brand-700 dark:text-brand-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Maharashtra State Board • HSC Class 12 Commerce</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight capitalize">
              {getGreeting()},{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-300">
                {studentName}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl font-medium">
              Welcome to your centralized academic command center. Study textbooks, verify PYQs with model solutions, track your syllabus mastery, and execute your daily focus blocks.
            </p>
          </div>

          {/* HSC Exam Countdown Card */}
          <div className="flex items-center gap-3 bg-white/70 dark:bg-slate-900/70 p-4 sm:p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-md backdrop-blur-md shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Flame className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                HSC Board Exams
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {countdown.days}
                </span>
                <span className="text-xs font-bold text-slate-500">Days Left</span>
                <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                  • {countdown.hours}h {countdown.mins}m
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Paper Requests Alert Bar (if pending) */}
        {isSuperAdmin && pendingRequestsCount > 0 && (
          <div className="mt-5 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-transparent border border-amber-500/30 flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                <FileQuestion className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {pendingRequestsCount} Pending Student Paper Requests
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Students requested missing question papers and solution PDFs.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAdminRequestsModal(true)}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              Open Manager
            </button>
          </div>
        )}
      </section>

      {/* 🚀 PRIMARY 4 COMMAND LAUNCH CARDS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-brand-500" />
            <span>Academic Workspaces</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">Quick Launch</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Study Desk */}
          <div
            onClick={() => onNavigate('workspace')}
            className="group p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4 hover:-translate-y-0.5"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  Textbooks & Notes
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  Subject Study Desk
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  Interactive PDF reader, chapter textbook vault, theory notes, and formula sheets.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-brand-600 dark:text-brand-400">
              <span>Open Desk</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Board PYQs */}
          <div
            onClick={() => onNavigate('tests')}
            className="group p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4 hover:-translate-y-0.5"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  Past 5 Years
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Board PYQs & Solutions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  Official Maharashtra Board papers, model answer keys, and marking scheme analysis.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
              <span>Practice PYQs</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Academic Schedule */}
          <div
            onClick={() => onNavigate('timetable')}
            className="group p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4 hover:-translate-y-0.5"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  Daily Focus Blocks
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Academic Schedule
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  Timetable planner, Pomodoro study sprints, and cloud-synced daily routine.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
              <span>View Planner</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: Curriculum Mastery */}
          <div
            onClick={() => onNavigate('syllabus')}
            className="group p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4 hover:-translate-y-0.5"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ListTodo className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Weightage & Topics
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Curriculum Mastery
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  Chapter-wise checklist, board mark distribution, and revision progress rings.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span>Track Syllabus</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </section>

      {/* 📚 HSC COMMERCE SUBJECT ROOMS DIRECT SHORTCUT STRIP */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-brand-500" />
            <span>Class 12 Subject Rooms</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">1-Click Jump</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {subjects.map((sub) => {
            const Icon = sub.icon;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onNavigate('workspace', sub.name)}
                className={`p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:${sub.border} shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between space-y-3 cursor-pointer group hover:-translate-y-0.5 active:scale-95`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${sub.color} ${sub.text} flex items-center justify-center font-bold text-xs`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {sub.code}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1">
                    {sub.short}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    {sub.chapters}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 🎯 ACTION BANNERS: REVISION DOSSIER & REQUEST PAPER */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Printable Revision Dossier */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-brand-600/10 via-indigo-600/5 to-transparent border border-brand-500/20 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/15 text-brand-600 dark:text-brand-300 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Last Minute Revision Dossier (LMR)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Generate a clean, 1-click printable summary sheet containing essential accounting formats, economics laws, and chapter revision checklists.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowDossierModal(true)}
            className="w-full sm:w-auto self-start px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Generate Revision Dossier</span>
          </button>
        </div>

        {/* Request Missing Paper */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-600/10 via-orange-600/5 to-transparent border border-amber-500/20 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileQuestion className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Request Past Papers or Solutions
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Can't find a specific question paper, preliminary exam, or model answer key? Submit a request and our academic team will source and upload it.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (onOpenPaperRequestModal) {
                  onOpenPaperRequestModal();
                } else {
                  onNavigate('tests');
                }
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileQuestion className="w-4 h-4" />
              <span>Submit Paper Request</span>
            </button>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setShowAdminRequestsModal(true)}
                className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Admin View</span>
                {pendingRequestsCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-black text-[10px] rounded-full font-black">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Modals */}
      <PaperRequestsManagerModal
        isOpen={showAdminRequestsModal}
        onClose={() => setShowAdminRequestsModal(false)}
        onRequestCountChange={(cnt) => setPendingRequestsCount(cnt)}
      />

      <RevisionExporterModal
        isOpen={showDossierModal}
        onClose={() => setShowDossierModal(false)}
      />
    </div>
  );
};

export default HomeScreen;
