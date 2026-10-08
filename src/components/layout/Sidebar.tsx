import React from 'react';
import {
  Columns,
  Calendar,
  FolderTree,
  BookOpen,
  Sparkles,
  Server,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

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
  const navItems = [
    {
      id: 'workspace' as ActiveTab,
      label: 'Study Workbench',
      mobileLabel: 'Workbench',
      description: 'Server PDF & Notes',
      icon: Columns,
    },
    {
      id: 'tests' as ActiveTab,
      label: 'PYQ & Test Vault',
      mobileLabel: 'PYQ Tests',
      description: 'Exam Papers & Solutions',
      icon: BookOpen,
    },
    {
      id: 'timetable' as ActiveTab,
      label: 'Academic Timetable',
      mobileLabel: 'Schedule',
      description: 'Schedule & Timers',
      icon: Calendar,
    },
    {
      id: 'syllabus' as ActiveTab,
      label: 'Syllabus Tracker',
      mobileLabel: 'Syllabus',
      description: 'Mastery & Stats',
      icon: FolderTree,
    },
  ];

  return (
    <>
      {/* Desktop/Tablet Left Sidebar (Hidden on mobile) */}
      <aside
        className={`hidden md:flex h-full liquid-glass border-r border-white/50 dark:border-white/10 flex-col justify-between transition-all duration-300 select-none z-30 shadow-lg ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div>
          <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/10">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-accent-cyan flex items-center justify-center text-white shadow-xl shadow-brand-500/30 shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-none flex items-center gap-1.5">
                    AetherStudy
                    <span className="text-[10px] bg-brand-500/15 text-brand-600 dark:text-brand-300 font-mono px-2 py-0.5 rounded-full border border-brand-500/30">
                      SUITE
                    </span>
                  </h1>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Liquid Glass Engine</p>
                </div>
              )}
            </div>

            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800 transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <nav className="p-3 space-y-1.5 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center rounded-2xl transition-all duration-200 ${
                    isCollapsed ? 'justify-center p-3.5' : 'px-4 py-3 space-x-3.5'
                  } ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30 font-bold glass-pill'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40 font-semibold'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  {!isCollapsed && (
                    <div className="text-left truncate">
                      <div className="text-xs">{item.label}</div>
                      <div className={`text-[10px] ${isActive ? 'text-brand-100' : 'text-slate-400 dark:text-slate-500'}`}>
                        {item.description}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-black/5 dark:border-white/10 space-y-2.5">
          {!isCollapsed && (
            <div className="p-3.5 rounded-2xl liquid-glass-subtle border border-white/60 dark:border-white/10 shadow-sm">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                <Server className="w-3.5 h-3.5" />
                <span>Server Storage Active</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Files and data saved directly to the backend storage filesystem.
              </p>
            </div>
          )}

          <div className="flex items-center justify-center text-[10px] text-slate-400 font-mono">
            {!isCollapsed ? (
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                Desktop & Mobile Parity
              </span>
            ) : (
              <span>v1.0</span>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Liquid Glass Navigation Bar (< 768px viewports) */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 z-40 liquid-glass border-t border-white/40 dark:border-white/10 px-3 py-2 justify-around shadow-2xl backdrop-blur-3xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-brand-500/15' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">
                {item.mobileLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
