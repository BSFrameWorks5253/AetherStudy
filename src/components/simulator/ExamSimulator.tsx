import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../../services/api';
import { TestPaper } from '../../types/testPaper';
import { transformDocumentUrl } from '../../utils/urlTransformer';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  FileText,
  CheckCircle2,
  BookOpen,
  Table,
  Check,
  Printer,
} from 'lucide-react';

export const ExamSimulator: React.FC = () => {
  const [papers, setPapers] = useState<TestPaper[]>([]);
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');
  const [isLoadingPapers, setIsLoadingPapers] = useState<boolean>(true);

  // Exam Hall Session States
  const [isExamStarted, setIsExamStarted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [allocatedMinutes, setAllocatedMinutes] = useState<number>(180); // Default 3 hours
  const [secondsRemaining, setSecondsRemaining] = useState<number>(180 * 60);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // Student Ruled Answer Sheet Content
  const [answerSheetText, setAnswerSheetText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('aether_exam_hall_answer_sheet');
      if (saved) return saved;
    } catch {}
    return 'MAHARASHTRA STATE BOARD OF SECONDARY & HIGHER SECONDARY EDUCATION\nHSC COMMERCE BOARD EXAMINATION\n\nQ.1 (A) Select the correct option and rewrite the sentence:\n1. \n2. \n3. \n4. \n5. \n\nQ.2 Explain the following terms / concepts:\n1. \n2. \n\nQ.3 Study the following case / situation and express your opinion:\n\n\nQ.4 Distinguish between:\n\n\nQ.5 Answer in brief:\n\n\nQ.6 Long Answer / Practical Problem:\n';
  });

  const [studentName, setStudentName] = useState<string>(() => {
    try {
      return localStorage.getItem('aether_exam_hall_student_name') || 'HSC Candidate';
    } catch {
      return 'HSC Candidate';
    }
  });

  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');
  const timerRef = useRef<number | null>(null);

  // Load available papers from repository
  useEffect(() => {
    const fetchPapers = async () => {
      try {
        const fetched = await api.getTestPapers();
        setPapers(fetched);
        if (fetched.length > 0) {
          setSelectedPaperId(fetched[0].id);
        }
      } catch (err) {
        console.error('Failed to load papers for simulator', err);
      } finally {
        setIsLoadingPapers(false);
      }
    };
    fetchPapers();
  }, []);

  const selectedPaper = useMemo(() => {
    return papers.find((p) => p.id === selectedPaperId) || papers[0];
  }, [papers, selectedPaperId]);

  // Transform selected paper URL
  const paperUrlBundle = useMemo(() => {
    if (!selectedPaper?.questionPdfUrl) return null;
    return transformDocumentUrl(selectedPaper.questionPdfUrl);
  }, [selectedPaper]);

  // Auto-save answer sheet to localStorage every 3 seconds
  useEffect(() => {
    if (isExamStarted) {
      const saveInterval = setInterval(() => {
        try {
          localStorage.setItem('aether_exam_hall_answer_sheet', answerSheetText);
          localStorage.setItem('aether_exam_hall_student_name', studentName);
          const now = new Date();
          setLastSavedTime(
            `${now.getHours().toString().padStart(2, '0')}:${now
              .getMinutes()
              .toString()
              .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
          );
        } catch {}
      }, 3000);
      return () => clearInterval(saveInterval);
    }
  }, [answerSheetText, studentName, isExamStarted]);

  // Main Exam Countdown Timer
  useEffect(() => {
    if (isExamStarted && !isPaused && secondsRemaining > 0) {
      timerRef.current = window.setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            window.clearInterval(timerRef.current!);
            setShowSubmitModal(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isExamStarted, isPaused, secondsRemaining]);

  const handleStartExam = () => {
    setSecondsRemaining(allocatedMinutes * 60);
    setIsExamStarted(true);
    setIsPaused(false);
  };

  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const handleResetExam = () => {
    if (window.confirm('Reset this exam session? Your current written answers will be cleared.')) {
      setIsExamStarted(false);
      setIsPaused(false);
      setSecondsRemaining(allocatedMinutes * 60);
      setAnswerSheetText(
        'MAHARASHTRA STATE BOARD OF SECONDARY & HIGHER SECONDARY EDUCATION\nHSC COMMERCE BOARD EXAMINATION\n\nQ.1 (A) Select the correct option:\n1. \n2. \n\nQ.2 Concepts:\n1. \n\nQ.3 Case Study:\n\nQ.4 Distinguish between:\n\nQ.5 Answer in brief:\n\nQ.6 Problem / Final Accounts:\n'
      );
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Helper text insertions for ruled answer sheet
  const handleInsertJournalTable = () => {
    const journalTemplate = `\n| Date | Particulars | L.F. | Debit (₹) | Credit (₹) |\n| :--- | :--- | :---: | :---: | :---: |\n| 2024 | Cash A/c ................... Dr. | | 50,000 | |\n| | To Capital A/c | | | 50,000 |\n| | *(Being business started with cash)* | | | |\n`;
    setAnswerSheetText((prev) => prev + journalTemplate);
  };

  const handleInsertLedgerTable = () => {
    const ledgerTemplate = `\nDr.                            TRADING & PROFIT & LOSS A/C                            Cr.\n| Particulars | Amount (₹) | Particulars | Amount (₹) |\n| :--- | :---: | :--- | :---: |\n| To Opening Stock | 45,000 | By Sales | 1,80,000 |\n| To Purchases | 85,000 | By Closing Stock | 35,000 |\n| To Gross Profit c/d | 85,000 | | |\n| **Total** | **2,15,000** | **Total** | **2,15,000** |\n`;
    setAnswerSheetText((prev) => prev + ledgerTemplate);
  };

  // Format time display
  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const wordCount = answerSheetText.trim() ? answerSheetText.trim().split(/\s+/).length : 0;
  const isTimeCritical = secondsRemaining <= 15 * 60 && secondsRemaining > 0; // Less than 15 mins

  // Export / Print formatted answer sheet
  const handlePrintOrExport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${studentName} - ${selectedPaper?.title || 'HSC Exam'} Answer Sheet</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
            .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 18px; font-weight: bold; text-align: center; }
            .meta { display: flex; justify-content: space-between; font-size: 12px; margin-top: 10px; }
            pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; background: #fff; line-height: 1.8; }
            @media print { body { padding: 15mm; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">MAHARASHTRA STATE BOARD OF SECONDARY & HIGHER SECONDARY EDUCATION</div>
            <div class="title" style="font-size: 14px; font-weight: normal; margin-top: 4px;">Candidate Answer Sheet • Exam Hall Simulation</div>
            <div class="meta">
              <span><strong>Candidate:</strong> ${studentName}</span>
              <span><strong>Subject:</strong> ${selectedPaper?.subject || 'Commerce'}</span>
              <span><strong>Exam:</strong> ${selectedPaper?.title || 'HSC Board Paper'}</span>
              <span><strong>Total Words:</strong> ${wordCount}</span>
            </div>
          </div>
          <pre>${answerSheetText}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none relative">
      {/* ============================================================== */}
      {/* 1. EXAM STAGE CONTROLLER BAR                                   */}
      {/* ============================================================== */}
      <header className="px-4 py-3 shrink-0 ios-glass border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                Exam Hall Simulator
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                100% Free Arena
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isExamStarted ? `Session: ${selectedPaper?.title || 'Board Paper'}` : 'Timed 3-Hour Simulation with Ruled Answer Book'}
            </p>
          </div>
        </div>

        {/* Center: Live Exam Timer */}
        {isExamStarted ? (
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full border font-mono font-bold text-sm tracking-wider transition-all ${
                isTimeCritical
                  ? 'bg-rose-500 text-white border-rose-600 animate-pulse shadow-md shadow-rose-500/30'
                  : 'bg-black/[0.04] dark:bg-white/[0.08] border-black/[0.06] dark:border-white/[0.1] text-slate-900 dark:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{timeFormatted}</span>
              {isTimeCritical && <span className="text-[10px] uppercase font-sans">Final 15m</span>}
            </div>

            <button
              onClick={handleTogglePause}
              className="p-2 rounded-full ios-glass border border-black/[0.06] dark:border-white/[0.08] text-slate-700 dark:text-slate-200 hover:text-brand-600 transition-all ios-pill cursor-pointer"
              title={isPaused ? 'Resume Exam' : 'Pause Timer'}
            >
              {isPaused ? <Play className="w-4 h-4 text-emerald-500" /> : <Pause className="w-4 h-4" />}
            </button>

            <button
              onClick={handleResetExam}
              className="p-2 rounded-full ios-glass border border-black/[0.06] dark:border-white/[0.08] text-slate-700 dark:text-slate-200 hover:text-rose-500 transition-all ios-pill cursor-pointer"
              title="Reset Exam Session"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Pre-Exam Setup Controls */
          <div className="flex items-center gap-2">
            <select
              value={allocatedMinutes}
              onChange={(e) => setAllocatedMinutes(parseInt(e.target.value))}
              className="px-3 py-1.5 rounded-full ios-glass border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value={180}>3 Hours (Official HSC Full Exam)</option>
              <option value={120}>2 Hours (Unit Test / Midterm)</option>
              <option value={60}>1 Hour (Speed Drill)</option>
            </select>

            <button
              onClick={handleStartExam}
              className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/25 flex items-center gap-1.5 transition-all ios-pill cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Begin Simulation</span>
            </button>
          </div>
        )}

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          {isExamStarted && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-1.5 rounded-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-sm transition-all ios-pill cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Submit & Review</span>
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full ios-glass border border-black/[0.06] dark:border-white/[0.08] text-slate-700 dark:text-slate-200 transition-all ios-pill cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Exam Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. MAIN SIMULATION VIEWPORT                                    */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT PANE: OFFICIAL QUESTION PAPER VIEWER */}
        <div className="lg:w-1/2 h-full flex flex-col border-b lg:border-b-0 lg:border-r border-black/[0.06] dark:border-white/[0.08] bg-slate-100 dark:bg-slate-950/70">
          {/* Question Paper Selector Banner */}
          <div className="px-4 py-2.5 ios-glass border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                Paper:
              </label>
              <select
                value={selectedPaperId}
                onChange={(e) => setSelectedPaperId(e.target.value)}
                disabled={isExamStarted}
                className="text-xs font-bold text-slate-900 dark:text-white bg-transparent truncate focus:outline-hidden cursor-pointer"
              >
                {papers.map((p) => (
                  <option key={p.id} value={p.id} className="text-slate-900 bg-white dark:bg-slate-900">
                    {p.year ? `[${p.year}] ` : ''}{p.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-semibold">
                ⏳ {Math.round((selectedPaper?.durationMinutes || 180) / 60)}h | 💯 {selectedPaper?.totalMarks || 80}m
              </span>
            </div>
          </div>

          {/* Embedded PDF Canvas / Iframe */}
          <div className="flex-1 relative bg-slate-200 dark:bg-slate-900/90 overflow-hidden">
            {paperUrlBundle?.previewUrl ? (
              <iframe
                src={paperUrlBundle.previewUrl}
                className="w-full h-full border-0"
                title="Board Question Paper"
                allow="fullscreen"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
                <BookOpen className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-xs font-semibold">
                  {isLoadingPapers ? 'Loading Board Paper...' : 'Select a question paper from the dropdown above'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: DIGITAL HSC RULED ANSWER SHEET */}
        <div className="lg:w-1/2 h-full flex flex-col bg-amber-50/30 dark:bg-slate-950/90">
          {/* Answer Sheet Toolbar */}
          <div className="px-4 py-2.5 ios-glass border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Candidate Answer Sheet
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                ({wordCount} words)
              </span>
            </div>

            {/* Formatting & Insert Helpers */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleInsertJournalTable}
                className="px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-700 dark:text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                title="Insert Journal Entry Table Template"
              >
                <Table className="w-3 h-3 text-brand-500" />
                <span>+ Journal</span>
              </button>
              <button
                type="button"
                onClick={handleInsertLedgerTable}
                className="px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-700 dark:text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                title="Insert Final Accounts Ledger Template"
              >
                <Table className="w-3 h-3 text-emerald-500" />
                <span>+ Ledger</span>
              </button>
              <button
                type="button"
                onClick={handlePrintOrExport}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Print or Export Answer Sheet"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Student Candidate Identification Strip */}
          <div className="px-4 py-1.5 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <span>Candidate:</span>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden max-w-[140px]"
                placeholder="Candidate Name"
              />
            </div>
            <span className="text-[10px]">Auto-saved: {lastSavedTime}</span>
          </div>

          {/* Ruled Line Answer Textarea with lined paper appearance */}
          <div className="flex-1 relative p-4 overflow-hidden">
            <textarea
              value={answerSheetText}
              onChange={(e) => setAnswerSheetText(e.target.value)}
              placeholder="Write your exam answers here. Use Q.1, Q.2 headings matching your board question paper..."
              className="w-full h-full bg-transparent text-slate-900 dark:text-slate-100 text-sm font-mono leading-relaxed p-2 resize-none focus:outline-hidden"
              style={{
                lineHeight: '2rem',
                backgroundImage:
                  'repeating-linear-gradient(transparent, transparent 31px, rgba(100, 116, 139, 0.12) 31px, rgba(100, 116, 139, 0.12) 32px)',
                backgroundAttachment: 'local',
              }}
            />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. EXAM FINISH & EVALUATION RECAP MODAL                        */}
      {/* ============================================================== */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="ios-glass border border-black/[0.08] dark:border-white/[0.12] rounded-[28px] max-w-lg w-full p-6 sm:p-7 shadow-2xl relative text-slate-900 dark:text-white">
            <div className="flex items-center space-x-2.5 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold">Exam Session Complete!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedPaper?.title || 'HSC Board Examination'}
                </p>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] text-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Words Written</div>
                <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">{wordCount}</div>
              </div>
              <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] text-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Allocated Time</div>
                <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">{allocatedMinutes}m</div>
              </div>
              <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] text-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Paper Marks</div>
                <div className="text-base font-black text-brand-600 dark:text-brand-400 mt-0.5">{selectedPaper?.totalMarks || 80}</div>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              Great effort! You can print or download your written answer booklet, or directly compare your solutions against the official Maharashtra State Board model answer key.
            </p>

            {/* Modal Actions */}
            <div className="space-y-2.5">
              <button
                onClick={handlePrintOrExport}
                className="w-full py-2.5 px-4 rounded-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/25 flex items-center justify-center gap-1.5 cursor-pointer ios-pill"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Download Completed Answer Sheet</span>
              </button>

              {selectedPaper?.answerKeyPdfUrl &&
                selectedPaper.answerKeyPdfUrl.trim() !== '' &&
                selectedPaper.answerKeyPdfUrl !== selectedPaper.questionPdfUrl && (
                  <button
                    onClick={() => {
                      const solBundle = transformDocumentUrl(selectedPaper.answerKeyPdfUrl);
                      if (solBundle.previewUrl) {
                        window.open(solBundle.previewUrl, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/25 flex items-center justify-center gap-1.5 cursor-pointer ios-pill"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Open Official Model Solution Key →</span>
                  </button>
                )}

              <button
                onClick={() => setShowSubmitModal(false)}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                Return to Editor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
