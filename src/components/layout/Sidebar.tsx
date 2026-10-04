import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Bot,
  Layers,
  Brain,
  CheckSquare,
  CalendarDays,
  Timer,
  BarChart3,
  User,
  LogOut,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavigationItem =
  | 'dashboard'
  | 'notes'
  | 'ai'
  | 'flashcards'
  | 'quizzes'
  | 'tasks'
  | 'planner'
  | 'focus'
  | 'analytics'
  | 'profile';

interface SidebarProps {
  currentView: NavigationItem;
  onNavigate: (view: NavigationItem) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpen,
  onCloseMobile,
  collapsed,
  onToggleCollapse,
}) => {
  const { user, logout } = useAuth();

  const navItems: { id: NavigationItem; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5 shrink-0" /> },
    { id: 'notes', label: 'Notes', icon: <BookOpen className="w-5 h-5 shrink-0" /> },
    {
      id: 'ai',
      label: 'Study AI',
      icon: <Bot className="w-5 h-5 shrink-0 text-indigo-400" />,
      badge: 'AI',
    },
    { id: 'flashcards', label: 'Flashcards', icon: <Layers className="w-5 h-5 shrink-0" /> },
    { id: 'quizzes', label: 'Quizzes', icon: <Brain className="w-5 h-5 shrink-0" /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-5 h-5 shrink-0" /> },
    { id: 'planner', label: 'Planner', icon: <CalendarDays className="w-5 h-5 shrink-0" /> },
    { id: 'focus', label: 'Focus Mode', icon: <Timer className="w-5 h-5 shrink-0" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5 shrink-0" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5 shrink-0" /> },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar element */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand / Logo */}
        <div style={{ fontFamily: 'Georgia' }} className="h-16 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800/80 shrink-0">
          <div
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-1.5">
                  StudySync
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    PRO
                  </span>
                </span>
                <span className="text-[10px] font-medium text-zinc-500">AI Academic Workspace</span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <nav style={{ fontFamily: 'Georgia' }} className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 relative group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}

                {!collapsed && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}

                {!collapsed && item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Tooltip for collapsed mode */}
                {collapsed && (
                  <span className="fixed left-20 ml-2 px-2.5 py-1 bg-zinc-900 text-white text-xs rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-zinc-800">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom User Area */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800/80 shrink-0">
          <div
            onClick={() => onNavigate('profile')}
            className={`flex items-center gap-3 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/60 cursor-pointer hover:border-indigo-500/40 transition-colors ${
              collapsed ? 'justify-center p-2' : ''
            }`}
          >
            <img
              src={user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Student'}
              alt={user?.name || 'User'}
              className="w-8 h-8 rounded-full object-cover bg-zinc-800 shrink-0 ring-1 ring-zinc-300 dark:ring-zinc-700"
            />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {user?.name}
                </p>
                <p className="text-[11px] text-zinc-500 truncate">{user?.course || user?.email}</p>
              </div>
            )}
            {!collapsed && (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate('profile');
                  }}
                  className="p-1.5 text-zinc-400 hover:text-indigo-500 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                  title="Profile & Settings"
                >
                  <User className="w-4 h-4" />
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await logout();
                  }}
                  className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
