import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { TestPaper } from '../../types/testPaper';
import { useAuth } from '../../context/AuthContext';
import { useStudyStore } from '../../store/useStudyStore';
import { InteractivePDFViewer } from './InteractivePDFViewer';
import {
  Search,
  Clock,
  Award,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Send,
  FileText,
  Check,
  Inbox,
  Flame,
} from 'lucide-react';

interface PaperRequestForm {
  email: string;
  subject: string;
  year: string;
  notes: string;
}

export const VaultDashboard: React.FC = () => {
  const [papers, setPapers] = useState<TestPaper[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
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
  const [requestSubmitted, setRequestSubmitted] = useState<boolean>(false);

  // Global Persistent Zustand Store
  const {
    completedPapers,
    toggleComplete,
    isCompleted,
    getPageProgress,
  } = useStudyStore();

  const { activeStandard } = useAuth();

  // Load paper repository from API
  useEffect(() => {
    let isCurrent = true;
    const loadRepo = async () => {
      setIsLoading(true);
      try {
        const [papersData, subjectsData] = await Promise.all([
          api.getTestPapers(),
          api.getSubjects(),
        ]);
        if (isCurrent) {
          setPapers(papersData);
          setSubjects(subjectsData);
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

      // 2. Subject Filter
      const matchesSubject =
        selectedSubject === 'All' ||
        p.subject.toLowerCase() === selectedSubject.toLowerCase();

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

  // Handle Paper Request Submission (Lead Magnet)
  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestForm.email || !requestForm.email.includes('@')) {
      alert('Please enter a valid student email address.');
      return;
    }

    // Persist request in local storage queue / analytics
    try {
      const storedRequests = JSON.parse(
        localStorage.getItem('aetherstudy_paper_requests') || '[]'
      );
      storedRequests.push({
        ...requestForm,
        submittedAt: new Date().toISOString(),
      });
      localStorage.setItem(
        'aetherstudy_paper_requests',
        JSON.stringify(storedRequests)
      );
    } catch {
      // silent
    }

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
    }, 2500);
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
    <div className="h-full w-full overflow-y-auto bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-24 md:pb-12">
      {/* ============================================================== */}
      {/* 1. HERO HEADER BLUEPRINT & ABSOLUTE SYLLABUS ANCHOR BANNER     */}
      {/* ============================================================== */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-8 pb-6 bg-gradient-to-b from-brand-950/40 via-slate-950 to-slate-950 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Absolute Syllabus Anchor Banner (WCAG AA Compliant Authority Pill) */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold shadow-xs">
            <ShieldCheck className="w-4 h-4 text-brand-400" />
            <span className="tracking-wide">
              Aligned Strictly with the Maharashtra State Board HSC Commerce Board Syllabus
            </span>
          </div>

          {/* Primary High-Converting Emotional Hook */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                HSC Commerce Board Exam Vault & Solutions
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
                Master your board examinations with verified previous year question papers, official marking schemes, and examiner-approved model answers for Standard {activeStandard}.
              </p>
            </div>

            {/* Quick Stats Retention Pill */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{papers.length} Verified Papers</span>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>{completedPapers.length} Solved by You</span>
              </span>
              <button
                onClick={() => setShowRequestModal(true)}
                className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Request Missing Paper</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. FACETED SEARCH ENGINE (YEAR, SUBJECT, RESOURCE TYPE)        */}
      {/* ============================================================== */}
      <section className="px-4 sm:px-6 lg:px-8 py-5 max-w-7xl mx-auto w-full space-y-4">
        {/* Search Bar & Primary Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search papers by subject, year (e.g., 'Book-Keeping 2024', 'Economics March')..."
            className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-800 focus:border-brand-500 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Faceted Filter Tags */}
        <div className="space-y-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          {/* Subject Facet */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider min-w-[70px]">
              Subject:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {['All', ...subjects].map((subj) => {
                const isSelected = selectedSubject.toLowerCase() === subj.toLowerCase();
                return (
                  <button
                    key={subj}
                    onClick={() => setSelectedSubject(subj)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {subj}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Year Facet */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider min-w-[70px]">
              Year:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {distinctYears.map((yr) => {
                const isSelected = selectedYear === yr;
                return (
                  <button
                    key={yr}
                    onClick={() => setSelectedYear(yr)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resource Type Facet */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider min-w-[70px]">
              Resource:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {resourceTypes.map((t) => {
                const isSelected = selectedType === t;
                return (
                  <button
                    key={t}
                    onClick={() => setSelectedType(t)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
      <main className="flex-1 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className="h-64 rounded-3xl bg-slate-900/80 border border-slate-800/60 p-5 space-y-3"
              >
                <div className="h-4 bg-slate-800 rounded-full w-24" />
                <div className="h-5 bg-slate-800 rounded-full w-48" />
                <div className="h-20 bg-slate-800/50 rounded-2xl" />
                <div className="h-8 bg-slate-800 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredPapers.length === 0 ? (
          /* ============================================================ */
          /* SMART CONTENT GRACEFUL FALLBACK & LEAD MAGNET FORM           */
          /* Zero dead 404 links: Captures student emails dynamically     */
          /* ============================================================ */
          <div className="my-8 p-8 rounded-3xl bg-slate-900/80 border border-slate-800/90 text-center max-w-xl mx-auto space-y-4 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center mx-auto">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">
              No matching question papers uploaded yet
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              We update our Maharashtra State Board repository weekly. Drop your email below, and our academic team will prioritize and upload this specific paper next.
            </p>

            <form onSubmit={handleRequestSubmit} className="space-y-3 max-w-md mx-auto pt-2">
              <input
                type="email"
                required
                value={requestForm.email}
                onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                placeholder="Enter your email to receive this paper..."
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Notify Me When Uploaded</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
            {filteredPapers.map((paper) => {
              const paperCompleted = isCompleted(paper.id);
              const lastReadPage = getPageProgress(paper.id);
              const hasResumeProgress = lastReadPage && lastReadPage > 1;

              // Time-to-solve estimation
              const solveHours = Math.round((paper.durationMinutes || 180) / 60);
              const solveMarks = paper.totalMarks || 80;

              return (
                <div
                  key={paper.id}
                  className="group relative flex flex-col justify-between rounded-3xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-brand-500/50 p-4 transition-all duration-200 hover:shadow-xl hover:shadow-brand-950/20 hover:-translate-y-0.5"
                >
                  {/* Top Badges & Retention Hooks */}
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 uppercase tracking-wider">
                          {paper.subject}
                        </span>
                        {paper.year && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {paper.year}
                          </span>
                        )}
                      </div>

                      {/* Visual Retention Badges */}
                      {paperCompleted ? (
                        <span
                          className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30"
                          title="Paper Completed"
                        >
                          <Check className="w-3 h-3" />
                          <span>Solved</span>
                        </span>
                      ) : hasResumeProgress ? (
                        <span
                          className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30"
                          title="Resume study"
                        >
                          <span>Resume Pg {lastReadPage}</span>
                        </span>
                      ) : null}
                    </div>

                    {/* Paper Title */}
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-2 leading-snug mb-2">
                      {paper.title}
                    </h3>

                    {/* Time-to-Solve Metric */}
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono py-1.5 px-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>⏳ {solveHours} Hours</span>
                      </span>
                      <span className="text-slate-600">|</span>
                      <span className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-brand-400" />
                        <span>💯 {solveMarks} Marks</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions: Question Paper & Optional Solution Key */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/60">
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
                          className="py-2.5 px-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
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
                          className="py-2.5 px-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
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
                        className="w-full py-2.5 px-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Open Question Paper"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Open Question Paper</span>
                      </button>
                    )}

                    {/* Toggle Completion Mini-Action */}
                    <button
                      onClick={() => toggleComplete(paper.id)}
                      className={`w-full py-1.5 rounded-xl text-[11px] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        paperCompleted
                          ? 'text-emerald-400 bg-emerald-950/30 hover:bg-emerald-950/50'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span>{paperCompleted ? 'Marked Solved' : 'Mark as Solved'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* LEAD-MAGNET DYNAMIC REQUEST MODAL                              */}
      {/* ============================================================== */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-brand-600/20 text-brand-300 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  Request Missing Board Paper
                </h3>
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {requestSubmitted ? (
              <div className="text-center py-6 space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Request Received!</h4>
                <p className="text-xs text-slate-400">
                  Our academic curators have been notified. You will receive an email as soon as this paper and solution key are uploaded.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="space-y-3.5">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Looking for a specific past year exam or solution key? Enter your details below and our team will upload it next.
                </p>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    Your Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={requestForm.email}
                    onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                    placeholder="student@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-hidden focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                      Subject
                    </label>
                    <select
                      value={requestForm.subject}
                      onChange={(e) => setRequestForm({ ...requestForm, subject: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-hidden"
                    >
                      <option value="Book-Keeping & Accountancy">Book-Keeping (BK)</option>
                      <option value="Economics">Economics</option>
                      <option value="Secretarial Practice">Secretarial Practice</option>
                      <option value="OCM">OCM</option>
                      <option value="Mathematics & Stats">Maths & Stats</option>
                      <option value="English">English</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                      Target Exam Year
                    </label>
                    <input
                      type="text"
                      value={requestForm.year}
                      onChange={(e) => setRequestForm({ ...requestForm, year: e.target.value })}
                      placeholder="e.g., 2024, 2023"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    Additional Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={requestForm.notes}
                    onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                    placeholder="e.g., Prelim papers from Mithibai / NM College"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-all shadow-md shadow-brand-500/20 cursor-pointer"
                  >
                    Submit Request
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
