import React from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import { getUserStorageItem } from '../../utils/userStorage';
import { Printer, X, Sparkles } from 'lucide-react';

interface RevisionExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RevisionExporterModal: React.FC<RevisionExporterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { bookmarks, completedPapers } = useStudyStore();

  if (!isOpen) return null;

  // Retrieve user-isolated syllabus completed map
  const rawMap = getUserStorageItem<Record<string, boolean>>('aether_syllabus_completed_map', {});
  const syllabusCompletedCount = Object.values(rawMap).filter(Boolean).length;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>AetherStudy • Last Minute Revision (LMR) Dossier</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 24px; }
            .title { font-size: 20px; font-weight: bold; color: #1e3a8a; }
            .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
            h2 { font-size: 15px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; }
            .note-card { background: #f8fafc; border-left: 3px solid #2563eb; padding: 8px 12px; margin-bottom: 10px; font-size: 13px; }
            .formula-card { background: #f0fdf4; border-left: 3px solid #16a34a; padding: 8px 12px; margin-bottom: 10px; font-size: 13px; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #dbeafe; color: #1e40af; font-size: 10px; font-weight: bold; }
            @media print { body { padding: 15mm; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">MAHARASHTRA STATE BOARD HSC COMMERCE</div>
            <div class="sub">Personalized Last Minute Revision (LMR) Dossier • AetherStudy Vault</div>
            <div class="sub" style="margin-top: 8px;">
              <strong>Generated:</strong> ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} |
              <strong>Papers Solved:</strong> ${completedPapers.length} |
              <strong>Chapters Mastered:</strong> ${syllabusCompletedCount} |
              <strong>Bookmarked Notes:</strong> ${bookmarks.length}
            </div>
          </div>

          <h2>1. My High-Priority Document Bookmarks & Notes (${bookmarks.length})</h2>
          ${
            bookmarks.length === 0
              ? '<p style="font-size:12px; color:#64748b;">No notes bookmarked yet. Use the PDF viewer to bookmark key textbook or paper pages.</p>'
              : bookmarks
                  .map(
                    (b) => `
              <div class="note-card">
                <div><span class="badge">Page ${b.page}</span> <strong>Document Ref:</strong> ${b.pdfId}</div>
                <div style="margin-top: 4px;">${b.note}</div>
              </div>`
                  )
                  .join('')
          }

          <h2>2. Curriculum Revision Status (${syllabusCompletedCount} Chapters Completed)</h2>
          <div class="note-card" style="border-left-color: #16a34a; background: #f0fdf4;">
            <div><strong>Active Syllabus Progress:</strong> ${syllabusCompletedCount} Topics & Chapters marked as completed in your study profile.</div>
            <div style="margin-top: 4px; font-size: 12px; color: #15803d;">Keep revising weak areas and solving past question papers.</div>
          </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="ios-glass border border-black/[0.08] dark:border-white/[0.12] rounded-[28px] max-w-lg w-full p-6 sm:p-7 shadow-2xl relative text-slate-900 dark:text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/15 text-brand-600 dark:text-brand-300 flex items-center justify-center border border-brand-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Personal Revision Dossier</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                1-Click Printable Last Minute Revision (LMR) Sheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Stats Preview */}
        <div className="grid grid-cols-3 gap-2.5 my-4">
          <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] text-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Saved Notes</div>
            <div className="text-base font-black text-brand-600 dark:text-brand-400 mt-0.5">{bookmarks.length}</div>
          </div>
          <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] text-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Chapters Mastered</div>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{syllabusCompletedCount}</div>
          </div>
          <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] text-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Papers Done</div>
            <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">{completedPapers.length}</div>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
          Exports all your custom PDF page bookmarks, personal study notes, and mastered formula cards into a clean, ad-free printable cheat sheet for exam day morning.
        </p>

        <div className="space-y-2">
          <button
            onClick={handlePrint}
            className="w-full py-2.5 px-4 rounded-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/25 flex items-center justify-center gap-1.5 cursor-pointer ios-pill"
          >
            <Printer className="w-4 h-4" />
            <span>Generate & Print Revision Sheet</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
