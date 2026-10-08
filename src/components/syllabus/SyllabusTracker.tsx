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
  ExternalLink,
} from 'lucide-react';

const INITIAL_SYLLABUS: SyllabusTopic[] = [
  // 1. Book Keeping & Accountancy (Accounts)
  {
    id: 'top-bk-1',
    subject: 'Accounts',
    title: 'Partnership Accounting & Foundations',
    isExpanded: true,
    chapters: [
      { id: 'ch-bk-1', title: 'Chapter 1: Introduction to Partnership & Partnership Final Accounts', isCompleted: true },
      { id: 'ch-bk-2', title: "Chapter 2: Accounts of 'Not for Profit' Concerns", isCompleted: true },
      { id: 'ch-bk-3', title: 'Chapter 3: Reconstitution of Partnership (Admission of Partner)', isCompleted: false },
      { id: 'ch-bk-4', title: 'Chapter 4: Reconstitution of Partnership (Retirement of Partner)', isCompleted: false },
      { id: 'ch-bk-5', title: 'Chapter 5: Reconstitution of Partnership (Death of Partner)', isCompleted: false },
      { id: 'ch-bk-6', title: 'Chapter 6: Dissolution of Partnership Firm', isCompleted: false },
    ],
  },
  {
    id: 'top-bk-2',
    subject: 'Accounts',
    title: 'Negotiable Instruments & Corporate Accounting',
    isExpanded: false,
    chapters: [
      { id: 'ch-bk-7', title: 'Chapter 7: Bills of Exchange', isCompleted: false },
      { id: 'ch-bk-8', title: 'Chapter 8: Company Accounts – Issue of Shares', isCompleted: false },
      { id: 'ch-bk-9', title: 'Chapter 9: Analysis of Financial Statements', isCompleted: false },
      { id: 'ch-bk-10', title: 'Chapter 10: Computer in Accounting', isCompleted: false },
    ],
  },

  // 2. Mathematics and Statistics (Commerce) - Part 1 & Part 2
  {
    id: 'top-math-1',
    subject: 'Mathematics',
    title: 'Mathematics Part 1 (Logic, Matrices & Calculus)',
    isExpanded: true,
    chapters: [
      { id: 'ch-m1-1', title: 'Chapter 1: Mathematical Logic', isCompleted: true },
      { id: 'ch-m1-2', title: 'Chapter 2: Matrices', isCompleted: false },
      { id: 'ch-m1-3', title: 'Chapter 3: Differentiation', isCompleted: false },
      { id: 'ch-m1-4', title: 'Chapter 4: Applications of Derivatives', isCompleted: false },
      { id: 'ch-m1-5', title: 'Chapter 5: Integration', isCompleted: false },
      { id: 'ch-m1-6', title: 'Chapter 6: Definite Integration', isCompleted: false },
      { id: 'ch-m1-7', title: 'Chapter 7: Applications of Definite Integration', isCompleted: false },
      { id: 'ch-m1-8', title: 'Chapter 8: Differential Equations and Applications', isCompleted: false },
    ],
  },
  {
    id: 'top-math-2',
    subject: 'Mathematics',
    title: 'Mathematics Part 2 (Commercial Math & Statistics)',
    isExpanded: false,
    chapters: [
      { id: 'ch-m2-1', title: 'Chapter 1: Commission, Brokerage, and Discount', isCompleted: true },
      { id: 'ch-m2-2', title: 'Chapter 2: Insurance and Annuity', isCompleted: false },
      { id: 'ch-m2-3', title: 'Chapter 3: Linear Regression', isCompleted: false },
      { id: 'ch-m2-4', title: 'Chapter 4: Time Series', isCompleted: false },
      { id: 'ch-m2-5', title: 'Chapter 5: Index Numbers', isCompleted: false },
      { id: 'ch-m2-6', title: 'Chapter 6: Linear Programming', isCompleted: false },
      { id: 'ch-m2-7', title: 'Chapter 7: Assignment Problem and Sequencing', isCompleted: false },
      { id: 'ch-m2-8', title: 'Chapter 8: Probability Distributions', isCompleted: false },
    ],
  },

  // 3. Economics
  {
    id: 'top-eco-1',
    subject: 'Economics',
    title: 'Micro-Economics & Market Structures',
    isExpanded: true,
    chapters: [
      { id: 'ch-eco-1', title: 'Chapter 1: Introduction to Micro-economics and Macro-economics', isCompleted: true },
      { id: 'ch-eco-2', title: 'Chapter 2: Utility Analysis', isCompleted: false },
      { id: 'ch-eco-3a', title: 'Chapter 3A: Demand Analysis', isCompleted: false },
      { id: 'ch-eco-3b', title: 'Chapter 3B: Elasticity of Demand', isCompleted: false },
      { id: 'ch-eco-4', title: 'Chapter 4: Supply Analysis', isCompleted: false },
      { id: 'ch-eco-5', title: 'Chapter 5: Forms of Market', isCompleted: false },
    ],
  },
  {
    id: 'top-eco-2',
    subject: 'Economics',
    title: 'Macro-Economics & Public Finance',
    isExpanded: false,
    chapters: [
      { id: 'ch-eco-6', title: 'Chapter 6: Index Numbers', isCompleted: false },
      { id: 'ch-eco-7', title: 'Chapter 7: National Income', isCompleted: false },
      { id: 'ch-eco-8', title: 'Chapter 8: Public Finance in India', isCompleted: false },
      { id: 'ch-eco-9', title: 'Chapter 9: Money Market and Capital Market in India', isCompleted: false },
      { id: 'ch-eco-10', title: 'Chapter 10: Foreign Trade of India', isCompleted: false },
    ],
  },

  // 4. Organization of Commerce and Management (OCM)
  {
    id: 'top-ocm-1',
    subject: 'OCM',
    title: 'Principles, Functions & Enterprise',
    isExpanded: true,
    chapters: [
      { id: 'ch-ocm-1', title: 'Chapter 1: Principles of Management', isCompleted: true },
      { id: 'ch-ocm-2', title: 'Chapter 2: Functions of Management', isCompleted: false },
      { id: 'ch-ocm-3', title: 'Chapter 3: Entrepreneurship Development', isCompleted: false },
      { id: 'ch-ocm-4', title: 'Chapter 4: Business Services', isCompleted: false },
    ],
  },
  {
    id: 'top-ocm-2',
    subject: 'OCM',
    title: 'Modern Commerce, Consumer Rights & Marketing',
    isExpanded: false,
    chapters: [
      { id: 'ch-ocm-5', title: 'Chapter 5: Emerging Modes of Business', isCompleted: false },
      { id: 'ch-ocm-6', title: 'Chapter 6: Social Responsibilities of Business', isCompleted: false },
      { id: 'ch-ocm-7', title: 'Chapter 7: Consumer Protection', isCompleted: false },
      { id: 'ch-ocm-8', title: 'Chapter 8: Marketing', isCompleted: false },
    ],
  },

  // 5. Information Technology (IT)
  {
    id: 'top-it-1',
    subject: 'IT',
    title: 'Advanced Web, E-Commerce & Database Systems',
    isExpanded: true,
    chapters: [
      { id: 'ch-it-1', title: 'Chapter 1: Advanced Web Designing', isCompleted: true },
      { id: 'ch-it-2', title: 'Chapter 2: Digital Marketing', isCompleted: false },
      { id: 'ch-it-3', title: 'Chapter 3: Computerised Accounting with GST', isCompleted: false },
      { id: 'ch-it-4', title: 'Chapter 4: E-Commerce and E-Governance', isCompleted: false },
      { id: 'ch-it-5', title: 'Chapter 5: Database Concepts using Libre Office Base', isCompleted: false },
      { id: 'ch-it-6', title: 'Chapter 6: Enterprise Resource Planning (ERP)', isCompleted: false },
    ],
  },

  // 6. English (Yuvakbharati)
  {
    id: 'top-eng-1',
    subject: 'English',
    title: 'Section I & II: Prose & Poetry',
    isExpanded: false,
    chapters: [
      { id: 'ch-eng-1', title: '1.1 An Astrologer’s Day — R. K. Narayan', isCompleted: true },
      { id: 'ch-eng-2', title: '1.2 On Saying “Please” — A. G. Gardiner', isCompleted: false },
      { id: 'ch-eng-3', title: '1.3 The Cop and the Anthem — O. Henry', isCompleted: false },
      { id: 'ch-eng-4', title: '1.4 Big Data - Big Insights', isCompleted: false },
      { id: 'ch-eng-5', title: '1.5 The New Dress — Virginia Woolf', isCompleted: false },
      { id: 'ch-eng-6', title: '2.1 Cherry Tree — Ruskin Bond', isCompleted: false },
      { id: 'ch-eng-7', title: '2.2 Indian Weavers — Sarojini Naidu', isCompleted: false },
    ],
  },
];

export const SyllabusTracker: React.FC = () => {
  // Sync directly with hidden GitHub Database pipeline with local server fallback
  const [syllabus, setSyllabus, isSaving, isConnected] = useServerStorage<SyllabusTopic[]>(
    async () => {
      let rawServerData: SyllabusTopic[] | null = null;
      try {
        const ghSyllabus = await api.syncGet<SyllabusTopic[]>('syllabus.json');
        if (Array.isArray(ghSyllabus) && ghSyllabus.length > 0 && ghSyllabus.some((t) => t.chapters && t.chapters.length > 0)) {
          rawServerData = ghSyllabus;
        }
      } catch {
        // Fallback
      }

      if (!rawServerData) {
        try {
          const res = await api.getSyllabus<SyllabusTopic[]>();
          if (Array.isArray(res) && res.length > 0 && res.some((t) => t.chapters && t.chapters.length > 0)) {
            rawServerData = res;
          }
        } catch {
          // Fallback
        }
      }

      // Read local chapter checklist progress
      let localCompletedMap: Record<string, boolean> = {};
      try {
        const cached = localStorage.getItem('aether_syllabus_completed_map');
        if (cached) localCompletedMap = JSON.parse(cached);
      } catch {}

      // If server has completion states, merge them
      const serverCompletedMap: Record<string, boolean> = {};
      if (Array.isArray(rawServerData)) {
        rawServerData.forEach((t) => {
          if (Array.isArray(t?.chapters)) {
            t.chapters.forEach((c) => {
              if (c?.id && typeof c.isCompleted === 'boolean') {
                serverCompletedMap[c.id] = c.isCompleted;
              }
            });
          }
        });
      }

      const combinedMap = { ...serverCompletedMap, ...localCompletedMap };

      // Ensure every official Maharashtra HSC topic and chapter is preserved
      const authoritativeSyllabus: SyllabusTopic[] = INITIAL_SYLLABUS.map((topic) => {
        const serverMatch = rawServerData?.find((st) => st.id === topic.id || st.title === topic.title);
        const materials = serverMatch?.materials || topic.materials;

        return {
          ...topic,
          materials,
          chapters: topic.chapters.map((ch) => ({
            ...ch,
            isCompleted: combinedMap[ch.id] !== undefined ? combinedMap[ch.id] : ch.isCompleted,
          })),
        };
      });

      // Retain any extra valid custom topics added by user
      if (Array.isArray(rawServerData)) {
        const initialIds = new Set(INITIAL_SYLLABUS.map((t) => t.id));
        rawServerData.forEach((st) => {
          if (st && st.id && !initialIds.has(st.id) && Array.isArray(st.chapters) && st.chapters.length > 0) {
            authoritativeSyllabus.push(st);
          }
        });
      }

      return authoritativeSyllabus;
    },
    async (topics) => {
      // Save completed chapter states to localStorage
      try {
        const completedMap: Record<string, boolean> = {};
        topics.forEach((t) => {
          t.chapters.forEach((c) => {
            completedMap[c.id] = c.isCompleted;
          });
        });
        localStorage.setItem('aether_syllabus_completed_map', JSON.stringify(completedMap));
      } catch {}

      try {
        await api.syncPut('syllabus.json', topics);
      } catch {}
      return await api.saveSyllabus(topics);
    },
    INITIAL_SYLLABUS
  );

  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  
  // Topic creation state
  const [newTopicSubject, setNewTopicSubject] = useState<string>('Accounts');
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
    setSyllabus((prev) => {
      const updated = prev.map((t) => {
        if (t.id !== topicId) return t;
        return {
          ...t,
          chapters: t.chapters.map((c) => (c.id === chapterId ? { ...c, isCompleted: !c.isCompleted } : c)),
        };
      });

      try {
        const completedMap: Record<string, boolean> = {};
        updated.forEach((t) => {
          t.chapters.forEach((c) => {
            completedMap[c.id] = c.isCompleted;
          });
        });
        localStorage.setItem('aether_syllabus_completed_map', JSON.stringify(completedMap));
      } catch {}

      return updated;
    });
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 shrink-0">
        <div>
          <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider mb-1">
            <FolderTree className="w-4 h-4" />
            <span>Curriculum Decomposition & Mastery</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Curriculum & Revision Tracker
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <span>Track chapter completion, key concepts, and revision milestones.</span>
            <span className="flex items-center gap-1 font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <Server className={`w-3 h-3 ${isConnected ? 'text-emerald-500' : 'text-amber-500'}`} />
              {isSaving ? 'Saving...' : isConnected ? 'Auto-Synced' : 'Saved Locally'}
            </span>
          </p>
        </div>

        {/* Global Progress Metrics Card with Circular Meter */}
        <div className="flex items-center bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs space-x-6 border border-slate-200 dark:border-slate-800 shrink-0">
          <CircularProgress
            percentage={percentage}
            size={130}
            strokeWidth={10}
            label="Revision"
            sublabel={`${completedChapters}/${totalChapters}`}
          />

          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
              <span className="text-slate-500 dark:text-slate-400">Total Subject Modules:</span>
              <span className="font-bold text-slate-900 dark:text-white">{filteredTopics.length}</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-500 dark:text-slate-400">Completed Chapters:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{completedChapters}</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-500 dark:text-slate-400">Pending Revision:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{totalChapters - completedChapters}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Filter Bar and Add Topic Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 shrink-0">
        <div className="flex items-center space-x-1.5 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto no-scrollbar shadow-xs max-w-full">
          <button
            onClick={() => setSelectedSubject('All')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
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
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
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
                          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all group ${
                            chapter.isCompleted
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40 shadow-xs'
                              : 'liquid-glass border-slate-200/60 dark:border-slate-800/60 hover:border-brand-500/30'
                          }`}
                        >
                          <div
                            onClick={() => handleToggleChapter(topic.id, chapter.id)}
                            className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0"
                          >
                            <button
                              className="text-slate-400 hover:text-brand-500 transition-transform active:scale-90 shrink-0"
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
                                  ? 'text-slate-600 dark:text-slate-300 font-medium line-through decoration-emerald-500/70'
                                  : 'text-slate-800 dark:text-slate-100 font-semibold'
                              }`}
                            >
                              {chapter.title}
                            </span>
                            {chapter.isCompleted && (
                              <span className="hidden sm:inline-flex items-center text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full shrink-0">
                                Done
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteChapter(topic.id, chapter.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded transition-all shrink-0 ml-2"
                            title="Remove Chapter"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}

                    {/* Attached Google Drive Materials */}
                    {topic.materials && topic.materials.length > 0 && (
                      <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-brand-500" />
                          <span>Google Drive Linked Textbooks & Vault</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {topic.materials.map((mat) => (
                            <a
                              key={mat.id}
                              href={mat.streamUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg liquid-glass text-xs font-bold text-brand-600 dark:text-brand-300 hover:bg-brand-500/10 transition-colors border border-brand-500/20"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span className="truncate max-w-[200px]">{mat.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
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
