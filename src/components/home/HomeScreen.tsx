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
  History,
  Clock,
  Play,
  Trash2,
  X,
  Calculator,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ActiveTab } from '../layout/Sidebar';
import { PaperRequestsManagerModal } from '../vault/PaperRequestsManagerModal';
import { StudentPaperRequestModal } from '../vault/StudentPaperRequestModal';
import { RevisionExporterModal } from '../common/RevisionExporterModal';
import { UsersManagerModal } from '../admin/UsersManagerModal';
import { DocumentReviewsModal } from '../admin/DocumentReviewsModal';
import { api } from '../../services/api';
import { recentDocuments, RecentDocument } from '../../services/recentDocuments';

interface HomeScreenProps {
  onNavigate: (tab: ActiveTab, subjectOverride?: string, docOverride?: string) => void;
  onOpenPaperRequestModal?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  onOpenPaperRequestModal,
}) => {
  const { currentUser, isSuperAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState<'overview' | 'recents'>('overview');
  const [showUsersModal, setShowUsersModal] = useState<boolean>(false);
  const [showDocumentReviewsModal, setShowDocumentReviewsModal] = useState<boolean>(false);
  const [recentList, setRecentList] = useState<RecentDocument[]>(() =>
    recentDocuments.getRecentDocuments()
  );
  const [showAdminRequestsModal, setShowAdminRequestsModal] = useState<boolean>(false);
  const [showStudentRequestModal, setShowStudentRequestModal] = useState<boolean>(false);
  const [showDossierModal, setShowDossierModal] = useState<boolean>(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [pendingReviewsCount, setPendingReviewsCount] = useState<number>(0);
  const [countdown, setCountdown] = useState<{ days: number; hours: number; mins: number }>({
    days: 0,
    hours: 0,
    mins: 0,
  });

  // Keep recently viewed documents updated in real-time
  useEffect(() => {
    const handleUpdate = () => {
      setRecentList(recentDocuments.getRecentDocuments());
    };
    window.addEventListener('aether-recents-updated', handleUpdate);
    window.addEventListener('aether-reading-progress-updated', handleUpdate);
    return () => {
      window.removeEventListener('aether-recents-updated', handleUpdate);
      window.removeEventListener('aether-reading-progress-updated', handleUpdate);
    };
  }, []);

  // Calculate live countdown to Maharashtra State Board HSC Exam (typically mid February)
  useEffect(() => {
    const calculateCountdown = () => {
      const currentYear = new Date().getFullYear();
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

  // For SuperAdmin: poll or fetch pending paper requests and document reviews count
  useEffect(() => {
    if (isSuperAdmin) {
      api.getPaperRequests()
        .then((reqs) => {
          setPendingRequestsCount(reqs.filter((r) => r.status === 'pending').length);
        })
        .catch(() => {});

      api.getPendingReviews()
        .then((rev) => {
          setPendingReviewsCount(rev.pendingUploads.length + rev.pendingRenames.length);
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

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Recently';
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(isoString).toLocaleDateString();
  };

  const studentName = currentUser?.email
    ? currentUser.email.split('@')[0].replace(/[._]/g, ' ')
    : 'Scholar';

  // Canonical Standard 12 Subjects matching SubjectRooms.tsx
  const subjects = [
    {
      id: 'bk',
      name: 'Book-Keeping & Accountancy (Accounts)',
      short: 'BK & Accounts',
      code: 'BK',
      color: 'from-amber-500/20 to-orange-500/20',
      border: 'border-amber-500/30',
      text: 'text-amber-600 dark:text-amber-400',
      icon: Calculator,
      chapters: '10 Chapters',
    },
    {
      id: 'ocm',
      name: 'Organization of Commerce & Management (OCM)',
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
      name: 'Economics (ECO)',
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
      name: 'Secretarial Practice (SP)',
      short: 'S.P.',
      code: 'SP',
      color: 'from-purple-500/20 to-pink-500/20',
      border: 'border-purple-500/30',
      text: 'text-purple-600 dark:text-purple-400',
      icon: FileText,
      chapters: '12 Chapters',
    },
    {
      id: 'maths',
      name: 'Mathematics & Statistics (Commerce)',
      short: 'Maths & Stats',
      code: 'MATH',
      color: 'from-yellow-500/20 to-amber-500/20',
      border: 'border-yellow-500/30',
      text: 'text-yellow-600 dark:text-yellow-400',
      icon: BarChart3,
      chapters: '16 Chapters',
    },
    {
      id: 'eng',
      name: 'English (Yuvakbharati)',
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
      name: 'Information Technology (IT)',
      short: 'IT',
      code: 'IT',
      color: 'from-rose-500/20 to-violet-500/20',
      border: 'border-rose-500/30',
      text: 'text-rose-600 dark:text-rose-400',
      icon: GraduationCap,
      chapters: '6 Chapters',
    },
    {
      id: 'hindi',
      name: 'Hindi',
      short: 'Hindi',
      code: 'HIN',
      color: 'from-orange-500/20 to-amber-500/20',
      border: 'border-orange-500/30',
      text: 'text-orange-600 dark:text-orange-400',
      icon: BookOpen,
      chapters: '12 Chapters',
    },
  ];

  const handleResumeRecentDoc = (doc: RecentDocument) => {
    onNavigate('workspace', doc.subject, doc.name);
  };

  return (
    <div className="h-full w-full overflow-y-auto pb-24 md:pb-12 px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* HERO GREETING & BOARD COUNTDOWN */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8 ios-glass border border-black/[0.06] dark:border-white/[0.08] shadow-sm animate-slide-up">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-700 dark:text-brand-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              <span>Maharashtra State Board • HSC Class 12 Commerce</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight capitalize">
              {getGreeting()},{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-300">
                {studentName}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl font-normal leading-relaxed">
              Welcome to your centralized academic command center. Study textbooks, verify PYQs with model solutions, track your syllabus mastery, and execute your daily focus blocks.
            </p>
          </div>

          {/* HSC Exam Countdown Card */}
          <div className="flex items-center gap-3.5 bg-white/80 dark:bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-xs backdrop-blur-md shrink-0">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Flame className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                HSC Board Exams
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono tracking-tight animate-tick-in">
                  {countdown.days}
                </span>
                <span className="text-xs font-medium text-slate-500">Days Left</span>
                <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                  • {countdown.hours}h {countdown.mins}m
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Paper Requests Alert Bar (if pending) */}
        {isSuperAdmin && pendingRequestsCount > 0 && (
          <div className="mt-5 p-3 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">
                <FileQuestion className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
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
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              Open Manager
            </button>
          </div>
        )}

        {/* SuperAdmin Document Reviews Alert Bar */}
        {isSuperAdmin && pendingReviewsCount > 0 && (
          <div className="mt-4 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-transparent border border-amber-500/30 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-amber-500/20">
                <ShieldCheck className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{pendingReviewsCount} Document Reviews Awaiting Approval</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">Action Needed</span>
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Faculty Admins have uploaded or renamed PDFs requiring your authorization before students see them.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDocumentReviewsModal(true)}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              Open Review Desk
            </button>
          </div>
        )}
      </section>

      {/* 🧭 HOME PAGE SUB-NAV / TABS (Overview vs Recents) */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSection('overview')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeSection === 'overview'
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/30'
                : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-800'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Academic Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('recents')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 relative ${
              activeSection === 'recents'
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/30'
                : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Recents</span>
            {recentList.length > 0 && (
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                  activeSection === 'recents'
                    ? 'bg-white/25 text-white'
                    : 'bg-brand-500/15 text-brand-600 dark:text-brand-400'
                }`}
              >
                {recentList.length}
              </span>
            )}
          </button>
        </div>

        {activeSection === 'recents' && recentList.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Clear all recently viewed documents history?')) {
                recentDocuments.clearRecentDocuments();
              }
            }}
            className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-rose-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Recents</span>
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* VIEW A: RECENTS TAB                                      */}
      {/* ========================================================= */}
      {activeSection === 'recents' ? (
        <section className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-brand-500" />
                <span>Recently Viewed Documents</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pick up exactly where you left off. Saved pages and reading percentages are synced.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-400">
              {recentList.length} {recentList.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {recentList.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Recently Viewed Documents Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Open any textbook PDF, study notes, or PYQ papers from the Subject Desk, and they will automatically appear here for 1-click continuation.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('workspace')}
                className="mt-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
              >
                Open Subject Desk
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentList.map((doc) => {
                const percent = doc.percent || 0;
                return (
                  <div
                    key={doc.id || doc.name}
                    className="group p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-brand-500/40 dark:hover:border-brand-400/40 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 backdrop-blur-sm relative"
                  >
                    <div className="space-y-3">
                      {/* Badge bar */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/20 truncate max-w-[170px]">
                          {doc.subject}
                        </span>

                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(doc.lastViewedAt)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              recentDocuments.removeRecentDocument(doc.id || doc.name);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Remove from recents"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <div>
                        <h4
                          onClick={() => handleResumeRecentDoc(doc)}
                          className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2 cursor-pointer leading-snug"
                        >
                          {doc.name}
                        </h4>
                        {doc.chapterNumber && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium truncate">
                            {doc.chapterNumber} {doc.chapterTitle ? `• ${doc.chapterTitle}` : ''}
                          </p>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          <span>
                            {doc.currentPage && doc.numPages && doc.numPages > 1
                              ? `Page ${doc.currentPage} of ${doc.numPages}`
                              : 'Document in progress'}
                          </span>
                          <span className="font-mono text-brand-600 dark:text-brand-400">{percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-brand-600 to-indigo-600 rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(percent, 4)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Resume Action */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] font-medium text-slate-400 capitalize">
                        {doc.category === 'textbook' ? '📚 Textbook PDF' : '📝 Study Note'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleResumeRecentDoc(doc)}
                        className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Resume</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        /* ========================================================= */
        /* VIEW B: OVERVIEW TAB                                     */
        /* ========================================================= */
        <div className="space-y-6 sm:space-y-8 animate-fade-in">
          {/* Quick-Access "Continue Studying" strip if recents exist */}
          {recentList.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-brand-500" />
                  <span>Continue Studying</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveSection('recents')}
                  className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View all ({recentList.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentList.slice(0, 3).map((doc) => (
                  <div
                    key={doc.id || doc.name}
                    onClick={() => handleResumeRecentDoc(doc)}
                    className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-brand-500/40 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3 backdrop-blur-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold truncate max-w-[150px]">
                          {doc.subject}
                        </span>
                        <span>{formatRelativeTime(doc.lastViewedAt)}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1">
                        {doc.name}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold">
                      <span className="text-slate-500 dark:text-slate-400">
                        {doc.currentPage ? `Page ${doc.currentPage}` : 'Resume doc'}
                      </span>
                      <span className="text-brand-600 dark:text-brand-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Continue</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 🚀 PRIMARY 4 COMMAND LAUNCH CARDS (Bento Grid) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-brand-500" />
                <span>Academic Workspaces</span>
              </h2>
              <span className="text-xs text-slate-400 font-medium">Quick Launch</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Study Desk */}
              <div
                onClick={() => onNavigate('workspace')}
                className="group p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-brand-500/40 dark:hover:border-brand-400/40 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4 hover:-translate-y-0.5 backdrop-blur-sm animate-slide-up stagger-1"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:scale-105 transition-transform border border-brand-500/20">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                      Textbooks & Notes
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors tracking-tight">
                      Subject Study Desk
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      Interactive PDF reader, chapter textbook vault, theory notes, and formula sheets.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-brand-600 dark:text-brand-400">
                  <span>Open Desk</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Card 2: Board PYQs */}
              <div
                onClick={() => onNavigate('tests')}
                className="group p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/40 dark:hover:border-blue-400/40 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4 hover:-translate-y-0.5 backdrop-blur-sm animate-slide-up stagger-2"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform border border-blue-500/20">
                    <FileCheck2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                      Past 5 Years
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-tight">
                      Board PYQs & Solutions
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      Official Maharashtra Board papers, model answer keys, and marking scheme analysis.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <span>Practice PYQs</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Card 3: Academic Schedule */}
              <div
                onClick={() => onNavigate('timetable')}
                className="group p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/40 dark:hover:border-amber-400/40 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4 hover:-translate-y-0.5 backdrop-blur-sm animate-slide-up stagger-3"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform border border-amber-500/20">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                      Daily Focus Blocks
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors tracking-tight">
                      Academic Schedule
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      Timetable planner, Pomodoro study sprints, and cloud-synced daily routine.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <span>View Planner</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Card 4: Curriculum Mastery */}
              <div
                onClick={() => onNavigate('syllabus')}
                className="group p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/40 dark:hover:border-emerald-400/40 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4 hover:-translate-y-0.5 backdrop-blur-sm animate-slide-up stagger-4"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform border border-emerald-500/20">
                    <ListTodo className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                      Weightage & Topics
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors tracking-tight">
                      Curriculum Mastery
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      Chapter-wise checklist, board mark distribution, and revision progress rings.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>Track Syllabus</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </section>

          {/* 📚 HSC COMMERCE SUBJECT ROOMS DIRECT 1-CLICK JUMP */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-brand-500" />
                  <span>Class 12 Subject Rooms</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Click any subject to jump directly into its textbooks, notes, and curriculum room.
                </p>
              </div>
              <span className="text-xs text-brand-600 dark:text-brand-400 font-semibold hidden sm:inline">
                Direct Jump
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3.5">
              {subjects.map((sub) => {
                const Icon = sub.icon;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => onNavigate('workspace', sub.name)}
                    className="p-4 sm:p-4.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-brand-500/50 dark:hover:border-brand-400/50 shadow-2xs hover:shadow-lg transition-all text-left flex flex-col justify-between space-y-3 cursor-pointer group hover:-translate-y-0.5 active:scale-95 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${sub.color} ${sub.text} flex items-center justify-center font-bold text-xs shadow-2xs group-hover:scale-105 transition-transform`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                        {sub.code}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1">
                        {sub.short}
                      </h4>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-medium">
                        <span>{sub.chapters}</span>
                        <span className="text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-bold">
                          <span>Enter</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 🎯 ACTION BANNERS: REVISION DOSSIER & REQUEST PAPER */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Printable Revision Dossier */}
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 backdrop-blur-sm">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300 flex items-center justify-center border border-brand-500/20">
                  <Printer className="w-5 h-5" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Last Minute Revision Dossier (LMR)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
                  Generate a clean, 1-click printable summary sheet containing essential accounting formats, economics laws, and chapter revision checklists.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDossierModal(true)}
                className="w-full sm:w-auto self-start px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Generate Revision Dossier</span>
              </button>
            </div>

            {/* Request Missing Paper */}
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 backdrop-blur-sm">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <FileQuestion className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Request Past Papers or Solutions
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
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
                      setShowStudentRequestModal(true);
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <FileQuestion className="w-4 h-4" />
                  <span>Submit Paper Request</span>
                </button>

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowAdminRequestsModal(true)}
                    className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span>Paper Requests</span>
                    {pendingRequestsCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-amber-500 text-black text-[10px] rounded-full font-bold">
                        {pendingRequestsCount}
                      </span>
                    )}
                  </button>
                )}

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowDocumentReviewsModal(true)}
                    className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Review Desk</span>
                    {pendingReviewsCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-white text-amber-700 text-[10px] rounded-full font-black animate-pulse">
                        {pendingReviewsCount}
                      </span>
                    )}
                  </button>
                )}

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowUsersModal(true)}
                    className="px-3.5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="View registered users, active/inactive status, and assign admins"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Manage Users</span>
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* 🌟 FOOTER ATTRIBUTION (Made by Burhanuddin Sounasath) */}
      <footer className="pt-8 pb-4 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            AetherStudy • HSC Class 12 Commerce Command Center
          </span>
        </div>

        <div className="flex items-center gap-2 font-medium">
          <span>Made by</span>
          <span className="font-bold text-slate-900 dark:text-white px-2.5 py-1 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-700 dark:text-brand-300 tracking-wide">
            Burhanuddin Sounasath
          </span>
        </div>
      </footer>

      {/* Modals */}
      <StudentPaperRequestModal
        isOpen={showStudentRequestModal}
        onClose={() => setShowStudentRequestModal(false)}
      />

      <PaperRequestsManagerModal
        isOpen={showAdminRequestsModal}
        onClose={() => setShowAdminRequestsModal(false)}
        onRequestCountChange={(cnt) => setPendingRequestsCount(cnt)}
      />

      <RevisionExporterModal
        isOpen={showDossierModal}
        onClose={() => setShowDossierModal(false)}
      />

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
            api.getPendingReviews().then(rev => {
              setPendingReviewsCount(rev.pendingUploads.length + rev.pendingRenames.length);
            }).catch(() => {});
            window.dispatchEvent(new CustomEvent('aether_reviews_updated'));
          }}
        />
      )}
    </div>
  );
};

export default HomeScreen;
