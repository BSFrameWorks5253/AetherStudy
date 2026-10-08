import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LiquidBackground } from './components/layout/LiquidBackground';
import { SplitWorkspace } from './components/workspace/SplitWorkspace';
import { CommunityLounge } from './components/community/CommunityLounge';
import { TestPapers } from './components/tests/TestPapers';
import { TimetableGrid } from './components/timetable/TimetableGrid';
import { TrackerTree } from './components/syllabus/TrackerTree';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('workspace');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState<boolean>(false);
  const { theme } = useTheme();
  const { isSuperAdmin, activeStandard } = useAuth();
  const isBoardExamGrade = activeStandard === '10' || activeStandard === '12' || isSuperAdmin;

  // Sync top-level tab with current browser URL path
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      if (path.startsWith('/community')) {
        setActiveTab('community');
      } else if (path.startsWith('/tests')) {
        setActiveTab('tests');
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
    if (tab !== 'community') {
      setIsMobileChatOpen(false);
    }
    if (tab === 'workspace') {
      if (!window.location.pathname.startsWith('/studyroom')) {
        window.history.pushState(null, '', '/studyroom');
      }
    } else if (tab === 'community') {
      window.history.pushState(null, '', '/community');
    } else if (tab === 'tests') {
      window.history.pushState(null, '', '/tests');
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
      case 'community':
        return `Peer Discussion Lounge • Standard ${activeStandard} Live Chat`;
      case 'tests':
        return 'Board Exam Vault • Previous Year Papers & Model Answers';
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
        isMobileChatOpen={isMobileChatOpen}
      />

      {/* Main Workspace Stage */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden relative z-10">
        {/* Universal Control Header Bar */}
        <Header title={getTitle()} isMobileChatOpen={isMobileChatOpen} />

        {/* Dynamic Active Module Container */}
        <main className={`flex-1 relative overflow-hidden min-h-0 ${activeTab === 'community' && isMobileChatOpen ? 'pb-0' : 'pb-16 md:pb-0'}`}>
          {activeTab === 'workspace' && <SplitWorkspace />}
          {activeTab === 'community' && (
            <CommunityLounge
              isMobileChatOpen={isMobileChatOpen}
              onMobileChatToggle={setIsMobileChatOpen}
            />
          )}
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
                <button
                  onClick={() => handleTabChange('workspace')}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/20 transition-all"
                >
                  Return to Subject Rooms
                </button>
              </div>
            )
          )}
          {activeTab === 'timetable' && <TimetableGrid />}
          {activeTab === 'syllabus' && <TrackerTree />}
        </main>
      </div>
      <OfflineIndicator />
    </div>
  );
};

export default App;
