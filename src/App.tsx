import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LiquidBackground } from './components/layout/LiquidBackground';
import { SplitWorkspace } from './components/workspace/SplitWorkspace';
import { TestPapers } from './components/tests/TestPapers';
import { TimetableGrid } from './components/timetable/TimetableGrid';
import { TrackerTree } from './components/syllabus/TrackerTree';
import { ExamSimulator } from './components/simulator/ExamSimulator';
import { FlashcardDeck } from './components/flashcards/FlashcardDeck';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { PWAInstallBanner } from './components/common/PWAInstallBanner';
import { PullToRefresh } from './components/common/PullToRefresh';
import { AuthRequiredGate } from './components/auth/AuthRequiredGate';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('workspace');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const { theme } = useTheme();
  const { isSuperAdmin, activeStandard, setActiveStandard, isAuthenticated } = useAuth();
  const isBoardExamGrade = activeStandard === '10' || activeStandard === '12' || activeStandard === 'ALL' || isSuperAdmin;

  // Sync top-level tab with current browser URL path
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      if (path.startsWith('/tests')) {
        setActiveTab('tests');
      } else if (path.startsWith('/simulator') || path.startsWith('/arena')) {
        setActiveTab('simulator');
      } else if (path.startsWith('/flashcards') || path.startsWith('/formulas')) {
        setActiveTab('flashcards');
      } else if (path.startsWith('/timetable')) {
        setActiveTab('timetable');
      } else if (path.startsWith('/syllabus')) {
        setActiveTab('syllabus');
      } else if (path.startsWith('/studyroom') || path === '/' || path === '') {
        setActiveTab('workspace');
        if (path === '/' || path === '') {
          window.history.replaceState(null, '', '/studyroom');
        }
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'workspace') {
      if (!window.location.pathname.startsWith('/studyroom')) {
        window.history.pushState(null, '', '/studyroom');
      }
    } else if (tab === 'tests') {
      window.history.pushState(null, '', '/tests');
    } else if (tab === 'simulator') {
      window.history.pushState(null, '', '/simulator');
    } else if (tab === 'flashcards') {
      window.history.pushState(null, '', '/flashcards');
    } else if (tab === 'timetable') {
      window.history.pushState(null, '', '/timetable');
    } else if (tab === 'syllabus') {
      window.history.pushState(null, '', '/syllabus');
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'workspace':
        return `Subject Rooms Desk • Standard ${activeStandard}`;
      case 'tests':
        return 'Board PYQs & Solutions • Maharashtra State Board HSC Commerce';
      case 'simulator':
        return 'Exam Hall Simulator • 3-Hour Timed Board Arena & Ruled Answer Sheet';
      case 'flashcards':
        return 'Formula & Adjustment Deck • Spaced Repetition (Leitner System)';
      case 'timetable':
        return 'Study Planner • Daily Timetable & Focus Blocks';
      case 'syllabus':
        return 'Curriculum Tracker • Chapters & Revision Progress';
    }
  };

  return (
    <div className={`relative flex h-[100dvh] w-screen overflow-hidden antialiased select-none ${theme}`}>
      {/* Animated Organic Liquid Background */}
      <LiquidBackground />

      {/* Primary Sidebar Navigation & Mobile Bottom Bar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Workspace Stage */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden relative z-10">
        {/* Universal Control Header Bar */}
        <Header title={getTitle()} />

        {/* Dynamic Active Module Container */}
        <PullToRefresh className="flex-1 relative min-h-0 pb-16 md:pb-0">
          <main className="h-full w-full">
            {activeTab === 'workspace' && <SplitWorkspace />}
            {activeTab === 'tests' && (
              isBoardExamGrade ? (
                <TestPapers />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
                  <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 border border-amber-200 dark:border-amber-900 shadow-sm">
                    <span className="text-2xl">🔒</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                    Board Exam Vault Restricted
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-5">
                    Previous Year Question papers are reserved exclusively for Board Examination classes (Standard 10 and Standard 12).
                    Your active profile is enrolled in <strong className="text-slate-800 dark:text-slate-200">Standard {activeStandard}</strong>.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => setActiveStandard('12')}
                      className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/20 transition-all cursor-pointer"
                    >
                      Switch to Class 12 & Enter Vault
                    </button>
                    <button
                      onClick={() => handleTabChange('workspace')}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                    >
                      Return to Subject Rooms
                    </button>
                  </div>
                </div>
              )
            )}
            {activeTab === 'simulator' && <ExamSimulator />}
            {activeTab === 'flashcards' && <FlashcardDeck />}
            {activeTab === 'timetable' && (
              isAuthenticated ? (
                <TimetableGrid />
              ) : (
                <AuthRequiredGate
                  feature="timetable"
                  onContinueAsGuest={() => handleTabChange('workspace')}
                />
              )
            )}
            {activeTab === 'syllabus' && (
              isAuthenticated ? (
                <TrackerTree />
              ) : (
                <AuthRequiredGate
                  feature="syllabus"
                  onContinueAsGuest={() => handleTabChange('workspace')}
                />
              )
            )}
          </main>
        </PullToRefresh>
      </div>
      <OfflineIndicator />
      <PWAInstallBanner />
    </div>
  );
};

export default App;
