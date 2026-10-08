import React, { useState, useMemo } from 'react';
import { useServerStorage } from '../../hooks/useServerStorage';
import { api } from '../../services/api';
import { SyllabusTopic, SyllabusChapter } from '../../types/syllabus';
import { CircularProgress } from './CircularProgress';
import {
  FolderTree,
  Plus,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Circle,
  Trash2,
  Layers,
  BookOpen,
  Server,
} from 'lucide-react';

const INITIAL_SYLLABUS: SyllabusTopic[] = [
  {
    id: 'top-1',
    subject: 'Distributed Systems',
    title: '1. Consensus Algorithms & Fault-Tolerance',
    isExpanded: true,
    chapters: [
      { id: 'ch-1-1', title: 'Paxos: Single-Decree Synod & Multi-Paxos Lease Protocols', isCompleted: true },
      { id: 'ch-1-2', title: 'Raft: Randomized Leader Election & Log Replication Safety', isCompleted: true },
      { id: 'ch-1-3', title: 'Practical Byzantine Fault Tolerance (PBFT) & View Changes', isCompleted: false },
      { id: 'ch-1-4', title: 'Vector Clocks, Lamport Timestamps & Causal Consistency', isCompleted: false },
    ],
  },
  {
    id: 'top-2',
    subject: 'Quantum Information Science',
    title: '2. Quantum Circuits & Error Correction',
    isExpanded: true,
    chapters: [
      { id: 'ch-2-1', title: 'Bloch Sphere Geometry, Pauli Matrices & Clifford Group', isCompleted: true },
      { id: 'ch-2-2', title: 'Shor’s 9-Qubit Code & CSS Quantum Stabilizer Formalism', isCompleted: false },
      { id: 'ch-2-3', title: 'Surface Codes: Anyonic Excitations & Toric Code Topology', isCompleted: false },
    ],
  },
  {
    id: 'top-3',
    subject: 'Machine Learning Theory',
    title: '3. Attention Mechanics & Diffusion Models',
    isExpanded: false,
    chapters: [
      { id: 'ch-3-1', title: 'Scaled Dot-Product Attention & Rotary Positional Embeddings (RoPE)', isCompleted: true },
      { id: 'ch-3-2', title: 'Stochastic Differential Equations & Score-Based Generative Models', isCompleted: false },
      { id: 'ch-3-3', title: 'FlashAttention: IO-Aware Tiling on GPU Shared SRAM', isCompleted: false },
    ],
  },
  {
    id: 'top-4',
    subject: 'Computer Systems & OS',
    title: '4. Memory Consistency & Hardware Concurrency',
    isExpanded: false,
    chapters: [
      { id: 'ch-4-1', title: 'MESI / MOESI Cache Coherence & False Sharing Mitigation', isCompleted: true },
      { id: 'ch-4-2', title: 'Sequential Consistency vs TSO (Total Store Ordering) Barriers', isCompleted: false },
      { id: 'ch-4-3', title: 'Non-Blocking Lock-Free FIFO Queues & ABA Prevention', isCompleted: false },
    ],
  },
];

export const SyllabusTracker: React.FC = () => {
  // Sync directly with backend Server Storage
  const [syllabus, setSyllabus, isSaving, isConnected] = useServerStorage<SyllabusTopic[]>(
    async () => {
      const res = await api.getSyllabus<SyllabusTopic[]>();
      return res;
    },
    async (topics) => {
      return await api.saveSyllabus(topics);
    },
    INITIAL_SYLLABUS
  );

  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  
  // Topic creation state
  const [newTopicSubject, setNewTopicSubject] = useState<string>('Distributed Systems');
  const [newTopicTitle, setNewTopicTitle] = useState<string>('');
  const [isAddingTopic, setIsAddingTopic] = useState<boolean>(false);

  // Quick chapter add state
  const [activeAddingChapterTopicId, setActiveAddingChapterTopicId] = useState<string | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState<string>('');

  const availableSubjects = useMemo(() => {
    return Array.from(new Set(syllabus.map((t) => t.subject)));
  }, [syllabus]);

  const filteredTopics = useMemo(() => {
    if (selectedSubject === 'All') return syllabus;
    return syllabus.filter((t) => t.subject === selectedSubject);
  }, [syllabus, selectedSubject]);

  const { totalChapters, completedChapters, percentage } = useMemo(() => {
    let total = 0;
    let completed = 0;
    filteredTopics.forEach((t) => {
      total += t.chapters.length;
      completed += t.chapters.filter((c) => c.isCompleted).length;
    });
    const pct = total === 0 ? 0 : (completed / total) * 100;
    return { totalChapters: total, completedChapters: completed, percentage: pct };
  }, [filteredTopics]);

  const handleToggleChapter = (topicId: string, chapterId: string) => {
    setSyllabus((prev) =>
      prev.map((t) => {
        if (t.id !== topicId) return t;
        return {
          ...t,
          chapters: t.chapters.map((c) => (c.id === chapterId ? { ...c, isCompleted: !c.isCompleted } : c)),
        };
      })
    );
  };

  const handleToggleExpand = (topicId: string) => {
    setSyllabus((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, isExpanded: !t.isExpanded } : t))
    );
  };

  const handleAddChapter = (topicId: string) => {
    if (!newChapterTitle.trim()) return;
    const newChapter: SyllabusChapter = {
      id: `ch-${Date.now()}`,
      title: newChapterTitle.trim(),
      isCompleted: false,
    };
    setSyllabus((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, chapters: [...t.chapters, newChapter] } : t))
    );
    setNewChapterTitle('');
    setActiveAddingChapterTopicId(null);
  };

  const handleDeleteChapter = (topicId: string, chapterId: string) => {
    setSyllabus((prev) =>
      prev.map((t) =>
        t.id === topicId ? { ...t, chapters: t.chapters.filter((c) => c.id !== chapterId) } : t
      )
    );
  };

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) return;

    const newTopic: SyllabusTopic = {
      id: `top-${Date.now()}`,
      subject: newTopicSubject.trim() || 'General',
      title: newTopicTitle.trim(),
      isExpanded: true,
      chapters: [],
    };

    setSyllabus((prev) => [...prev, newTopic]);
    setNewTopicTitle('');
    setIsAddingTopic(false);
  };

  const handleDeleteTopic = (topicId: string) => {
    setSyllabus((prev) => prev.filter((t) => t.id !== topicId));
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-8 relative">
      {/* Header and Summary stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider mb-1">
            <FolderTree className="w-4 h-4" />
            <span>Curriculum Decomposition & Mastery</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Syllabus Tracker
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <span>Nested mastery tree with live math metrics.</span>
            <span className="flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-full liquid-glass-subtle">
              <Server className={`w-3 h-3 ${isConnected ? 'text-emerald-500' : 'text-amber-500'}`} />
              {isSaving ? 'Syncing...' : isConnected ? 'Server Stored' : 'Offline Buffer'}
            </span>
          </p>
        </div>

        {/* Global Progress Metrics Card with Circular Meter */}
        <div className="flex items-center liquid-glass rounded-3xl p-5 shadow-xl space-x-6 border border-white/60 dark:border-white/10">
          <CircularProgress
            percentage={percentage}
            size={115}
            strokeWidth={10}
            label="Mastery"
            sublabel={`${completedChapters}/${totalChapters}`}
          />

          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
              <span className="text-slate-500 dark:text-slate-400">Total Topic Modules:</span>
              <span className="font-bold text-slate-900 dark:text-white">{filteredTopics.length}</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-500 dark:text-slate-400">Mastered Chapters:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{completedChapters}</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-500 dark:text-slate-400">Remaining Targets:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{totalChapters - completedChapters}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Filter Bar and Add Topic Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center space-x-1.5 p-1.5 liquid-glass rounded-2xl overflow-x-auto shadow-sm">
          <button
            onClick={() => setSelectedSubject('All')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedSubject === 'All'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Subjects
          </button>
          {availableSubjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedSubject === sub
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsAddingTopic(true)}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/25 transition-all active:scale-95 glass-pill"
        >
          <Plus className="w-4 h-4" />
          <span>New Topic Module</span>
        </button>
      </div>

      {/* Add Topic Inline Dialog */}
      {isAddingTopic && (
        <form
          onSubmit={handleCreateTopic}
          className="mb-6 p-5 liquid-glass rounded-2xl space-y-3 animate-fade-in border border-brand-500/50 shadow-xl"
        >
          <h3 className="text-xs font-bold text-brand-600 dark:text-brand-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Append New Topic Module
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Subject</label>
              <input
                type="text"
                value={newTopicSubject}
                onChange={(e) => setNewTopicSubject(e.target.value)}
                placeholder="e.g. Distributed Systems"
                className="w-full liquid-glass-subtle rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Topic Module Title</label>
              <input
                type="text"
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                placeholder="e.g. 5. Gossip Protocols & Epidemic Algorithms"
                className="w-full liquid-glass-subtle rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                required
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingTopic(false)}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-md glass-pill"
            >
              Add Module
            </button>
          </div>
        </form>
      )}

      {/* Nested Tree List */}
      <div className="space-y-3.5">
        {filteredTopics.length === 0 ? (
          <div className="text-center py-14 liquid-glass rounded-3xl text-slate-500 text-xs">
            No topic modules configured for this subject. Click &quot;New Topic Module&quot; to begin.
          </div>
        ) : (
          filteredTopics.map((topic) => {
            const topicCompletedCount = topic.chapters.filter((c) => c.isCompleted).length;
            const topicTotalCount = topic.chapters.length;
            const topicPct =
              topicTotalCount === 0 ? 0 : Math.round((topicCompletedCount / topicTotalCount) * 100);

            return (
              <div
                key={topic.id}
                className="liquid-glass rounded-2xl overflow-hidden transition-all shadow-sm hover:shadow-md"
              >
                {/* Topic Parent Node Bar */}
                <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5">
                  <div
                    onClick={() => handleToggleExpand(topic.id)}
                    className="flex items-center space-x-3 cursor-pointer flex-1 select-none"
                  >
                    <button className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5">
                      {topic.isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-brand-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center space-x-2.5">
                        <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                          {topic.title}
                        </span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full liquid-glass-subtle text-slate-600 dark:text-slate-300 font-bold">
                          {topic.subject}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Linear progress badge */}
                    <div className="hidden sm:flex items-center space-x-2">
                      <div className="w-24 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-accent-cyan transition-all duration-300"
                          style={{ width: `${topicPct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                        {topicCompletedCount}/{topicTotalCount} ({topicPct}%)
                      </span>
                    </div>

                    <button
                      onClick={() => setActiveAddingChapterTopicId(topic.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      title="Add Chapter"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteTopic(topic.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Delete Module"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-tree Chapters */}
                {topic.isExpanded && (
                  <div className="p-3.5 liquid-glass-subtle space-y-2">
                    {topic.chapters.length === 0 ? (
                      <div className="py-2 px-3 text-xs text-slate-400 italic flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        No chapters added yet. Click &apos;+&apos; above to append chapters.
                      </div>
                    ) : (
                      topic.chapters.map((chapter) => (
                        <div
                          key={chapter.id}
                          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl liquid-glass border border-white/50 dark:border-white/5 transition-colors group"
                        >
                          <div
                            onClick={() => handleToggleChapter(topic.id, chapter.id)}
                            className="flex items-center space-x-3 cursor-pointer flex-1"
                          >
                            <button
                              className="text-slate-400 hover:text-brand-500 transition-colors"
                              title={chapter.isCompleted ? 'Mark incomplete' : 'Mark completed'}
                            >
                              {chapter.isCompleted ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                              )}
                            </button>
                            <span
                              className={`text-xs ${
                                chapter.isCompleted
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-800 dark:text-slate-100 font-medium'
                              }`}
                            >
                              {chapter.title}
                            </span>
                          </div>

                          <button
                            onClick={() => handleDeleteChapter(topic.id, chapter.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded transition-all"
                            title="Remove Chapter"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}

                    {/* Inline Chapter Input Form */}
                    {activeAddingChapterTopicId === topic.id && (
                      <div className="flex items-center space-x-2 pt-2 animate-fade-in">
                        <input
                          type="text"
                          value={newChapterTitle}
                          onChange={(e) => setNewChapterTitle(e.target.value)}
                          placeholder="Chapter or research milestone title..."
                          className="flex-1 liquid-glass rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddChapter(topic.id);
                            if (e.key === 'Escape') setActiveAddingChapterTopicId(null);
                          }}
                        />
                        <button
                          onClick={() => handleAddChapter(topic.id)}
                          className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow glass-pill"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setActiveAddingChapterTopicId(null)}
                          className="px-2.5 py-2 text-xs font-semibold text-slate-500"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
