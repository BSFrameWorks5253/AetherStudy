import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Shuffle,
  BookOpen,
  Award,
} from 'lucide-react';

export interface Flashcard {
  id: string;
  subject: 'Accounts' | 'Economics' | 'Mathematics' | 'OCM' | 'SP';
  topic: string;
  front: string; // Question or Adjustment
  back: string;  // Solution, Rule or Formula
  tip?: string;  // Board Exam Moderator Exam Tip
  box: 1 | 2 | 3; // Leitner Box: 1 = Learning, 2 = Reviewing, 3 = Mastered
}

const DEFAULT_CARDS: Flashcard[] = [
  // =================== ACCOUNTS (BOOK-KEEPING) ===================
  {
    id: 'fc-bk-1',
    subject: 'Accounts',
    topic: 'Partnership Final Accounts',
    front: 'What are the rules under Indian Partnership Act, 1932 in the ABSENCE of a Partnership Deed?',
    back: '1. Profit/Loss shared EQUALLY.\n2. Interest on Partner\'s Loan allowed @ 6% p.a.\n3. NO interest allowed on Capital.\n4. NO interest charged on Drawings.\n5. NO salary or commission to any partner.',
    tip: 'Extremely common 1-mark objective and case study question in Board exams.',
    box: 1,
  },
  {
    id: 'fc-bk-2',
    subject: 'Accounts',
    topic: 'Adjustments in Final Accounts',
    front: 'Two-fold effect for: "Prepaid / Unexpired Expenses"',
    back: '1. Deduct from respective expense in Trading or P&L Account.\n2. Show on ASSETS side of Balance Sheet.',
    tip: 'Remember: Prepaid = Asset (benefit yet to be received in next financial year).',
    box: 1,
  },
  {
    id: 'fc-bk-3',
    subject: 'Accounts',
    topic: 'Adjustments in Final Accounts',
    front: 'Two-fold effect for: "Outstanding / Unpaid Expenses"',
    back: '1. Add to respective expense on Debit of Trading or P&L Account.\n2. Show on LIABILITIES side of Balance Sheet.',
    tip: 'Follows Accrual Concept of Accounting.',
    box: 1,
  },
  {
    id: 'fc-bk-4',
    subject: 'Accounts',
    topic: 'Adjustments in Final Accounts',
    front: 'Two-fold effect for: "Goods destroyed by Fire (Fully / Partially Insured)"',
    back: '1. Full value of goods credited to Trading Account (or deducted from purchases).\n2. Insurance Claim admitted shown on ASSETS side of Balance Sheet.\n3. Net Loss (if any) debited to Profit & Loss Account.',
    tip: 'Trading A/c = Total Cost; Asset = Claim Admitted; P&L = Net Loss.',
    box: 1,
  },
  {
    id: 'fc-bk-5',
    subject: 'Accounts',
    topic: 'Reconstitution of Partnership',
    front: 'What is the formula for "Sacrifice Ratio" and "Gaining Ratio"?',
    back: '• Sacrifice Ratio = Old Ratio - New Ratio (Used in Admission of Partner for Goodwill distribution)\n\n• Gaining Ratio = New Ratio - Old Ratio (Used in Retirement/Death of Partner for Goodwill settlement)',
    tip: 'Mnemonic: SON (Sacrifice = Old - New) vs GO (Gain = New - Old).',
    box: 1,
  },
  {
    id: 'fc-bk-6',
    subject: 'Accounts',
    topic: 'Goodwill Valuation',
    front: 'Formula for Goodwill under "Super Profit Method"',
    back: '1. Normal Profit = Capital Employed × (Normal Rate of Return / 100)\n2. Super Profit = Average Profit - Normal Profit\n3. Goodwill = Super Profit × Number of Years\' Purchase',
    tip: 'If Average Profit < Normal Profit, Super Profit is nil and Goodwill is zero.',
    box: 1,
  },
  {
    id: 'fc-bk-7',
    subject: 'Accounts',
    topic: 'Bills of Exchange',
    front: 'How are "Days of Grace" and "Due Date on Public Holiday" calculated?',
    back: '• Exactly 3 DAYS OF GRACE are added to the nominal due date.\n• If the maturity date falls on a Public Holiday (e.g., 26th Jan, 15th Aug), bill matures on the PRECEDING working day.\n• If declared an Emergency Holiday, matures on the SUCCEEDING working day.',
    tip: 'Frequently tested in Objective Fill-in-the-blanks.',
    box: 1,
  },
  {
    id: 'fc-bk-8',
    subject: 'Accounts',
    topic: 'Company Accounts - Shares',
    front: 'Journal Entry for "Forfeiture of Shares originally issued at Par"',
    back: 'Share Capital A/c (Called-up amount) .... Dr\n    To Calls-in-Arrears A/c (Unpaid amount)\n    To Share Forfeiture A/c (Amount already paid)',
    tip: 'Share Capital is always debited with CALLED-UP value, never face value if partly called.',
    box: 1,
  },
  {
    id: 'fc-bk-9',
    subject: 'Accounts',
    topic: 'Financial Statement Analysis',
    front: 'Standard Benchmarks for "Current Ratio" and "Liquid / Quick Ratio"',
    back: '• Current Ratio = Current Assets / Current Liabilities (Ideal Benchmark: 2 : 1)\n\n• Liquid / Quick Ratio = Liquid Assets / Current Liabilities (Ideal Benchmark: 1 : 1)\n*Liquid Assets = Current Assets - (Stock + Prepaid Expenses)*',
    tip: 'Do NOT subtract prepaid expenses from current liabilities, only from current assets.',
    box: 1,
  },

  // =================== ECONOMICS ===================
  {
    id: 'fc-eco-1',
    subject: 'Economics',
    topic: 'Utility Analysis',
    front: 'Statement of "Law of Diminishing Marginal Utility (DMU)" by Prof. Alfred Marshall',
    back: '"Other things remaining constant, the additional benefit which a person derives from a given increase in his stock of a thing diminishes with every increase in the stock that he already has."',
    tip: 'Must quote exact words of Alfred Marshall in Section Q.4 / Q.6 long answers.',
    box: 1,
  },
  {
    id: 'fc-eco-2',
    subject: 'Economics',
    topic: 'Elasticity of Demand',
    front: 'Formula for "Price Elasticity of Demand" (Percentage Method)',
    back: 'Ed = (% Change in Quantity Demanded) / (% Change in Price)\n\nEd = (ΔQ / ΔP) × (P / Q)\nWhere:\nΔQ = New Quantity - Old Quantity\nΔP = New Price - Old Price\nP = Original Price, Q = Original Quantity',
    tip: 'Ignore negative sign when comparing numerical coefficients of elasticity.',
    box: 1,
  },
  {
    id: 'fc-eco-3',
    subject: 'Economics',
    topic: 'Elasticity of Demand',
    front: '5 Types of Price Elasticity & Their Curve Shapes',
    back: '1. Perfectly Elastic (Ed = ∞): Horizontal line parallel to X-axis.\n2. Perfectly Inelastic (Ed = 0): Vertical line parallel to Y-axis.\n3. Unitary Elastic (Ed = 1): Rectangular Hyperbola.\n4. Relatively Elastic (Ed > 1): Flatter downward curve.\n5. Relatively Inelastic (Ed < 1): Steeper downward curve.',
    tip: 'Draw diagrams in board exams to score full 4/4 marks in distinction.',
    box: 1,
  },
  {
    id: 'fc-eco-4',
    subject: 'Economics',
    topic: 'National Income',
    front: 'Key Conversion Formulas for National Income Aggregates',
    back: '1. Gross to Net: Net = Gross - Depreciation (Consumption of Fixed Capital)\n2. Domestic to National: National = Domestic + NFIA (Net Factor Income from Abroad)\n3. Market Price to Factor Cost: Factor Cost = Market Price - Net Indirect Taxes (NIT = Indirect Taxes - Subsidies)',
    tip: 'Mnemonic: NNP at FC is the true measure of National Income.',
    box: 1,
  },
  {
    id: 'fc-eco-5',
    subject: 'Economics',
    topic: 'Public Finance',
    front: 'Difference between "Direct Tax" and "Indirect Tax"',
    back: '• Direct Tax: Impact and incidence fall on the SAME person (e.g., Personal Income Tax). Burden cannot be shifted. Progressive in nature.\n\n• Indirect Tax: Impact and incidence fall on DIFFERENT persons (e.g., GST). Burden can be shifted from seller to buyer. Regressive in nature.',
    tip: 'Standard 2-mark distinction question.',
    box: 1,
  },

  // =================== MATHEMATICS & STATS ===================
  {
    id: 'fc-mat-1',
    subject: 'Mathematics',
    topic: 'Mathematical Logic',
    front: 'Truth Values for Logical Connectives: ∧, ∨, →, ↔',
    back: '• Conjunction (p ∧ q): TRUE only when BOTH p and q are True.\n• Disjunction (p ∨ q): FALSE only when BOTH p and q are False.\n• Conditional (p → q): FALSE only when p is True and q is False (T → F = F).\n• Bi-conditional (p ↔ q): TRUE when both have SAME truth value (T↔T, F↔F = T).',
    tip: 'Remember "T → F = F", all other 3 conditional outcomes are True.',
    box: 1,
  },
  {
    id: 'fc-mat-2',
    subject: 'Mathematics',
    topic: 'Mathematical Logic',
    front: 'Negation of Implication: ~(p → q)',
    back: '~(p → q) ≡ p ∧ ~q\n\nNegation of Disjunction: ~(p ∨ q) ≡ ~p ∧ ~q (De Morgan\'s Law)\nNegation of Conjunction: ~(p ∧ q) ≡ ~p ∨ ~q (De Morgan\'s Law)',
    tip: 'Common error: Writing ~(p → q) as ~p → ~q is WRONG. It becomes p ∧ ~q.',
    box: 1,
  },
  {
    id: 'fc-mat-3',
    subject: 'Mathematics',
    topic: 'Differentiation',
    front: 'Product Rule & Quotient Rule of Derivatives',
    back: '• Product Rule: d/dx(u · v) = u · (dv/dx) + v · (du/dx)\n\n• Quotient Rule: d/dx(u / v) = [v · (du/dx) - u · (dv/dx)] / v²',
    tip: 'In Quotient Rule, remember V comes first in the numerator! [v · u\' - u · v\'] / v²',
    box: 1,
  },
  {
    id: 'fc-mat-4',
    subject: 'Mathematics',
    topic: 'Integration',
    front: 'Formula for "Integration by Parts"',
    back: '∫ (u · v) dx = u · ∫ v dx - ∫ [ (du/dx) · ∫ v dx ] dx\n\nChoice of first function \'u\' is decided by rule LIATE:\nL = Logarithmic, I = Inverse trig, A = Algebraic, T = Trigonometric, E = Exponential.',
    tip: 'Always order terms using LIATE before applying parts.',
    box: 1,
  },
  {
    id: 'fc-mat-5',
    subject: 'Mathematics',
    topic: 'Index Numbers',
    front: 'Formulas for Laspeyre\'s, Paasche\'s, and Fisher\'s Price Index Numbers',
    back: '• Laspeyre\'s: P₀₁ = [ ∑(p₁·q₀) / ∑(p₀·q₀) ] × 100 (Uses Base Year weights q₀)\n• Paasche\'s: P₀₁ = [ ∑(p₁·q₁) / ∑(p₀·q₁) ] × 100 (Uses Current Year weights q₁)\n• Fisher\'s Ideal: P₀₁ = √(L × P) = Geometric mean of Laspeyre\'s & Paasche\'s.',
    tip: 'Fisher\'s is called "Ideal" because it satisfies both Time Reversal and Factor Reversal tests.',
    box: 1,
  },

  // =================== OCM & SP ===================
  {
    id: 'fc-ocm-1',
    subject: 'OCM',
    topic: 'Principles of Management',
    front: 'Key Principles by Henri Fayol often asked in Distinction',
    back: '• Unity of Command: An employee should receive orders from ONE superior only (avoids confusion).\n• Unity of Direction: One head and one plan for a group of activities with same objective.\n• Esprit de Corps: "Union is Strength" – promotion of harmony and team spirit.',
    tip: 'Fayol gave 14 principles; F.W. Taylor gave Scientific Management.',
    box: 1,
  },
  {
    id: 'fc-sp-1',
    subject: 'SP',
    topic: 'Sources of Corporate Finance',
    front: 'Key Distinction: "Equity Shares" vs "Preference Shares"',
    back: '1. Rate of Dividend: Fluctuating on Equity; Fixed on Preference.\n2. Voting Rights: Full voting rights for Equity; No normal voting rights for Preference.\n3. Repayment of Capital: Equity repaid LAST at liquidation; Preference has priority over equity.\n4. Risk: Equity carries highest risk; Preference carries lower risk.',
    tip: 'Must write at least 4 distinct points to score full 4 marks in Distinction question.',
    box: 1,
  },
];

export const FlashcardDeck: React.FC = () => {
  const [cards, setCards] = useState<Flashcard[]>(() => {
    try {
      const saved = localStorage.getItem('aether_flashcards_deck');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_CARDS;
  });

  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newCard, setNewCard] = useState<{
    subject: 'Accounts' | 'Economics' | 'Mathematics' | 'OCM' | 'SP';
    topic: string;
    front: string;
    back: string;
    tip: string;
  }>({
    subject: 'Accounts',
    topic: '',
    front: '',
    back: '',
    tip: '',
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aether_flashcards_deck', JSON.stringify(cards));
    } catch {}
  }, [cards]);

  const filteredCards = useMemo(() => {
    if (selectedSubject === 'All') return cards;
    return cards.filter((c) => c.subject.toLowerCase() === selectedSubject.toLowerCase());
  }, [cards, selectedSubject]);

  // Reset index when filter changes
  useEffect(() => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
  }, [selectedSubject]);

  const activeCard = filteredCards[currentCardIndex] || filteredCards[0];

  // Stats
  const masteredCount = cards.filter((c) => c.box === 3).length;
  const learningCount = cards.filter((c) => c.box === 1).length;
  const reviewCount = cards.filter((c) => c.box === 2).length;
  const masteryPercentage = Math.round((masteredCount / (cards.length || 1)) * 100);

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % filteredCards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    setCards((prev) => [...prev].sort(() => Math.random() - 0.5));
    setCurrentCardIndex(0);
  };

  const handleMarkBox = (cardId: string, targetBox: 1 | 2 | 3) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, box: targetBox } : c))
    );
    handleNext();
  };

  const handleAddCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCard.front.trim() || !newCard.back.trim()) return;

    const created: Flashcard = {
      id: `fc-custom-${Date.now()}`,
      subject: newCard.subject,
      topic: newCard.topic.trim() || 'Custom Formula',
      front: newCard.front.trim(),
      back: newCard.back.trim(),
      tip: newCard.tip.trim() || undefined,
      box: 1,
    };

    setCards((prev) => [created, ...prev]);
    setNewCard({ subject: 'Accounts', topic: '', front: '', back: '', tip: '' });
    setShowAddModal(false);
  };

  const handleDeleteCard = (cardId: string) => {
    if (window.confirm('Delete this flashcard from your deck?')) {
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      if (currentCardIndex >= filteredCards.length - 1) {
        setCurrentCardIndex(Math.max(0, filteredCards.length - 2));
      }
    }
  };

  const handleResetDeck = () => {
    if (window.confirm('Reset deck back to default Maharashtra Board flashcards?')) {
      setCards(DEFAULT_CARDS);
      localStorage.removeItem('aether_flashcards_deck');
      setCurrentCardIndex(0);
      setIsFlipped(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full select-none">
      {/* Top Header & Mastery Metric */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Spaced Repetition & Active Recall</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Formula & Ledger Rule Deck
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Master high-yield accounting adjustments, economics laws, and mathematical formulas with the Leitner 3-Box system.
          </p>
        </div>

        {/* Global Mastery Pill */}
        <div className="flex items-center gap-3 ios-glass p-3 rounded-[22px] border border-black/[0.06] dark:border-white/[0.08] shadow-xs shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm">
            {masteryPercentage}%
          </div>
          <div className="text-xs">
            <div className="font-bold text-slate-900 dark:text-white">
              {masteredCount} of {cards.length} Mastered
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="text-rose-500 font-semibold">{learningCount} Learning</span>
              <span>•</span>
              <span className="text-amber-500 font-semibold">{reviewCount} Review</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Filter Bar & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 shrink-0">
        <div className="flex items-center space-x-1.5 p-1.5 ios-glass border border-black/[0.06] dark:border-white/[0.08] rounded-full overflow-x-auto no-scrollbar shadow-xs">
          {['All', 'Accounts', 'Economics', 'Mathematics', 'OCM', 'SP'].map((sub) => {
            const isSelected = selectedSubject.toLowerCase() === sub.toLowerCase();
            return (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ios-pill cursor-pointer ${
                  isSelected
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShuffle}
            className="p-2.5 rounded-full ios-glass border border-black/[0.06] dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-all ios-pill cursor-pointer"
            title="Shuffle Deck"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-500/25 transition-all ios-pill cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Card</span>
          </button>
        </div>
      </div>

      {/* Main Flashcard Interactive Stage */}
      {filteredCards.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center ios-glass rounded-[28px] border border-black/[0.06] dark:border-white/[0.08] my-auto">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Flashcards in this Category</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
            Create your own study cards for this subject or switch to &apos;All&apos; to view pre-loaded board exam cards.
          </p>
          <button
            onClick={() => setSelectedSubject('All')}
            className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-full text-xs font-bold ios-pill cursor-pointer"
          >
            View All Cards
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between max-w-2xl mx-auto w-full my-auto space-y-6">
          {/* Card Counter & Box Indicator */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-2">
            <span className="font-mono font-semibold">
              Card {currentCardIndex + 1} of {filteredCards.length}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  activeCard.box === 3
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : activeCard.box === 2
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                }`}
              >
                {activeCard.box === 3 ? 'Box 3: Mastered' : activeCard.box === 2 ? 'Box 2: Review' : 'Box 1: Learning'}
              </span>
              <button
                onClick={() => handleDeleteCard(activeCard.id)}
                className="p-1 hover:text-rose-500 transition-colors cursor-pointer"
                title="Delete Card"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* The Flip Card Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="relative min-h-[320px] sm:min-h-[360px] p-8 rounded-[32px] ios-glass border border-black/[0.08] dark:border-white/[0.12] shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between group overflow-hidden active:scale-[0.99]"
          >
            {/* Subject & Topic Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/20">
                  {activeCard.subject}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[220px]">
                  {activeCard.topic}
                </span>
              </div>
              <span className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold flex items-center gap-1 group-hover:scale-105 transition-transform">
                <RotateCw className="w-3 h-3" />
                <span>{isFlipped ? 'Show Front' : 'Tap to Flip'}</span>
              </span>
            </div>

            {/* Card Content Body */}
            <div className="my-auto py-6">
              {!isFlipped ? (
                /* FRONT: QUESTION */
                <div className="space-y-3">
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500">
                    Question / Adjustment Rule
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                    {activeCard.front}
                  </h2>
                </div>
              ) : (
                /* BACK: ANSWER / FORMULA */
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400">
                    Solution / Ledger Formula
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed whitespace-pre-line font-sans">
                    {activeCard.back}
                  </div>
                  {activeCard.tip && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 leading-snug flex items-start gap-2">
                      <Award className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Board Moderator Tip:</span> {activeCard.tip}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Tap Prompt */}
            <div className="text-center pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                {isFlipped ? 'Evaluate your recall below' : 'Click anywhere on card to reveal answer'}
              </span>
            </div>
          </div>

          {/* Leitner Evaluation Controls */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleMarkBox(activeCard.id, 1)}
              className="py-3 px-3 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold transition-all ios-pill cursor-pointer flex items-center justify-center gap-1.5"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Need Review</span>
            </button>

            <button
              onClick={() => handleMarkBox(activeCard.id, 2)}
              className="py-3 px-3 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold transition-all ios-pill cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCw className="w-4 h-4" />
              <span>Partially Know</span>
            </button>

            <button
              onClick={() => handleMarkBox(activeCard.id, 3)}
              className="py-3 px-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/25 text-xs font-bold transition-all ios-pill cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mastered!</span>
            </button>
          </div>

          {/* Next / Previous Navigator */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handlePrev}
              className="px-4 py-2 rounded-full ios-glass border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer ios-pill"
            >
              ← Previous Card
            </button>

            <button
              onClick={handleResetDeck}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline cursor-pointer"
            >
              Reset to Defaults
            </button>

            <button
              onClick={handleNext}
              className="px-4 py-2 rounded-full ios-glass border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer ios-pill"
            >
              Next Card →
            </button>
          </div>
        </div>
      )}

      {/* Add Custom Flashcard Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="ios-glass border border-black/[0.08] dark:border-white/[0.12] rounded-[28px] max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-slate-900 dark:text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-300 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold">Create Study Flashcard</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCardSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 block">Subject</label>
                  <select
                    value={newCard.subject}
                    onChange={(e) => setNewCard({ ...newCard, subject: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] text-xs font-semibold focus:outline-hidden"
                  >
                    <option value="Accounts">Accounts</option>
                    <option value="Economics">Economics</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="OCM">OCM</option>
                    <option value="SP">SP</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 block">Topic / Chapter</label>
                  <input
                    type="text"
                    required
                    value={newCard.topic}
                    onChange={(e) => setNewCard({ ...newCard, topic: e.target.value })}
                    placeholder="e.g. Bills of Exchange"
                    className="w-full px-3 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] text-xs font-semibold focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 block">Front: Question / Adjustment</label>
                <textarea
                  required
                  rows={2}
                  value={newCard.front}
                  onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                  placeholder="e.g. What is the journal entry for renewal of bill with interest?"
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] text-xs font-semibold focus:outline-hidden resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 block">Back: Answer / Rule / Formula</label>
                <textarea
                  required
                  rows={3}
                  value={newCard.back}
                  onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                  placeholder="Enter the full solution or adjustment rules..."
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] text-xs font-semibold focus:outline-hidden resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 block">Board Exam Tip (Optional)</label>
                <input
                  type="text"
                  value={newCard.tip}
                  onChange={(e) => setNewCard({ ...newCard, tip: e.target.value })}
                  placeholder="e.g. Common mistake: forgetting 3 days of grace"
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] text-xs font-semibold focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 rounded-full cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white rounded-full shadow-md ios-pill cursor-pointer"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
