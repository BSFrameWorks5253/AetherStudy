import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { TestPaper } from '../../types/testPaper';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  FileText,
  CheckCircle,
  Plus,
  Trash2,
  Columns,
  ExternalLink,
  Lock,
  Download,
} from 'lucide-react';

export const TestPapers: React.FC = () => {
  const [testPapers, setTestPapers] = useState<TestPaper[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [activePaper, setActivePaper] = useState<TestPaper | null>(null);

  // Solving/Review Mode: 'question' | 'answer' | 'split'
  const [solveViewMode, setSolveViewMode] = useState<'question' | 'answer' | 'split'>('question');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [examType, setExamType] = useState<'PYQ' | 'Midterm' | 'Final Exam' | 'Mock Test'>('PYQ');
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // New Subject creation inside test upload
  const [isCreatingSubject, setIsCreatingSubject] = useState<boolean>(false);
  const [newSubjectInput, setNewSubjectInput] = useState<string>('');

  const { currentUser, canUpload } = useAuth();
  const qFileInputRef = useRef<HTMLInputElement>(null);
  const akFileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      const [papers, subjs] = await Promise.all([api.getTestPapers(), api.getSubjects()]);
      setTestPapers(papers);
      setSubjects(subjs);
      if (subjs.length > 0 && !subject) setSubject(subjs[0]);
      if (papers.length > 0 && !activePaper) setActivePaper(papers[0]);
    } catch (err) {
      console.warn('Could not load test papers:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      formData.append('title', title.trim() || 'PYQ Test Paper');
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

  // Filter test papers
  const availableYears = Array.from(new Set(testPapers.map((p) => p.year))).sort((a, b) => b - a);

  const filteredPapers = testPapers.filter((p) => {
    const matchSubject = selectedSubject === 'All' || p.subject === selectedSubject;
    const matchYear = selectedYear === 'All' || p.year.toString() === selectedYear;
    return matchSubject && matchYear;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Top Header & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 gap-3 z-20 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none">
              Previous Year Papers (PYQ Vault)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Official Board Question Papers with Step-by-Step Model Solutions
            </p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center space-x-2.5">
          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="All">All Subjects ({subjects.length})</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="All">All Years</option>
            {availableYears.map((y) => (
              <option key={y} value={y.toString()}>
                Year {y}
              </option>
            ))}
          </select>

          {/* Upload Button (Admin/Super Admin only) */}
          <button
            onClick={() => {
              if (!canUpload) {
                alert('Uploading test papers is restricted to authorized Admins.');
                return;
              }
              setShowUploadModal(true);
            }}
            className={`flex items-center space-x-1 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              canUpload
                ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-500/25 glass-pill'
                : 'liquid-glass-subtle text-slate-400 cursor-not-allowed'
            }`}
          >
            {canUpload ? <Plus className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>Upload PYQ Test</span>
          </button>
        </div>
      </div>

      {/* Main Workbench Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Test Papers Shelf (Collapsible on mobile) */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/40 dark:border-white/10 liquid-glass-subtle flex flex-col overflow-y-auto max-h-56 md:max-h-full shrink-0 p-3 space-y-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
            Available Exam Papers ({filteredPapers.length})
          </div>

          {filteredPapers.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No test papers found for this subject/year.
            </div>
          ) : (
            filteredPapers.map((paper) => {
              const isSelected = activePaper?.id === paper.id;

              return (
                <div
                  key={paper.id}
                  onClick={() => setActivePaper(paper)}
                  className={`p-3 rounded-2xl liquid-glass border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-brand-500 bg-brand-500/10 shadow-md'
                      : 'border-white/50 dark:border-white/5 hover:border-brand-400/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="truncate mr-2">
                      <div className="flex items-center space-x-1.5 mb-1">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-600 dark:text-brand-300">
                          {paper.year}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-slate-600 dark:text-slate-300">
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

        {/* Right Active Test Paper Solver & Compare Stage */}
        <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
          {activePaper ? (
            <>
              {/* Paper Top Action Bar with Mode Switcher */}
              <div className="flex flex-wrap items-center justify-between p-3 liquid-glass border-b border-white/40 dark:border-white/10 gap-2 shrink-0">
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

                {/* Solving / Comparing Mode Switcher */}
                <div className="flex items-center liquid-glass-subtle p-1 rounded-2xl">
                  <button
                    onClick={() => setSolveViewMode('question')}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      solveViewMode === 'question'
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Question Paper</span>
                  </button>

                  <button
                    onClick={() => setSolveViewMode('split')}
                    className={`hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      solveViewMode === 'split'
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
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
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Answer Key / Solutions</span>
                  </button>
                </div>
              </div>

              {/* Document Rendering Stage */}
              <div className="flex-1 flex overflow-hidden p-2 sm:p-4 gap-3">
                {/* Questions Pane */}
                {(solveViewMode === 'question' || solveViewMode === 'split') && (
                  <div
                    className={`h-full flex flex-col liquid-glass rounded-2xl overflow-hidden border border-white/50 dark:border-white/10 ${
                      solveViewMode === 'split' ? 'w-1/2' : 'w-full'
                    }`}
                  >
                    <div className="px-3 py-1.5 bg-brand-500/10 border-b border-brand-500/20 flex items-center justify-between text-xs font-bold text-brand-600 dark:text-brand-300">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        {activePaper.questionPdfName}
                      </span>
                      <div className="flex items-center space-x-2">
                        <a
                          href={activePaper.questionPdfUrl}
                          download={activePaper.questionPdfName}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1 text-[11px] text-brand-600 dark:text-brand-300"
                        >
                          <Download className="w-3 h-3" /> Download
                        </a>
                        <a
                          href={activePaper.questionPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1 text-[11px] text-slate-500"
                        >
                          Popout <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <iframe
                      src={activePaper.questionPdfUrl}
                      title="Question Paper"
                      className="w-full flex-1 bg-white"
                    />
                  </div>
                )}

                {/* Answer Key Pane */}
                {(solveViewMode === 'answer' || solveViewMode === 'split') && (
                  <div
                    className={`h-full flex flex-col liquid-glass rounded-2xl overflow-hidden border border-emerald-500/30 ${
                      solveViewMode === 'split' ? 'w-1/2' : 'w-full'
                    }`}
                  >
                    <div className="px-3 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="flex items-center gap-1.5 truncate mr-2">
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Solutions: {activePaper.answerKeyPdfName}</span>
                      </span>
                      <div className="flex items-center space-x-2 shrink-0">
                        <a
                          href={activePaper.answerKeyPdfUrl}
                          download={activePaper.answerKeyPdfName}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-300"
                        >
                          <Download className="w-3 h-3" /> Download
                        </a>
                        <a
                          href={activePaper.answerKeyPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1 text-[11px] text-slate-500"
                        >
                          Popout <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <iframe
                      src={activePaper.answerKeyPdfUrl}
                      title="Answer Key Solutions"
                      className="w-full flex-1 bg-white"
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <GraduationCap className="w-16 h-16 mb-3 text-slate-500 stroke-1" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
                Select an Exam Paper to Begin Solving
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Choose a year and subject from the list to view the question paper and verify against the official answer key.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload PYQ Exam Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg liquid-glass rounded-3xl p-6 shadow-2xl text-slate-800 dark:text-slate-100 border border-white/70 dark:border-white/10 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10 mb-4">
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
                  placeholder="e.g. 2024 End-Semester Final Examination"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full liquid-glass-subtle rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none"
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
                    className="w-full liquid-glass-subtle rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none"
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
                      className="flex-1 liquid-glass-subtle rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCreateNewSubject}
                      className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl glass-pill"
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
                    className="w-full liquid-glass-subtle rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none"
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
                    className="w-full liquid-glass-subtle rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none"
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
                    className="w-full liquid-glass-subtle rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none"
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
                    className="w-full liquid-glass-subtle rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none"
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
                  className="p-3.5 border-2 border-dashed border-brand-500/40 rounded-2xl liquid-glass-subtle cursor-pointer hover:border-brand-500 text-center transition-colors"
                >
                  <input
                    type="file"
                    ref={qFileInputRef}
                    className="hidden"
                    accept="application/pdf,text/html,text/plain"
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
                    <div className="text-xs text-slate-500">Tap to select Question Paper PDF</div>
                  )}
                </div>
              </div>

              {/* Answer Key PDF upload */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  2. Official Answer Key / Solutions PDF
                </label>
                <div
                  onClick={() => akFileInputRef.current?.click()}
                  className="p-3.5 border-2 border-dashed border-emerald-500/40 rounded-2xl liquid-glass-subtle cursor-pointer hover:border-emerald-500 text-center transition-colors"
                >
                  <input
                    type="file"
                    ref={akFileInputRef}
                    className="hidden"
                    accept="application/pdf,text/html,text/plain"
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
                    <div className="text-xs text-slate-500">Tap to select Answer Key PDF</div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-black/5 dark:border-white/10">
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
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/30 glass-pill"
                >
                  {isUploading ? 'Uploading Exam...' : 'Confirm Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
