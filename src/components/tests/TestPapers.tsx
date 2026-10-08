import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { TestPaper } from '../../types/testPaper';
import { useAuth } from '../../context/AuthContext';
import { BulkUploaderModal } from '../common/BulkUploaderModal';
import { UniversalPdfViewer } from '../common/UniversalPdfViewer';
import { ListSkeleton } from '../common/LoadingSkeleton';
import { matchSubjectDoc, toRomanStandard } from '../workspace/SubjectRooms';
import {
  GraduationCap,
  FileText,
  CheckCircle,
  Plus,
  Trash2,
  Columns,
  Download,
  FolderUp,
  Calendar,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Layers,
  Sparkles,
} from 'lucide-react';

export const TestPapers: React.FC = () => {
  const [testPapers, setTestPapers] = useState<TestPaper[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 3-Step Guided Funnel State:
  // Step 1: 'year' -> Step 2: 'subject' -> Step 3: 'paper'
  const [funnelStep, setFunnelStep] = useState<'year' | 'subject' | 'paper'>('year');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [activePaper, setActivePaper] = useState<TestPaper | null>(null);

  // View style toggle: 'funnel' (Step-by-Step 1-2-3) vs 'list' (Classic shelf view)
  const [displayMode, setDisplayMode] = useState<'funnel' | 'list'>('funnel');

  // Classic list filters (when in list mode)
  const [listFilterSubject, setListFilterSubject] = useState<string>('All');
  const [listFilterYear, setListFilterYear] = useState<string>('All');

  // Solving / Review Mode: 'question' | 'answer' | 'split'
  const [solveViewMode, setSolveViewMode] = useState<'question' | 'answer' | 'split'>('question');

  // Modal states
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);

  // Upload modal inputs
  const [title, setTitle] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [examType, setExamType] = useState<'PYQ' | 'Midterm' | 'Final Exam' | 'Mock Test'>('PYQ');
  const [durationMinutes, setDurationMinutes] = useState<number>(180);
  const [totalMarks, setTotalMarks] = useState<number>(80);
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isCreatingSubject, setIsCreatingSubject] = useState<boolean>(false);
  const [newSubjectInput, setNewSubjectInput] = useState<string>('');

  const { currentUser, canUpload } = useAuth();
  const qFileInputRef = useRef<HTMLInputElement>(null);
  const akFileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [papers, subjs] = await Promise.all([api.getTestPapers(), api.getSubjects()]);
      setTestPapers(papers);
      setSubjects(subjs);
      if (subjs.length > 0 && !subject) setSubject(subjs[0]);
    } catch (err) {
      console.warn('Could not load test papers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute available distinct years sorted descending
  const availableYears = React.useMemo(() => {
    const rawYears = testPapers.map((p) => p.year).filter((y) => Boolean(y) && !isNaN(y));
    const unique = Array.from(new Set(rawYears)).sort((a, b) => b - a);
    if (unique.length > 0) return unique;
    // Fallback baseline years if no papers uploaded yet
    const curr = new Date().getFullYear();
    return [curr, curr - 1, curr - 2, curr - 3, curr - 4, curr - 5];
  }, [testPapers]);

  // Papers belonging to the currently selected year in funnel
  const papersForSelectedYear = React.useMemo(() => {
    if (selectedYear === null) return [];
    return testPapers.filter((p) => p.year === selectedYear);
  }, [testPapers, selectedYear]);

  // Unique subjects available for selected year
  const subjectsForSelectedYear = React.useMemo(() => {
    if (selectedYear === null) return [];
    const paperSubjects = Array.from(new Set(papersForSelectedYear.map((p) => p.subject || 'General')));
    if (paperSubjects.length > 0) return paperSubjects;
    return subjects;
  }, [papersForSelectedYear, subjects, selectedYear]);

  // All papers matching the selected year and selected subject
  const candidatePapersForSelection = React.useMemo(() => {
    if (selectedYear === null || !selectedSubject) return [];
    return papersForSelectedYear.filter((p) => matchSubjectDoc(selectedSubject, p.subject || ''));
  }, [papersForSelectedYear, selectedYear, selectedSubject]);

  // Step 1 Click Handler: Select year -> Move to Subject selection
  const handleSelectYear = (yr: number) => {
    setSelectedYear(yr);
    setSelectedSubject(null);
    setActivePaper(null);
    setFunnelStep('subject');
  };

  // Step 2 Click Handler: Select subject -> Find paper -> Move to Paper solving
  const handleSelectSubject = (subjName: string) => {
    setSelectedSubject(subjName);
    const matching = papersForSelectedYear.filter((p) => matchSubjectDoc(subjName, p.subject || ''));
    if (matching.length > 0) {
      setActivePaper(matching[0]);
    } else {
      setActivePaper(null);
    }
    setFunnelStep('paper');
  };

  // Switch session if multiple papers exist for this year+subject
  const handleSelectActivePaper = (paper: TestPaper) => {
    setActivePaper(paper);
    if (paper.year) setSelectedYear(paper.year);
    if (paper.subject) setSelectedSubject(paper.subject);
    setFunnelStep('paper');
  };

  const handleCreateNewSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectInput.trim()) return;

    try {
      const res = await api.createSubject(newSubjectInput.trim());
      setSubjects(res.subjects);
      setSubject(res.created);
      setNewSubjectInput('');
      setIsCreatingSubject(false);
    } catch (err) {
      console.error('Failed to create subject:', err);
    }
  };

  const handleUploadTestPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionFile || !answerKeyFile) {
      alert('Please select both the Question Paper PDF and Answer Key PDF.');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('title', title.trim() || 'Board Exam PYQ Paper');
      formData.append('subject', subject || (subjects.length > 0 ? subjects[0] : 'General'));
      formData.append('year', year.toString());
      formData.append('examType', examType);
      formData.append('durationMinutes', durationMinutes.toString());
      formData.append('totalMarks', totalMarks.toString());
      formData.append('uploadedBy', currentUser?.email || '');
      formData.append('questionFile', questionFile);
      formData.append('answerKeyFile', answerKeyFile);

      const created = await api.uploadTestPaper(formData);
      setTestPapers((prev) => [created, ...prev]);
      setActivePaper(created);
      setSelectedYear(created.year);
      setSelectedSubject(created.subject);
      setFunnelStep('paper');
      setShowUploadModal(false);
      setTitle('');
      setQuestionFile(null);
      setAnswerKeyFile(null);
    } catch (err) {
      alert((err as Error).message || 'Failed to upload test paper.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePaper = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this test paper and answer key?')) return;

    try {
      await api.deleteTestPaper(id, currentUser?.email || '');
      setTestPapers((prev) => prev.filter((p) => p.id !== id));
      if (activePaper?.id === id) {
        const remaining = testPapers.filter((p) => p.id !== id);
        setActivePaper(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      alert((err as Error).message || 'Failed to delete test paper.');
    }
  };

  // Subject Roman badge helper
  const getSubjectRomanCode = (subName: string): string => {
    const s = subName.toLowerCase();
    const stdRoman = toRomanStandard(currentUser?.standard || '12');
    if (s.includes('account') || s.includes('bk')) return `BK-${stdRoman}`;
    if (s.includes('eco')) return `ECO-${stdRoman}`;
    if (s.includes('ocm') || s.includes('org')) return `OCM-${stdRoman}`;
    if (s.includes('math')) return `MATH-${stdRoman}`;
    if (s.includes('secretarial') || s.includes('sp')) return `SP-${stdRoman}`;
    if (s.includes('eng')) return `ENG-${stdRoman}`;
    if (s.includes('hin')) return `HIN-${stdRoman}`;
    if (s.includes('mar')) return `MAR-${stdRoman}`;
    if (s.includes('it') || s.includes('info')) return `IT-${stdRoman}`;
    return `${subName.substring(0, 3).toUpperCase()}-${stdRoman}`;
  };

  // Filtered papers for classic list view
  const filteredPapersForList = testPapers.filter((p) => {
    const matchSubject = listFilterSubject === 'All' || matchSubjectDoc(listFilterSubject, p.subject || '');
    const matchYear = listFilterYear === 'All' || p.year.toString() === listFilterYear;
    return matchSubject && matchYear;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden relative bg-slate-50 dark:bg-slate-950">
      {/* Top Main Navigation Bar */}
      <header className="flex flex-wrap items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 gap-3 z-20 shrink-0 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-none">
                Previous Year Papers (PYQ Vault)
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                Class {toRomanStandard(currentUser?.standard || '12')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select year, subject & solve with step-by-step verified board solutions
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Mode Switcher: Step Funnel vs Classic Shelf */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setDisplayMode('funnel')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                displayMode === 'funnel'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Step-by-Step Funnel</span>
            </button>
            <button
              onClick={() => setDisplayMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                displayMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Papers List</span>
            </button>
          </div>

          {/* Admin Upload Actions */}
          {canUpload && (
            <>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-brand-600 hover:bg-brand-500 text-white shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload Single</span>
              </button>
              <button
                onClick={() => setShowBulkModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-purple-600 hover:bg-purple-500 text-white shadow-sm"
                title="Bulk upload full folders of PYQ papers"
              >
                <FolderUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bulk Folder</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* =======================================================================
          VIEW MODE 1: 3-STEP GUIDED FUNNEL (YEAR -> SUBJECT -> QUESTION PAPER)
      ======================================================================= */}
      {displayMode === 'funnel' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Funnel Breadcrumbs / Progress Stepper */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs shrink-0 overflow-x-auto">
            <div className="flex items-center space-x-2 shrink-0">
              {/* Step 1 Pill */}
              <button
                onClick={() => setFunnelStep('year')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold transition-all ${
                  funnelStep === 'year'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-500 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>1. Select Year</span>
                {selectedYear && <span className="opacity-80">({selectedYear})</span>}
              </button>

              <span className="text-slate-400 font-bold">→</span>

              {/* Step 2 Pill */}
              <button
                onClick={() => {
                  if (selectedYear) setFunnelStep('subject');
                }}
                disabled={!selectedYear}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold transition-all ${
                  funnelStep === 'subject'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : selectedYear
                    ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-500 border border-slate-200 dark:border-slate-700'
                    : 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 cursor-not-allowed border border-dashed border-slate-300 dark:border-slate-700'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>2. Select Subject</span>
                {selectedSubject && <span className="opacity-80">({selectedSubject})</span>}
              </button>

              <span className="text-slate-400 font-bold">→</span>

              {/* Step 3 Pill */}
              <button
                onClick={() => {
                  if (activePaper) setFunnelStep('paper');
                }}
                disabled={!activePaper}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold transition-all ${
                  funnelStep === 'paper'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : activePaper
                    ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-500 border border-slate-200 dark:border-slate-700'
                    : 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 cursor-not-allowed border border-dashed border-slate-300 dark:border-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>3. Question Paper & Solutions</span>
              </button>
            </div>

            {/* Quick Back Button when in Step 2 or 3 */}
            {funnelStep === 'subject' && (
              <button
                onClick={() => setFunnelStep('year')}
                className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 font-bold transition-colors ml-4 shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Year</span>
              </button>
            )}

            {funnelStep === 'paper' && (
              <div className="flex items-center space-x-3 ml-4 shrink-0">
                <button
                  onClick={() => setFunnelStep('subject')}
                  className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 font-bold transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Subject</span>
                </button>
                <button
                  onClick={() => setFunnelStep('year')}
                  className="text-slate-500 dark:text-slate-400 hover:underline"
                >
                  Change Year ({selectedYear})
                </button>
              </div>
            )}
          </div>

          {/* STEP 1: CHOOSE YEAR */}
          {funnelStep === 'year' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-6xl mx-auto w-full">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-bold mb-3">
                  <Calendar className="w-4 h-4" />
                  <span>Step 1 of 3: Examination Year</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Which Year Do You Want to Solve?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xl mx-auto">
                  Pick an official Maharashtra Board examination year. You will get the authentic original question paper and step-by-step model answer key.
                </p>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <ListSkeleton count={6} />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {availableYears.map((yr) => {
                    const papersCount = testPapers.filter((p) => p.year === yr).length;
                    const yearSubjs = Array.from(
                      new Set(testPapers.filter((p) => p.year === yr).map((p) => p.subject || ''))
                    ).filter(Boolean);

                    return (
                      <div
                        key={yr}
                        onClick={() => handleSelectYear(yr)}
                        className="group relative p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                              {yr}
                            </span>
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                              {papersCount > 0 ? `${papersCount} Papers` : 'Ready to Solve'}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">
                            HSC Board Exam {yr}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                            Official Maharashtra State Board question papers with comprehensive step-by-step marking schemes.
                          </p>

                          {/* Subject Pill Tags */}
                          {yearSubjs.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {yearSubjs.slice(0, 4).map((sj) => (
                                <span
                                  key={sj}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                >
                                  {sj}
                                </span>
                              ))}
                              {yearSubjs.length > 4 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  +{yearSubjs.length - 4} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Select {yr} Papers <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            Class {toRomanStandard(currentUser?.standard || '12')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CHOOSE SUBJECT */}
          {funnelStep === 'subject' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-6xl mx-auto w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-bold mb-2">
                    <BookOpen className="w-4 h-4" />
                    <span>Step 2 of 3: Choose Subject ({selectedYear} Board Exam)</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Select Subject to Solve for Year {selectedYear}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Choose which subject question paper you want to practice.
                  </p>
                </div>

                <button
                  onClick={() => setFunnelStep('year')}
                  className="self-start sm:self-auto flex items-center space-x-1 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-brand-500 font-bold text-xs shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Year</span>
                </button>
              </div>

              {subjectsForSelectedYear.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <GraduationCap className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-slate-700 dark:text-slate-200">
                    No papers uploaded yet for Year {selectedYear}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                    Upload the question paper & answer key or choose another year.
                  </p>
                  <button
                    onClick={() => setFunnelStep('year')}
                    className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold"
                  >
                    Back to Years
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {subjectsForSelectedYear.map((subj) => {
                    const papersForThisSubj = papersForSelectedYear.filter((p) =>
                      matchSubjectDoc(subj, p.subject || '')
                    );
                    const romanCode = getSubjectRomanCode(subj);

                    return (
                      <div
                        key={subj}
                        onClick={() => handleSelectSubject(subj)}
                        className="group relative p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-black font-mono px-3 py-1 rounded-xl bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                              {romanCode}
                            </span>
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {papersForThisSubj.length > 0 ? `${papersForThisSubj.length} Available` : 'Available'}
                            </span>
                          </div>

                          <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors mb-2">
                            {subj}
                          </h4>

                          {/* Sessions available */}
                          {papersForThisSubj.length > 0 ? (
                            <div className="space-y-1.5 my-3">
                              {papersForThisSubj.map((p) => (
                                <div
                                  key={p.id}
                                  className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60"
                                >
                                  <span className="truncate font-semibold">{p.title}</span>
                                  <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                                    {p.totalMarks || 80} Marks
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 dark:text-slate-400 my-3">
                              Includes original question paper and step-by-step marking scheme.
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Open Question Paper <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {selectedYear} Board Exam
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: QUESTION PAPER & SOLUTIONS WORKBENCH */}
          {funnelStep === 'paper' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {activePaper ? (
                <>
                  {/* Top Bar for Paper: Sessions Switcher & View Mode Toggles */}
                  <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 gap-2 shrink-0">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400">
                            {activePaper.year}
                          </span>
                          <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                            {activePaper.subject} • {activePaper.title}
                          </h3>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{activePaper.totalMarks || 80} Marks</span>
                          <span>•</span>
                          <span>{activePaper.durationMinutes || 180} Minutes</span>
                          <span>•</span>
                          <span>Class {toRomanStandard(currentUser?.standard || '12')}</span>
                        </div>
                      </div>

                      {/* If multiple sessions exist for this year+subject (e.g. March & July) */}
                      {candidatePapersForSelection.length > 1 && (
                        <div className="hidden sm:flex items-center space-x-1.5 ml-3 pl-3 border-l border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Session:</span>
                          {candidatePapersForSelection.map((cp) => (
                            <button
                              key={cp.id}
                              onClick={() => handleSelectActivePaper(cp)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                activePaper.id === cp.id
                                  ? 'bg-brand-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {cp.title.toLowerCase().includes('july') ? 'July Repeater' : 'March Regular'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Mode Switcher: Question Paper | Split & Compare | Answer Key */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => setSolveViewMode('question')}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          solveViewMode === 'question'
                            ? 'bg-brand-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Question Paper</span>
                      </button>

                      <button
                        onClick={() => setSolveViewMode('split')}
                        className={`hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          solveViewMode === 'split'
                            ? 'bg-brand-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Compare Question Paper and Answer Key side-by-side"
                      >
                        <Columns className="w-3.5 h-3.5" />
                        <span>Split & Compare</span>
                      </button>

                      <button
                        onClick={() => setSolveViewMode('answer')}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          solveViewMode === 'answer'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Model Solutions</span>
                      </button>
                    </div>
                  </div>

                  {/* Document Rendering Stage - Direct In-Website Universal PDF Viewers */}
                  <div className="flex-1 flex overflow-hidden p-2 sm:p-4 gap-3">
                    {/* Questions Pane */}
                    {(solveViewMode === 'question' || solveViewMode === 'split') && (
                      <div
                        className={`h-full flex flex-col rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${
                          solveViewMode === 'split' ? 'w-1/2' : 'w-full'
                        }`}
                      >
                        <div className="px-3.5 py-2 bg-brand-50/80 dark:bg-brand-950/40 border-b border-brand-200 dark:border-brand-900/60 flex items-center justify-between text-xs font-bold text-brand-700 dark:text-brand-300">
                          <span className="flex items-center gap-1.5 truncate mr-2">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{activePaper.questionPdfName || 'Question Paper'}</span>
                          </span>
                          <div className="flex items-center space-x-2 shrink-0">
                            <a
                              href={activePaper.questionPdfUrl}
                              download={activePaper.questionPdfName}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded bg-brand-600 hover:bg-brand-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs"
                            >
                              <Download className="w-3 h-3" /> Download
                            </a>
                          </div>
                        </div>

                        {/* Direct PDF Canvas Engine */}
                        <div className="relative w-full flex-1 overflow-hidden bg-slate-100 dark:bg-slate-950">
                          <UniversalPdfViewer
                            url={activePaper.questionPdfUrl}
                            title={`${activePaper.title} - Question Paper`}
                            className="w-full h-full"
                          />
                        </div>
                      </div>
                    )}

                    {/* Answer Key / Solutions Pane */}
                    {(solveViewMode === 'answer' || solveViewMode === 'split') && (
                      <div
                        className={`h-full flex flex-col rounded-2xl overflow-hidden border border-emerald-300 dark:border-emerald-800/80 bg-white dark:bg-slate-900 shadow-sm ${
                          solveViewMode === 'split' ? 'w-1/2' : 'w-full'
                        }`}
                      >
                        <div className="px-3.5 py-2 bg-emerald-50/80 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          <span className="flex items-center gap-1.5 truncate mr-2">
                            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Solutions: {activePaper.answerKeyPdfName || 'Model Solutions'}</span>
                          </span>
                          <div className="flex items-center space-x-2 shrink-0">
                            <a
                              href={activePaper.answerKeyPdfUrl}
                              download={activePaper.answerKeyPdfName}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs"
                            >
                              <Download className="w-3 h-3" /> Download
                            </a>
                          </div>
                        </div>

                        {/* Direct PDF Canvas Engine */}
                        <div className="relative w-full flex-1 overflow-hidden bg-slate-100 dark:bg-slate-950">
                          <UniversalPdfViewer
                            url={activePaper.answerKeyPdfUrl}
                            title={`${activePaper.title} - Model Solutions`}
                            className="w-full h-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <GraduationCap className="w-16 h-16 mb-3 text-slate-500 stroke-1" />
                  <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
                    No Paper Selected
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mb-4">
                    Please choose a subject for year {selectedYear} to begin solving.
                  </p>
                  <button
                    onClick={() => setFunnelStep('subject')}
                    className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold"
                  >
                    Select Subject
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =======================================================================
          VIEW MODE 2: CLASSIC ALL PAPERS SHELF (LIST VIEW)
      ======================================================================= */}
      {displayMode === 'list' && (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* Left Test Papers Shelf */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto max-h-64 md:max-h-full shrink-0 p-3 space-y-2">
            {/* Shelf Filters */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select
                value={listFilterSubject}
                onChange={(e) => setListFilterSubject(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none"
              >
                <option value="All">All Subjects ({subjects.length})</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={listFilterYear}
                onChange={(e) => setListFilterYear(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none"
              >
                <option value="All">All Years</option>
                {availableYears.map((y) => (
                  <option key={y} value={y.toString()}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
              Available Exam Papers ({filteredPapersForList.length})
            </div>

            {isLoading ? (
              <ListSkeleton count={4} />
            ) : filteredPapersForList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No test papers found for this subject/year.
              </div>
            ) : (
              filteredPapersForList.map((paper) => {
                const isSelected = activePaper?.id === paper.id;

                return (
                  <div
                    key={paper.id}
                    onClick={() => {
                      setActivePaper(paper);
                      setSelectedYear(paper.year);
                      setSelectedSubject(paper.subject);
                    }}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-brand-500/10 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-brand-400'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="truncate mr-2">
                        <div className="flex items-center space-x-1.5 mb-1">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-600 dark:text-brand-300">
                            {paper.year}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {paper.examType}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {paper.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {paper.subject} • {paper.durationMinutes}m • {paper.totalMarks} Marks
                        </p>
                      </div>

                      {canUpload && (
                        <button
                          onClick={(e) => handleDeletePaper(paper.id, e)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Delete Paper"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Active Solver */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
            {activePaper ? (
              <>
                <div className="flex flex-wrap items-center justify-between p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 gap-2 shrink-0">
                  <div className="truncate">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                      {activePaper.title} ({activePaper.year})
                    </h3>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>{activePaper.subject}</span>
                      <span>• {activePaper.totalMarks} Marks</span>
                      <span>• {activePaper.durationMinutes} Minutes</span>
                    </div>
                  </div>

                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                    <button
                      onClick={() => setSolveViewMode('question')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        solveViewMode === 'question'
                          ? 'bg-brand-600 text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Question Paper
                    </button>
                    <button
                      onClick={() => setSolveViewMode('split')}
                      className={`hidden sm:inline px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        solveViewMode === 'split'
                          ? 'bg-brand-600 text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Split & Compare
                    </button>
                    <button
                      onClick={() => setSolveViewMode('answer')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        solveViewMode === 'answer'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Solutions
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex overflow-hidden p-2 sm:p-4 gap-3">
                  {(solveViewMode === 'question' || solveViewMode === 'split') && (
                    <div className={`h-full flex flex-col rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white ${solveViewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
                      <div className="px-3 py-1.5 bg-brand-50 dark:bg-brand-950/40 border-b border-brand-200 dark:border-brand-900 text-xs font-bold text-brand-700 dark:text-brand-300">
                        {activePaper.questionPdfName}
                      </div>
                      <UniversalPdfViewer
                        url={activePaper.questionPdfUrl}
                        title={activePaper.questionPdfName}
                        className="w-full flex-1"
                      />
                    </div>
                  )}

                  {(solveViewMode === 'answer' || solveViewMode === 'split') && (
                    <div className={`h-full flex flex-col rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-800 bg-white ${solveViewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
                      <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        {activePaper.answerKeyPdfName}
                      </div>
                      <UniversalPdfViewer
                        url={activePaper.answerKeyPdfUrl}
                        title={activePaper.answerKeyPdfName}
                        className="w-full flex-1"
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <GraduationCap className="w-16 h-16 mb-3 text-slate-500 stroke-1" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
                  Select a paper from the list
                </h3>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload PYQ Exam Modal (Admin Only) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-brand-500" />
                Upload PYQ Exam & Answer Key
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadTestPaper} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Exam Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. March 2024 Board Examination"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none"
                  required
                />
              </div>

              {/* Subject Selection & Creation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Subject
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCreatingSubject(!isCreatingSubject)}
                    className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {isCreatingSubject ? 'Select Existing' : 'Create New Subject'}
                  </button>
                </div>

                {!isCreatingSubject ? (
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none"
                    required
                  >
                    {subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="New subject title..."
                      value={newSubjectInput}
                      onChange={(e) => setNewSubjectInput(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCreateNewSubject}
                      className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              {/* Year & Exam Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Exam Year
                  </label>
                  <input
                    type="number"
                    min="1990"
                    max="2035"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Exam Category
                  </label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none"
                  >
                    <option value="PYQ">PYQ (Previous Year Questions)</option>
                    <option value="Final Exam">Final Exam</option>
                    <option value="Midterm">Midterm Examination</option>
                    <option value="Mock Test">Mock Test</option>
                  </select>
                </div>
              </div>

              {/* Duration & Marks */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="360"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* Question Paper PDF upload */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  1. Question Paper PDF
                </label>
                <div
                  onClick={() => qFileInputRef.current?.click()}
                  className="p-3.5 border-2 border-dashed border-brand-500/40 rounded-2xl bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:border-brand-500 text-center transition-colors"
                >
                  <input
                    type="file"
                    ref={qFileInputRef}
                    className="hidden"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setQuestionFile(e.target.files[0]);
                      }
                    }}
                  />
                  {questionFile ? (
                    <div className="text-xs font-bold text-brand-600 dark:text-brand-300 truncate">
                      ✓ {questionFile.name}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">Tap to select Question Paper (PDF)</div>
                  )}
                </div>
              </div>

              {/* Answer Key PDF upload */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  2. Official Answer Key / Solutions Paper
                </label>
                <div
                  onClick={() => akFileInputRef.current?.click()}
                  className="p-3.5 border-2 border-dashed border-emerald-500/40 rounded-2xl bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:border-emerald-500 text-center transition-colors"
                >
                  <input
                    type="file"
                    ref={akFileInputRef}
                    className="hidden"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAnswerKeyFile(e.target.files[0]);
                      }
                    }}
                  />
                  {answerKeyFile ? (
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
                      ✓ {answerKeyFile.name}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">Tap to select Answer Key (PDF)</div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!questionFile || !answerKeyFile || isUploading}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/30"
                >
                  {isUploading ? 'Uploading Exam...' : 'Confirm Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Intelligent Bulk Uploader Modal */}
      {showBulkModal && (
        <BulkUploaderModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          defaultCategory="pyq"
          onUploadSuccess={loadData}
        />
      )}
    </div>
  );
};
