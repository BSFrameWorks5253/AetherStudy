import React from 'react';
import {
  BookOpen,
  FileCheck2,
  CalendarDays,
  ListTodo,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  MessageSquare,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type ActiveTab = 'workspace' | 'community' | 'tests' | 'timetable' | 'syllabus';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { currentUser, isAuthenticated, isSuperAdmin, activeStandard, logout } = useAuth();
  const isBoardExamGrade = activeStandard === '10' || activeStandard === '12' || isSuperAdmin;

  const navItems = [
    {
      id: 'workspace' as ActiveTab,
      label: 'Study Desk',
      mobileLabel: 'Study Desk',
      description: 'Subject Rooms & PDFs',
      icon: BookOpen,
    },
    {
      id: 'community' as ActiveTab,
      label: 'Peer Lounge',
      mobileLabel: 'Peer Chat',
      description: `Std ${activeStandard} Live Chat`,
      icon: MessageSquare,
    },
    ...(isBoardExamGrade
      ? [
          {
            id: 'tests' as ActiveTab,
            label: 'Exam Vault (PYQs)',
            mobileLabel: 'PYQs & Tests',
            description: 'Board Papers & Solutions',
            icon: FileCheck2,
          },
        ]
      : []),
    {
      id: 'timetable' as ActiveTab,
      label: 'Study Timetable',
      mobileLabel: 'Timetable',
      description: 'Schedule & Timer',
      icon: CalendarDays,
    },
    {
      id: 'syllabus' as ActiveTab,
      label: 'Curriculum Tracker',
      mobileLabel: 'Syllabus',
      description: 'Chapters & Revision',
      icon: ListTodo,
    },
  ];

  return (
    <>
      {/* Desktop/Tablet Left Sidebar (Hidden on mobile) */}
      <aside
        className={`hidden md:flex h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col justify-between transition-all duration-300 select-none z-30 shadow-sm ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div>
          {/* Header Brand */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20 shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-none flex items-center gap-1.5">
                    AetherStudy
                    <span className="text-[10px] bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 font-semibold px-2 py-0.5 rounded-full border border-brand-200 dark:border-brand-800">
                      Std {activeStandard}
                    </span>
                  </h1>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    {activeStandard === '12'
                      ? 'Higher Secondary • HSC'
                      : activeStandard === '10'
                      ? 'Secondary Board • SSC'
                      : activeStandard === '11'
                      ? 'Junior College • FYJC'
                      : 'Foundation Curriculum'}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center rounded-2xl transition-all duration-150 ${
                    isCollapsed ? 'justify-center p-3.5' : 'px-4 py-3 space-x-3.5'
                  } ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 font-medium'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  />
                  {!isCollapsed && (
                    <div className="text-left truncate">
                      <div className="text-xs font-semibold leading-tight">{item.label}</div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          isActive ? 'text-brand-100' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {item.description}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Status & User Account Controls */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          {/* User Account & Logout Control */}
          {isAuthenticated && currentUser && (
            <div
              className={`p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center ${
                isCollapsed ? 'justify-center' : 'justify-between'
              }`}
            >
              {!isCollapsed ? (
                <>
                  <div className="flex items-center space-x-2 truncate min-w-0 mr-1.5">
                    <div className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {currentUser.email.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {currentUser.email.split('@')[0]}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize truncate">
                        {isSuperAdmin
                          ? 'Owner'
                          : currentUser.role === 'ADMIN'
                          ? 'Admin'
                          : `Class ${activeStandard}`}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (window.confirm('Log out of AetherStudy? You can log back in anytime.')) {
                        logout();
                      }
                    }}
                    className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    if (window.confirm('Log out of AetherStudy? You can log back in anytime.')) {
                      logout();
                    }
                  }}
                  className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {!isCollapsed && (
            <div className="p-2.5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-800/50">
              <div className="flex items-center space-x-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>Notes & Progress Synced</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            {!isCollapsed ? <span>HSC Maharashtra Board</span> : <span>XII</span>}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (< 768px viewports) */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 justify-around shadow-xl backdrop-blur-md">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">
                {item.mobileLabel}
              </span>
            </button>
          );
        })}

        {/* Mobile Sign Out Button */}
        {isAuthenticated && (
          <button
            onClick={() => {
              if (window.confirm('Log out of AetherStudy? You can log back in anytime.')) {
                logout();
              }
            }}
            className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-rose-500 hover:text-rose-700 transition-all"
            title="Sign Out"
          >
            <div className="p-1 rounded-xl">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">
              Log Out
            </span>
          </button>
        )}
      </nav>
    </>
  );
};
export default Sidebar;
