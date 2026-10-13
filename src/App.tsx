import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LiquidBackground } from './components/layout/LiquidBackground';
import { HomeScreen } from './components/home/HomeScreen';
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
import { getSubjectSlug } from './components/workspace/SubjectRooms';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
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
      } else if (path.startsWith('/studyroom')) {
        setActiveTab('workspace');
      } else if (path.startsWith('/home') || path === '/' || path === '') {
        setActiveTab('home');
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

  const [activeSubjectRoom, setActiveSubjectRoom] = useState<string | null>(null);

  const handleTabChange = (tab: ActiveTab, subjectOverride?: string, docOverride?: string) => {
    if (subjectOverride && tab === 'workspace') {
      const slug = getSubjectSlug(subjectOverride);
      setActiveSubjectRoom(subjectOverride);
      try {
        sessionStorage.setItem('aether_initial_room', subjectOverride);
        if (docOverride) {
          sessionStorage.setItem('aether_initial_doc', docOverride);
        } else {
          sessionStorage.removeItem('aether_initial_doc');
        }
        window.dispatchEvent(
          new CustomEvent('aether_switch_room', {
            detail: { subject: subjectOverride, doc: docOverride, slug },
          })
        );
      } catch {}

      const targetUrl = docOverride
        ? `/studyroom/${slug}/${encodeURIComponent(docOverride)}`
        : `/studyroom/${slug}`;
      window.history.pushState(null, '', targetUrl);
    } else if (tab === 'workspace') {
      setActiveSubjectRoom(null);
      if (!window.location.pathname.startsWith('/studyroom')) {
        window.history.pushState(null, '', '/studyroom');
      }
    } else {
      setActiveSubjectRoom(null);
      if (tab === 'home') {
        if (window.location.pathname !== '/' && window.location.pathname !== '/home') {
          window.history.pushState(null, '', '/home');
        }
      } else if (tab === 'tests') {
        window.history.pushState(null, '', '/tests');
      } else if (tab === 'timetable') {
        window.history.pushState(null, '', '/timetable');
      } else if (tab === 'syllabus') {
        window.history.pushState(null, '', '/syllabus');
      }
    }

    setActiveTab(tab);
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'home':
        return 'AetherStudy • HSC Class 12 Commerce Command Center';
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
        <PullToRefresh className="flex-1 relative min-h-0 h-full">
          <main className="h-full w-full">
            {activeTab === 'home' && (
              <HomeScreen
                onNavigate={handleTabChange}
                onOpenPaperRequestModal={() => {
                  window.dispatchEvent(new CustomEvent('aether_open_paper_request'));
                }}
              />
            )}
            {activeTab === 'workspace' && (
              <SplitWorkspace
                initialSubject={activeSubjectRoom}
                onClearSubject={() => setActiveSubjectRoom(null)}
              />
            )}
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
