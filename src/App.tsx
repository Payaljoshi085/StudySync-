import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

// Layout
import { Sidebar, NavigationItem } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { NotesView } from './components/notes/NotesView';
import { StudyAIView } from './components/ai/StudyAIView';
import { FlashcardsView } from './components/flashcards/FlashcardsView';
import { QuizzesView } from './components/quizzes/QuizzesView';
import { TasksView } from './components/tasks/TasksView';
import { PlannerView } from './components/planner/PlannerView';
import { FocusView } from './components/focus/FocusView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { ProfileView } from './components/profile/ProfileView';
import { AuthView } from './components/auth/AuthView';

function AppContent() {
  const { user, loading } = useAuth();

  // Authenticated Workspace State
  const [currentView, setCurrentView] = useState<NavigationItem>('dashboard');
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isSidebarCollapsedDesktop, setIsSidebarCollapsedDesktop] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Context passing between views
  const [targetNoteId, setTargetNoteId] = useState<string | null>(null);
  const [targetTaskId, setTargetTaskId] = useState<string | null>(null);
  const [targetDeckId, setTargetDeckId] = useState<string | null>(null);
  const [targetQuizId, setTargetQuizId] = useState<string | null>(null);
  const [openCreateTaskModal, setOpenCreateTaskModal] = useState(false);

  // Global Keyboard Shortcut: ⌘K or Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (view: string, itemId?: string) => {
    // Reset specific contexts unless specified
    if (view === 'notes') {
      if (itemId) setTargetNoteId(itemId);
      setCurrentView('notes');
    } else if (view === 'ai') {
      if (itemId) setTargetNoteId(itemId);
      setCurrentView('ai');
    } else if (view === 'flashcards') {
      if (itemId) setTargetDeckId(itemId);
      setCurrentView('flashcards');
    } else if (view === 'quizzes') {
      if (itemId) setTargetQuizId(itemId);
      setCurrentView('quizzes');
    } else if (view === 'tasks') {
      if (itemId) setTargetTaskId(itemId);
      setCurrentView('tasks');
    } else if (
      [
        'dashboard',
        'planner',
        'focus',
        'analytics',
        'profile',
      ].includes(view)
    ) {
      setCurrentView(view as NavigationItem);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center animate-pulse shadow-xl shadow-indigo-600/30">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-xs font-semibold text-zinc-400">Loading StudySync Workspace...</p>
      </div>
    );
  }

  // Redirect unauthenticated users to Login / Signup
  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={(v) => {
          setCurrentView(v);
          setTargetNoteId(null);
          setTargetTaskId(null);
          setTargetDeckId(null);
          setTargetQuizId(null);
        }}
        isOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        collapsed={isSidebarCollapsedDesktop}
        onToggleCollapse={() => setIsSidebarCollapsedDesktop(!isSidebarCollapsedDesktop)}
      />

      {/* Main Layout Container */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarCollapsedDesktop ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        {/* Top Navbar */}
        <Navbar
          onToggleSidebar={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onNavigate={handleNavigate}
        />

        {/* Workspace View */}
        <main className="flex-1 overflow-x-hidden">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={handleNavigate}
              onOpenCreateNote={() => {
                setTargetNoteId(null);
                setCurrentView('notes');
              }}
              onOpenCreateTask={() => {
                setOpenCreateTaskModal(true);
                setCurrentView('tasks');
              }}
            />
          )}

          {currentView === 'notes' && (
            <NotesView
              initialNoteId={targetNoteId}
              onAskAIWithNote={(noteId) => {
                setTargetNoteId(noteId);
                setCurrentView('ai');
              }}
              onGenerateFlashcardsFromNote={(noteId) => {
                setTargetNoteId(noteId);
                setCurrentView('flashcards');
              }}
              onGenerateQuizFromNote={(noteId) => {
                setTargetNoteId(noteId);
                setCurrentView('quizzes');
              }}
            />
          )}

          {currentView === 'ai' && (
            <StudyAIView
              initialNoteId={targetNoteId}
              onClearNoteContext={() => setTargetNoteId(null)}
            />
          )}

          {currentView === 'flashcards' && (
            <FlashcardsView
              initialDeckId={targetDeckId}
              initialNoteId={targetNoteId}
            />
          )}

          {currentView === 'quizzes' && (
            <QuizzesView
              initialQuizId={targetQuizId}
              initialNoteId={targetNoteId}
            />
          )}

          {currentView === 'tasks' && (
            <TasksView
              onStartFocusOnTask={(task) => {
                setTargetTaskId(task.id);
                setCurrentView('focus');
              }}
              openCreateModalDirectly={openCreateTaskModal}
            />
          )}

          {currentView === 'planner' && <PlannerView />}

          {currentView === 'focus' && <FocusView initialTaskId={targetTaskId} />}

          {currentView === 'analytics' && <AnalyticsView />}

          {currentView === 'profile' && <ProfileView />}
        </main>
      </div>

      {/* Global Search Dialog */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
