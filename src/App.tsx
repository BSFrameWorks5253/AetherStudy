import React, { useState } from 'react';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LiquidBackground } from './components/layout/LiquidBackground';
import { SplitWorkspace } from './components/workspace/SplitWorkspace';
import { TestPapers } from './components/tests/TestPapers';
import { TimetableGrid } from './components/timetable/TimetableGrid';
import { TrackerTree } from './components/syllabus/TrackerTree';
import { AuthModal } from './components/auth/AuthModal';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('workspace');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();

  // STEP 5 GUARD: If unauthenticated, render the secure AuthModal exclusively
  if (!isAuthenticated) {
    return (
      <div className={`relative flex h-screen w-screen items-center justify-center overflow-hidden antialiased select-none ${theme}`}>
        <LiquidBackground />
        <AuthModal isOpen={true} isGuardMode={true} />
      </div>
    );
  }

  const getTitle = () => {
    switch (activeTab) {
      case 'workspace':
        return 'Study Workbench — PDF Streaming & Markdown Workspace';
      case 'tests':
        return 'PYQ & Exam Test Vault — Question Papers & Solutions';
      case 'timetable':
        return 'Academic Timetable & Study Schedule';
      case 'syllabus':
        return 'Syllabus Tracker & Mastery Metrics';
    }
  };

  return (
    <div className={`relative flex h-screen w-screen overflow-hidden antialiased select-none ${theme}`}>
      {/* Animated Organic Liquid Background */}
      <LiquidBackground />

      {/* Primary Sidebar Navigation & Mobile Bottom Bar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Workspace Stage */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden relative z-10">
        {/* Universal Control Header Bar */}
        <Header title={getTitle()} />

        {/* Dynamic Active Module Container */}
        <main className="flex-1 relative overflow-hidden pb-16 md:pb-0">
          {activeTab === 'workspace' && <SplitWorkspace />}
          {activeTab === 'tests' && <TestPapers />}
          {activeTab === 'timetable' && <TimetableGrid />}
          {activeTab === 'syllabus' && <TrackerTree />}
        </main>
      </div>
    </div>
  );
};

export default App;
