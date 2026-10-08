import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DocumentViewer } from './DocumentViewer';
import { MarkdownEditor } from './MarkdownEditor';
import { useServerStorage } from '../../hooks/useServerStorage';
import { api } from '../../services/api';
import { ChevronLeft, ChevronRight, GripVertical, FileText, Edit3 } from 'lucide-react';

const FALLBACK_NOTES = `# Distributed Systems & Consensus Architecture

> MIT 6.824 Monograph Analysis • Focus: Raft Replicated State Machines

### 1. Key Invariants & Axioms
- **Election Safety:** At most one leader can be elected in a given term $\\tau$.
- **Leader Append-Only:** A leader never overwrites or truncates its log entries; it only appends new entries.
- **Log Matching:** If two logs contain an entry with the same index and term, then the logs are identical in all entries up through the given index.

### 2. Implementation Checkpoints
- [x] Implement ticker loop for randomized election timeouts ($150\\text{ms} - 300\\text{ms}$)
- [x] Verify heartbeats suppress candidate transitions across stable followers
- [ ] Implement Fast-Recovery backoff optimization for \`AppendEntries\` conflict rejection
- [ ] Build snapshot compaction via \`InstallSnapshot\` RPC to constrain memory footprint
`;

export const SplitWorkspace: React.FC = () => {
  const [splitRatio, setSplitRatio] = useState<number>(50);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [mobileActivePane, setMobileActivePane] = useState<'document' | 'notes'>('document');

  // Monitor viewport width for mobile layout optimization
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync notes continuously with backend Server Storage
  const [notesData, setNotesData, isSaving, isConnected] = useServerStorage<{ content: string }>(
    async () => {
      const res = await api.getNotes();
      return res;
    },
    async (val) => {
      return await api.saveNotes(val.content);
    },
    { content: FALLBACK_NOTES }
  );

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newRatio = ((e.clientX - rect.left) / rect.width) * 100;
      if (newRatio >= 20 && newRatio <= 80) {
        setSplitRatio(Math.round(newRatio));
      }
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="relative flex flex-col md:flex-row w-full h-full overflow-hidden select-text">
      {/* Mobile Fluid Mode Switcher Banner (< 768px viewports) */}
      {isMobile && (
        <div className="flex md:hidden items-center justify-center p-2 liquid-glass border-b border-white/40 dark:border-white/10 z-30 shrink-0">
          <div className="flex items-center space-x-1 liquid-glass-subtle p-1 rounded-2xl w-full max-w-xs shadow-sm">
            <button
              onClick={() => setMobileActivePane('document')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mobileActivePane === 'document'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Reader</span>
            </button>
            <button
              onClick={() => setMobileActivePane('notes')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mobileActivePane === 'notes'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Study Notes</span>
            </button>
          </div>
        </div>
      )}

      {/* Left Pane: Server Document & PDF Viewer */}
      <div
        className={`h-full overflow-hidden transition-all duration-75 ${
          isMobile
            ? mobileActivePane === 'document'
              ? 'w-full flex-1'
              : 'hidden'
            : ''
        }`}
        style={!isMobile ? { width: `${splitRatio}%` } : undefined}
      >
        <DocumentViewer />
      </div>

      {/* Desktop Drag Resizer Divider Bar (hidden on mobile) */}
      {!isMobile && (
        <div
          onMouseDown={handleMouseDown}
          className={`group relative w-2 h-full cursor-col-resize z-30 flex items-center justify-center transition-colors ${
            isDragging
              ? 'bg-brand-500 shadow-glass-glow'
              : 'liquid-glass hover:bg-brand-500/50'
          }`}
        >
          <div className="absolute p-0.5 rounded-lg bg-white/70 dark:bg-slate-800 text-slate-500 group-hover:text-white group-hover:bg-brand-600 transition-all shadow-md">
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          <div className="absolute top-4 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity liquid-glass rounded-xl p-1 shadow-xl">
            <button
              onClick={() => setSplitRatio(30)}
              className="p-1 text-[10px] text-slate-500 hover:text-white hover:bg-brand-600 rounded-lg"
              title="Focus on Notes (30/70)"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => setSplitRatio(50)}
              className="p-1 text-[9px] font-mono text-slate-500 hover:text-white hover:bg-brand-600 rounded-lg"
              title="Equal Split (50/50)"
            >
              ½
            </button>
            <button
              onClick={() => setSplitRatio(70)}
              className="p-1 text-[10px] text-slate-500 hover:text-white hover:bg-brand-600 rounded-lg"
              title="Focus on Document (70/30)"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Right Pane: Markdown Notes Editor */}
      <div
        className={`h-full overflow-hidden transition-all duration-75 ${
          isMobile
            ? mobileActivePane === 'notes'
              ? 'w-full flex-1'
              : 'hidden'
            : ''
        }`}
        style={!isMobile ? { width: `${100 - splitRatio}%` } : undefined}
      >
        <MarkdownEditor
          value={notesData.content}
          onChange={(newContent) => setNotesData({ content: newContent })}
          isSaving={isSaving}
          isConnected={isConnected}
        />
      </div>
    </div>
  );
};
