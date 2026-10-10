import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LiquidBackground } from './components/layout/LiquidBackground';
import { SplitWorkspace } from './components/workspace/SplitWorkspace';
import { TestPapers } from './components/tests/TestPapers';
import { TimetableGrid } from './components/timetable/TimetableGrid';
import { TrackerTree } from './components/syllabus/TrackerTree';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { PWAInstallBanner } from './components/common/PWAInstallBanner';
import { PullToRefresh } from './components/common/PullToRefresh';
import { AuthRequiredGate } from './components/auth/AuthRequiredGate';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { InAppNotificationToast } from './components/notifications/InAppNotificationToast';
import { api } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('workspace');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();

  // Sync top-level tab with current browser URL path
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      if (path.startsWith('/tests')) {
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

  // Proactively synchronize any local notes to Cloud Storage & Google Drive on startup
  useEffect(() => {
    api.syncLocalDocumentsToCloud().catch(() => {});
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'workspace') {
      if (!window.location.pathname.startsWith('/studyroom')) {
        window.history.pushState(null, '', '/studyroom');
      }
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
        return 'HSC Subject Rooms • Class 12 Commerce';
      case 'tests':
        return 'Board PYQs & Solutions • Maharashtra State Board HSC Commerce';
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
        <PullToRefresh className="flex-1 relative min-h-0 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
          <main className="h-full w-full">
            {activeTab === 'workspace' && <SplitWorkspace />}
            {activeTab === 'tests' && <TestPapers />}
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
      <InAppNotificationToast />
    </div>
  );
};

export default App;
