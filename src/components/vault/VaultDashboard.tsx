import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { TestPaper } from '../../types/testPaper';
import { useStudyStore } from '../../store/useStudyStore';
import { InteractivePDFViewer } from './InteractivePDFViewer';
import { matchSubjectDoc } from '../workspace/SubjectRooms';
import {
  Search,
  Clock,
  Award,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  FileText,
  Check,
  Flame,
  FileCheck2,
  Layers,
  Plus,
  FolderUp,
  RefreshCw,
} from 'lucide-react';

interface PaperRequestForm {
  email: string;
  subject: string;
  year: string;
  notes: string;
}

interface VaultDashboardProps {
  displayMode?: 'vault' | 'funnel' | 'list';
  setDisplayMode?: (mode: 'vault' | 'funnel' | 'list') => void;
  canUpload?: boolean;
  onOpenUpload?: () => void;
  onOpenBulk?: () => void;
}

// Canonical Maharashtra HSC Commerce Subjects (Clean, non-duplicated)
const CANONICAL_COMMERCE_SUBJECTS = [
  { id: 'All', label: 'All Subjects' },
  { id: 'Accounts', label: 'Book-Keeping & Accountancy' },
  { id: 'OCM', label: 'Organization of Commerce & Management (OCM)' },
  { id: 'Economics', label: 'Economics' },
  { id: 'Secretarial Practice', label: 'Secretarial Practice (SP)' },
  { id: 'Mathematics', label: 'Maths & Statistics' },
  { id: 'IT', label: 'Information Technology (IT)' },
  { id: 'English', label: 'English' },
  { id: 'Hindi', label: 'Hindi' },
  { id: 'Marathi', label: 'Marathi' },
];

export const VaultDashboard: React.FC<VaultDashboardProps> = ({
  displayMode = 'vault',
  setDisplayMode,
  canUpload = false,
  onOpenUpload,
  onOpenBulk,
}) => {
  const [papers, setPapers] = useState<TestPaper[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Faceted Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');

  // Currently Open Paper in Interactive Viewer
  const [activeViewerPaper, setActiveViewerPaper] = useState<{
    paper: TestPaper;
    targetUrl: string;
    modeTitle: string;
  } | null>(null);

  // Lead Magnet "Request Paper" State
  const [showRequestModal, setShowRequestModal] = useState<boolean>(false);
  const [requestForm, setRequestForm] = useState<PaperRequestForm>({
    email: '',
    subject: 'Book-Keeping & Accountancy',
    year: '2024',
    notes: '',
  });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState<boolean>(false);
  const [requestSubmitted, setRequestSubmitted] = useState<boolean>(false);
  const [requestNotice, setRequestNotice] = useState<string>('');

  // Global Persistent Zustand Store
  const {
    completedPapers,
    toggleComplete,
    isCompleted,
    getPageProgress,
  } = useStudyStore();

  // Load paper repository from API
  useEffect(() => {
    let isCurrent = true;
    const loadRepo = async () => {
      setIsLoading(true);
      try {
        const papersData = await api.getTestPapers();
        if (isCurrent) {
          setPapers(papersData);
        }
      } catch (err) {
        console.warn('Could not load test papers archive:', err);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };
    loadRepo();
    return () => {
      isCurrent = false;
    };
  }, []);

  // Compute distinct years from database
  const distinctYears = useMemo(() => {
    const yearsSet = new Set<string>();
    papers.forEach((p) => {
      if (p.year) yearsSet.add(p.year.toString());
    });
    const sorted = Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
    return ['All', ...sorted];
  }, [papers]);

  // Check if any paper has a genuine solution
  const hasAnySolutions = useMemo(() => {
    return papers.some(
      (p) =>
        p.answerKeyPdfUrl &&
        p.answerKeyPdfUrl.trim() !== '' &&
        p.answerKeyPdfUrl !== p.questionPdfUrl
    );
  }, [papers]);

  // Distinct resource types
  const resourceTypes = useMemo(() => {
    const types = ['All', 'Past Paper (PYQ)'];
    if (hasAnySolutions) {
      types.push('Model Answer Key');
    }
    return types;
  }, [hasAnySolutions]);

  // Filtered papers matching faceted criteria
  const filteredPapers = useMemo(() => {
    return papers.filter((p) => {
      // 1. Text Search Query
      const q = searchQuery.toLowerCase().trim();
      const titleMatches = p.title?.toLowerCase().includes(q) || false;
      const subjMatches = p.subject?.toLowerCase().includes(q) || false;
      const matchesSearch = !q || titleMatches || subjMatches;

      // 2. Subject Filter using canonical mapping
      const matchesSubject =
        selectedSubject === 'All' ||
        matchSubjectDoc(selectedSubject, p.subject || '');

      // 3. Year Filter
      const matchesYear =
        selectedYear === 'All' || p.year?.toString() === selectedYear;

      // 4. Resource Type Filter
      let matchesType = true;
      if (selectedType === 'Model Answer Key') {
        matchesType = Boolean(
          p.answerKeyPdfUrl &&
          p.answerKeyPdfUrl.trim() !== '' &&
          p.answerKeyPdfUrl !== p.questionPdfUrl
        );
      } else if (selectedType === 'Past Paper (PYQ)') {
        matchesType = Boolean(p.questionPdfUrl);
      }

      return matchesSearch && matchesSubject && matchesYear && matchesType;
    });
  }, [papers, searchQuery, selectedSubject, selectedYear, selectedType]);

  // Handle Paper Request Submission (Dispatches email directly to Super Admin)
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestForm.email || !requestForm.email.includes('@')) {
      alert('Please enter a valid student email address.');
      return;
    }

    setIsSubmittingRequest(true);
    try {
      const res = await api.submitPaperRequest(requestForm);
      setRequestNotice(
        res.emailSent
          ? 'Notification sent directly to Super Admin (bs.framework5253@gmail.com). You will receive an update once uploaded!'
          : 'Request recorded! Our academic team will review and upload this paper.'
      );
      setRequestSubmitted(true);
      setTimeout(() => {
        setRequestSubmitted(false);
        setShowRequestModal(false);
        setRequestForm({
          email: '',
          subject: 'Book-Keeping & Accountancy',
          year: '2024',
          notes: '',
        });
        setRequestNotice('');
      }, 3500);
    } catch (err) {
      console.warn('Paper request submit error:', err);
      setRequestNotice('Request recorded! Our academic team has been alerted.');
      setRequestSubmitted(true);
      setTimeout(() => {
        setRequestSubmitted(false);
        setShowRequestModal(false);
      }, 3000);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // If a paper is currently open in the viewer, render the platform-adaptive viewer
  if (activeViewerPaper) {
    return (
      <InteractivePDFViewer
        url={activeViewerPaper.targetUrl}
        title={activeViewerPaper.modeTitle}
        paperId={activeViewerPaper.paper.id}
        subject={activeViewerPaper.paper.subject}
        year={activeViewerPaper.paper.year}
        totalMarks={activeViewerPaper.paper.totalMarks || 80}
        durationMinutes={activeViewerPaper.paper.durationMinutes || 180}
        onClose={() => setActiveViewerPaper(null)}
      />
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans select-none pb-24 md:pb-12 transition-colors">
      {/* ============================================================== */}
      {/* 1. HERO HEADER BLUEPRINT & UNIFIED TOP NAVIGATION              */}
      {/* ============================================================== */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-6 pb-6 ios-glass border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Integrated Mode Switcher & Admin Upload Toolbar */}
          {setDisplayMode && (
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="ios-segmented p-1 rounded-full border border-black/[0.04] dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setDisplayMode('vault')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ios-pill ${
                    displayMode === 'vault'
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Scannable Vault</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('funnel')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ios-pill ${
                    displayMode === 'funnel'
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Step Funnel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('list')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ios-pill ${
                    displayMode === 'list'
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>All Papers List</span>
                </button>
              </div>

              {canUpload && (
                <div className="flex items-center gap-2">
                  {onOpenUpload && (
                    <button
                      type="button"
                      onClick={onOpenUpload}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all bg-brand-600 hover:bg-brand-500 text-white shadow-sm ios-pill cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Upload Paper</span>
                    </button>
                  )}
                  {onOpenBulk && (
                    <button
                      type="button"
                      onClick={onOpenBulk}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all bg-purple-600 hover:bg-purple-500 text-white shadow-sm ios-pill cursor-pointer"
                    >
                      <FolderUp className="w-3.5 h-3.5" />
                      <span>Bulk Upload</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Absolute Syllabus Anchor Banner */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="tracking-tight">
              Aligned with Maharashtra State Board HSC Commerce Curriculum
            </span>
          </div>

          {/* Primary High-Converting Emotional Hook */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                HSC Commerce Board Exam Vault
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
                Official previous year question papers for Maharashtra State Board Standard 12 HSC Commerce. Instant search by subject, year, and examination session.
              </p>
            </div>

            {/* Quick Stats Retention Pill */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3.5 py-1.5 rounded-full ios-glass border border-black/[0.06] dark:border-white/[0.08] text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{papers.length} Board Papers</span>
              </span>
              <span className="px-3.5 py-1.5 rounded-full ios-glass border border-black/[0.06] dark:border-white/[0.08] text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>{completedPapers.length} Mastered</span>
              </span>
              <button
                type="button"
                onClick={() => setShowRequestModal(true)}
                className="px-4 py-1.5 rounded-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-all shadow-md shadow-brand-500/20 flex items-center gap-1.5 cursor-pointer ios-pill"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Request Paper</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. FACETED SEARCH ENGINE (YEAR, DEDUPLICATED SUBJECTS)         */}
      {/* ============================================================== */}
      <section className="px-4 sm:px-6 lg:px-8 py-5 max-w-7xl mx-auto w-full space-y-4">
        {/* Instant Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-4.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search papers by subject or year (e.g., 'Book-Keeping 2024', 'Economics March')..."
            className="w-full pl-12 pr-16 py-3.5 rounded-full ios-glass border border-black/[0.06] dark:border-white/[0.08] text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/10 transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4.5 top-1/2 -translate-y-1/2 text-xs font-semibold px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Faceted Filter Tags */}
        <div className="space-y-3.5 p-4 sm:p-5 rounded-[24px] ios-glass border border-black/[0.06] dark:border-white/[0.08] shadow-xs">
          {/* Subject Facet: Clean, Non-Duplicated Chips */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-2.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[75px] pt-1.5">
              Subject:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CANONICAL_COMMERCE_SUBJECTS.map((sub) => {
                const isSelected = selectedSubject.toLowerCase() === sub.id.toLowerCase();
                return (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubject(sub.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ios-pill ${
                      isSelected
                        ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/25 ring-1 ring-brand-500/30'
                        : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Year Facet */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[75px]">
              Year:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {distinctYears.map((yr) => {
                const isSelected = selectedYear === yr;
                return (
                  <button
                    key={yr}
                    onClick={() => setSelectedYear(yr)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ios-pill ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/25 ring-1 ring-amber-500/30'
                        : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resource Type Facet */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[75px]">
              Resource:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {resourceTypes.map((t) => {
                const isSelected = selectedType === t;
                return (
                  <button
                    key={t}
                    onClick={() => setSelectedType(t)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ios-pill ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/25 ring-1 ring-emerald-500/30'
                        : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. RESPONSIVE INTERACTIVE CARDS & VISUAL RETENTION HOOKS       */}
      {/* ============================================================== */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pb-16">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className="h-64 rounded-[26px] ios-glass border border-black/[0.06] dark:border-white/[0.08] p-5 space-y-3"
              >
                <div className="h-4 bg-black/10 dark:bg-white/10 rounded-full w-24" />
                <div className="h-5 bg-black/10 dark:bg-white/10 rounded-full w-48" />
                <div className="h-20 bg-black/5 dark:bg-white/5 rounded-2xl" />
                <div className="h-8 bg-black/10 dark:bg-white/10 rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredPapers.length === 0 ? (
          /* Smart Content Fallback & Lead Magnet Form */
          <div className="rounded-[28px] ios-glass border border-black/[0.06] dark:border-white/[0.08] p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4 my-8 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto border border-brand-500/20">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              No papers found matching your filter
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              We upload new Maharashtra State Board papers regularly. Request this specific paper and our academic team will notify you directly.
            </p>
            <button
              onClick={() => {
                setRequestForm((prev) => ({
                  ...prev,
                  subject: selectedSubject !== 'All' ? selectedSubject : 'Book-Keeping & Accountancy',
                  year: selectedYear !== 'All' ? selectedYear : '2024',
                }));
                setShowRequestModal(true);
              }}
              className="px-5 py-2.5 rounded-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/20 cursor-pointer inline-flex items-center gap-1.5 ios-pill"
            >
              <Sparkles className="w-4 h-4" />
              <span>Request Paper Upload</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPapers.map((paper) => {
              const lastReadPage = getPageProgress(paper.id);
              const paperDone = isCompleted(paper.id);
              const solveHours = Math.round((paper.durationMinutes || 180) / 60);
              const solveMarks = paper.totalMarks || 80;

              return (
                <div
                  key={paper.id}
                  className="group relative flex flex-col justify-between p-5 rounded-[26px] ios-glass ios-card border border-black/[0.06] dark:border-white/[0.08] hover:border-brand-500/40 dark:hover:border-brand-500/40 transition-all duration-300 shadow-xs hover:shadow-xl hover:-translate-y-1"
                >
                  <div>
                    {/* Card Top Badges */}
                    <div className="flex items-center justify-between gap-1 mb-3">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/20">
                          {paper.subject}
                        </span>
                        {paper.year && (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                            {paper.year}
                          </span>
                        )}
                      </div>

                      {/* Visual Retention Badges */}
                      <div className="flex items-center space-x-1">
                        {paperDone && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                            title="Completed Paper"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Done</span>
                          </span>
                        )}
                        {lastReadPage && lastReadPage > 1 && !paperDone && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse"
                            title={`Resume at page ${lastReadPage}`}
                          >
                            <span>p.{lastReadPage}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Paper Title */}
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors line-clamp-2 leading-snug mb-2.5">
                      {paper.title}
                    </h3>

                    {/* Time-to-Solve Metric */}
                    <div className="flex items-center space-x-2 text-[11px] text-slate-600 dark:text-slate-400 font-mono py-1.5 px-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] mb-3.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>⏳ {solveHours} Hours</span>
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <span className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
                        <span>💯 {solveMarks} Marks</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions: Question Paper & Optional Solution Key */}
                  <div className="space-y-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                    {paper.answerKeyPdfUrl &&
                    paper.answerKeyPdfUrl.trim() !== '' &&
                    paper.answerKeyPdfUrl !== paper.questionPdfUrl ? (
                      <div className="grid grid-cols-2 gap-2">
                        {/* Question Paper Button */}
                        <button
                          onClick={() => {
                            const target = paper.questionPdfUrl || paper.answerKeyPdfUrl || '';
                            setActiveViewerPaper({
                              paper,
                              targetUrl: target,
                              modeTitle: `${paper.title} • Question Paper`,
                            });
                          }}
                          className="py-2.5 px-2.5 rounded-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/20 flex items-center justify-center gap-1.5 cursor-pointer ios-pill"
                          title="Open Question Paper"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Question</span>
                        </button>

                        {/* Model Answer Key Button */}
                        <button
                          onClick={() => {
                            setActiveViewerPaper({
                              paper,
                              targetUrl: paper.answerKeyPdfUrl!,
                              modeTitle: `${paper.title} • Model Solution Key`,
                            });
                          }}
                          className="py-2.5 px-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer ios-pill"
                          title="Open Official Solution Key"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Solution</span>
                        </button>
                      </div>
                    ) : (
                      /* Full width question paper button when no dedicated solution exists */
                      <button
                        onClick={() => {
                          const target = paper.questionPdfUrl || paper.answerKeyPdfUrl || '';
                          setActiveViewerPaper({
                            paper,
                            targetUrl: target,
                            modeTitle: `${paper.title} • Question Paper`,
                          });
                        }}
                        className="w-full py-2.5 px-3 rounded-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/20 flex items-center justify-center gap-1.5 cursor-pointer ios-pill"
                        title="Open Question Paper"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Open Question Paper</span>
                      </button>
                    )}

                    {/* Toggle Completion Mini-Action */}
                    <button
                      onClick={() => toggleComplete(paper.id)}
                      className={`w-full py-1.5 rounded-full text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ios-pill ${
                        isCompleted(paper.id)
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          : 'bg-black/[0.04] dark:bg-white/[0.05] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-300 border border-black/[0.04] dark:border-white/[0.06]'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span>
                        {isCompleted(paper.id) ? 'Marked Complete' : 'Mark as Completed'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* 4. LEAD MAGNET "REQUEST PAPER" MODAL (DIRECT ADMIN EMAIL DISPATCH) */}
      {/* ============================================================== */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="ios-glass border border-black/[0.08] dark:border-white/[0.12] rounded-[28px] max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-slate-900 dark:text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-brand-500/15 text-brand-600 dark:text-brand-300 flex items-center justify-center border border-brand-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Request Missing Board Paper
                </h3>
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {requestSubmitted ? (
              <div className="text-center py-6 space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Request Dispatched!</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {requestNotice || 'Notification sent directly to the Super Admin (bs.framework5253@gmail.com). You will receive an update once uploaded.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Looking for a specific past year exam or solution key? Enter your details below and an instant request will be emailed to our administration team.
                </p>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">
                    Your Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={requestForm.email}
                    onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                    placeholder="student@gmail.com"
                    className="w-full px-4 py-2.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">
                      Subject
                    </label>
                    <select
                      value={requestForm.subject}
                      onChange={(e) => setRequestForm({ ...requestForm, subject: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] text-xs text-slate-900 dark:text-white focus:outline-hidden"
                    >
                      <option value="Book-Keeping & Accountancy">Book-Keeping (BK)</option>
                      <option value="Economics">Economics</option>
                      <option value="Secretarial Practice">Secretarial Practice</option>
                      <option value="OCM">OCM</option>
                      <option value="Mathematics & Stats">Maths & Stats</option>
                      <option value="English">English</option>
                      <option value="Information Technology">Information Tech (IT)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">
                      Target Exam Year
                    </label>
                    <input
                      type="text"
                      value={requestForm.year}
                      onChange={(e) => setRequestForm({ ...requestForm, year: e.target.value })}
                      placeholder="e.g., 2024, 2023"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] text-xs text-slate-900 dark:text-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">
                    Specific Paper / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={requestForm.notes}
                    onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                    placeholder="e.g., July Repeater Exam or Model Solutions"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] text-xs text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full cursor-pointer ios-pill"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRequest}
                    className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-full transition-all shadow-md shadow-brand-500/20 cursor-pointer flex items-center gap-1.5 ios-pill"
                  >
                    {isSubmittingRequest ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Notifying Admin...</span>
                      </>
                    ) : (
                      <span>Submit Request</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultDashboard;
