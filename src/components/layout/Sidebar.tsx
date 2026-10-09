import React, { useState } from 'react';
import {
  BookOpen,
  FileCheck2,
  CalendarDays,
  ListTodo,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LogIn,
  Lock,
  Sparkles,
  Printer,
} from 'lucide-react';
import { AetherLogo } from '../common/AetherLogo';
import { useAuth } from '../../context/AuthContext';
import { RevisionExporterModal } from '../common/RevisionExporterModal';

export type ActiveTab = 'workspace' | 'tests' | 'timetable' | 'syllabus';

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
  const { currentUser, isAuthenticated, isSuperAdmin, activeStandard, logout, openAuthModal } = useAuth();
  const [showDossierModal, setShowDossierModal] = useState<boolean>(false);
  const isBoardExamGrade = activeStandard === '10' || activeStandard === '12' || activeStandard === 'ALL' || isSuperAdmin;

  const navItems = [
    {
      id: 'workspace' as ActiveTab,
      label: 'Study Desk',
      mobileLabel: 'Desk',
      description: 'Subject Rooms & PDFs',
      icon: BookOpen,
    },
    ...(isBoardExamGrade
      ? [
          {
            id: 'tests' as ActiveTab,
            label: 'Board PYQs',
            mobileLabel: 'PYQs',
            description: 'Question Papers & Keys',
            icon: FileCheck2,
          },
        ]
      : []),
    {
      id: 'timetable' as ActiveTab,
      label: 'Academic Schedule',
      mobileLabel: 'Planner',
      description: 'Timetable & Focus Blocks',
      icon: CalendarDays,
    },
    {
      id: 'syllabus' as ActiveTab,
      label: 'Curriculum Mastery',
      mobileLabel: 'Syllabus',
      description: 'Chapters & Progress',
      icon: ListTodo,
    },
  ];

  return (
    <>
      {/* Desktop / Tablet Left Apple Frosted Rail */}
      <aside
        className={`hidden md:flex h-full ios-glass border-r border-black/[0.06] dark:border-white/[0.08] flex-col justify-between transition-all duration-300 select-none z-30 ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div>
          {/* Header Brand */}
          <div className="flex items-center justify-between p-4 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div className="flex items-center space-x-3 overflow-hidden">
              <AetherLogo size={isCollapsed ? 'sm' : 'md'} animated />
              {!isCollapsed && (
                <div className="truncate">
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                    AetherStudy
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/20">
                      Std {activeStandard}
                    </span>
                  </h1>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-tight mt-0.5">
                    Maharashtra State Board
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
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
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center rounded-2xl transition-all duration-200 ios-pill ${
                    isCollapsed ? 'justify-center p-3.5' : 'px-4 py-3 space-x-3.5'
                  } ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] font-medium'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  />
                  {!isCollapsed && (
                    <div className="text-left truncate flex-1">
                      <div className="text-xs font-semibold tracking-tight leading-tight flex items-center justify-between">
                        <span className="truncate">{item.label}</span>
                        {(item.id === 'timetable' || item.id === 'syllabus') && !isAuthenticated && (
                          <span className="text-[10px] text-amber-500 shrink-0 ml-1.5" title="Student Sign In Required">
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-[10px] mt-0.5 font-normal ${
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
        <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.08] space-y-2">
          {isAuthenticated && currentUser && (
            <div
              className={`p-2 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] flex items-center ${
                isCollapsed ? 'justify-center' : 'justify-between'
              }`}
            >
              {!isCollapsed ? (
                <>
                  <div className="flex items-center space-x-2 truncate min-w-0 mr-1.5">
                    <div className="w-8 h-8 rounded-xl bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {currentUser.email.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {currentUser.email.split('@')[0]}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize truncate">
                        {isSuperAdmin
                          ? 'Administrator'
                          : currentUser.role === 'ADMIN'
                          ? 'Faculty Admin'
                          : `Class ${activeStandard}`}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Log out of AetherStudy? You can return anytime.')) {
                        logout();
                      }
                    }}
                    className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Log out of AetherStudy? You can return anytime.')) {
                      logout();
                    }
                  }}
                  className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {!isAuthenticated && (
            <button
              type="button"
              onClick={openAuthModal}
              className={`w-full p-2.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white flex items-center shadow-md shadow-brand-500/20 text-xs font-bold transition-all ios-pill cursor-pointer ${
                isCollapsed ? 'justify-center' : 'justify-between'
              }`}
              title="Sign In / Register Student Account"
            >
              <div className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                {!isCollapsed && <span>Student Sign In</span>}
              </div>
              {!isCollapsed && <Sparkles className="w-3.5 h-3.5" />}
            </button>
          )}

          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setShowDossierModal(true)}
              className="w-full p-2.5 rounded-2xl bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 flex items-center justify-between text-xs font-bold text-brand-600 dark:text-brand-300 transition-all ios-pill cursor-pointer"
              title="Generate 1-Click Printable Last Minute Revision Sheet"
            >
              <div className="flex items-center gap-2">
                <Printer className="w-3.5 h-3.5" />
                <span>Revision Dossier (LMR)</span>
              </div>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}

          {!isCollapsed && (
            <div className="p-2.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center space-x-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Cloud Vault Connected</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            {!isCollapsed ? <span>HSC Board Commerce</span> : <span>XII</span>}
          </div>
        </div>
      </aside>

      {/* 1-Click Printable Revision Dossier Modal */}
      <RevisionExporterModal
        isOpen={showDossierModal}
        onClose={() => setShowDossierModal(false)}
      />

      {/* Mobile Apple Floating Spatial Dock (< 768px viewports) */}
      <nav
        className="md:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 z-40 ios-glass rounded-[28px] border border-black/[0.08] dark:border-white/[0.1] px-2 py-1.5 flex justify-around items-center shadow-2xl transition-all"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all ios-pill ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <div
                className={`p-1.5 rounded-2xl transition-all ${
                  isActive ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 scale-105' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight flex items-center justify-center gap-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
                <span>{item.mobileLabel}</span>
                {(item.id === 'timetable' || item.id === 'syllabus') && !isAuthenticated && (
                  <Lock className="w-2.5 h-2.5 text-amber-500" />
                )}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
export default Sidebar;
