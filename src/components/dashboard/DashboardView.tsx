import React, { useState, useEffect } from 'react';
import {
  Flame,
  Clock,
  CheckCircle2,
  BookOpen,
  Calendar,
  Sparkles,
  ArrowRight,
  Plus,
  Play,
  Bot,
  Brain,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { DashboardStats, Task, Note, Subject } from '../../types';
import {
  getFirebaseUserNotes,
  getFirebaseUserAINotes,
  getFirebaseUserSubjects,
  getFirebaseUserTasks,
  updateFirebaseUserTask,
  AINote,
} from '../../lib/firebase';

interface DashboardViewProps {
  onNavigate: (view: string, itemId?: string) => void;
  onOpenCreateNote: () => void;
  onOpenCreateTask: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenCreateNote,
  onOpenCreateTask,
}) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    streak: 3,
    totalHours: 4.5,
    totalSessions: 5,
    notesCount: 0,
    completedTasksCount: 0,
    pendingTasksCount: 0,
    quizzesTaken: 1,
    averageScore: 92,
  });
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Task[]>([]);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [savedAiNotes, setSavedAiNotes] = useState<AINote[]>([]);
  const [userSubjects, setUserSubjects] = useState<Subject[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<{ date: string; day: string; hours: number }[]>([
    { date: '2026-09-28', day: 'Mon', hours: 0.8 },
    { date: '2026-09-29', day: 'Tue', hours: 1.2 },
    { date: '2026-09-30', day: 'Wed', hours: 1.5 },
    { date: '2026-10-01', day: 'Thu', hours: 1.0 },
    { date: '2026-10-02', day: 'Fri', hours: 1.8 },
    { date: '2026-10-03', day: 'Sat', hours: 2.2 },
    { date: '2026-10-04', day: 'Sun', hours: 1.5 },
  ]);
  const [subjectDistribution, setSubjectDistribution] = useState<
    { id: string; name: string; color: string; hours: number; notesCount: number }[]
  >([]);
  const [recommendations, setRecommendations] = useState<string[]>([
    'Keep your study momentum going! Review your recent notes with AI active recall.',
  ]);

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [uNotes, uAiNotes, uSubjects, uTasks] = await Promise.all([
        getFirebaseUserNotes(user.id),
        getFirebaseUserAINotes(user.id),
        getFirebaseUserSubjects(user.id),
        getFirebaseUserTasks(user.id),
      ]);

      const pending = uTasks.filter((t) => t.status !== 'completed');
      const completed = uTasks.filter((t) => t.status === 'completed');

      setRecentNotes(uNotes.slice(0, 4));
      setSavedAiNotes(uAiNotes.slice(0, 4));
      setUserSubjects(uSubjects);
      setTodayTasks(uTasks.slice(0, 5));
      setUpcomingDeadlines(pending.slice(0, 4));

      setStats({
        streak: 3,
        totalHours: 4.5,
        totalSessions: 5,
        notesCount: uNotes.length,
        completedTasksCount: completed.length,
        pendingTasksCount: pending.length,
        quizzesTaken: 1,
        averageScore: 92,
      });

      const dist = uSubjects.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        hours: s.targetHoursPerWeek || 6,
        notesCount: uNotes.filter((n) => n.subjectId === s.id).length,
      }));
      setSubjectDistribution(dist);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const toggleTaskStatus = async (task: Task) => {
    if (!user) return;
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    try {
      await updateFirebaseUserTask(user.id, task.id, { status: newStatus });
      setTodayTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
      setStats((prev) => ({
        ...prev,
        completedTasksCount:
          newStatus === 'completed' ? prev.completedTasksCount + 1 : prev.completedTasksCount - 1,
        pendingTasksCount:
          newStatus === 'completed' ? prev.pendingTasksCount - 1 : prev.pendingTasksCount + 1,
      }));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Welcome Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <span style={{ fontFamily: 'Times New Roman' }}>{getGreeting()}, {user?.name?.split(' ')[0] || 'Student'} 👋</span>
          </h1>
          <p style={{ fontFamily: 'monospace' }} className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Here's what you need to focus on today for {user?.course || 'your coursework'}.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ fontFamily: 'Georgia' }} className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={onOpenCreateNote}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Note</span>
          </button>

          <button
            onClick={onOpenCreateTask}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>

          <button
            onClick={() => onNavigate('focus')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/20 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Focus Session</span>
          </button>

          <button
            onClick={() => onNavigate('ai')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold border border-purple-500/20 transition-colors"
          >
            <Bot className="w-4 h-4" />
            <span>Ask AI</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            <Flame className="w-6 h-6 fill-amber-500" />
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Study Streak</span>
            <div className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-0.5">
              {stats.streak} <span className="text-xs font-normal text-zinc-400">days</span>
            </div>
          </div>
        </div>

        {/* Total Focus Time */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Total Focus Time</span>
            <div className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-0.5">
              {stats.totalHours} <span className="text-xs font-normal text-zinc-400">hrs</span>
            </div>
          </div>
        </div>

        {/* Tasks Completed */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Tasks Completed</span>
            <div className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-0.5">
              {stats.completedTasksCount}{' '}
              <span className="text-xs font-normal text-zinc-400">
                ({stats.pendingTasksCount} pending)
              </span>
            </div>
          </div>
        </div>

        {/* Notes Created */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Notes Created</span>
            <div className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-0.5">
              {stats.notesCount}
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendation Banner */}
      {recommendations.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-purple-950/50 to-indigo-950/70 border border-indigo-800/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">AI Study Recommendation</span>
              <p className="text-xs sm:text-sm text-zinc-200 mt-0.5">{recommendations[0]}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('ai')}
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5"
          >
            <span>Ask Study AI</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Two-Column Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Tasks & Weekly Hours */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Tasks */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Today's Focus Tasks</h3>
              </div>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>View All Tasks</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayTasks.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
                <p className="text-sm font-medium">No tasks scheduled specifically for today.</p>
                <button
                  onClick={onOpenCreateTask}
                  className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  + Add a new task for today
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => toggleTaskStatus(task)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          task.status === 'completed'
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-zinc-400 dark:border-zinc-600 hover:border-indigo-500'
                        }`}
                      >
                        {task.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <div className="truncate">
                        <span
                          className={`text-sm font-medium ${
                            task.status === 'completed'
                              ? 'line-through text-zinc-400 dark:text-zinc-500'
                              : 'text-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          {task.title}
                        </span>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2 mt-0.5">
                          <span
                            className={`px-1.5 py-0.2 rounded-sm text-[10px] font-semibold uppercase ${
                              task.priority === 'high'
                                ? 'bg-rose-500/10 text-rose-500'
                                : task.priority === 'medium'
                                ? 'bg-amber-500/10 text-amber-500'
                                : 'bg-blue-500/10 text-blue-500'
                            }`}
                          >
                            {task.priority}
                          </span>
                          <span>• {task.estimatedMinutes} mins</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigate('focus')}
                      className="p-1.5 text-zinc-400 hover:text-indigo-500 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      title="Focus on this task"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly Progress Chart */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Weekly Study Hours</h3>
              </div>
              <button
                onClick={() => onNavigate('analytics')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Full Analytics</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2">
              {weeklyProgress.map((day) => {
                const maxVal = Math.max(...weeklyProgress.map((d) => d.hours), 4);
                const heightPct = Math.min(100, Math.round((day.hours / maxVal) * 100));

                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      {day.hours}h
                    </span>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden flex flex-col justify-end h-32">
                      <div
                        className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-500 group-hover:to-indigo-300 rounded-xl transition-all duration-300"
                        style={{ height: `${Math.max(6, heightPct)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-zinc-500">{day.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Upcoming Deadlines & Recent Notes */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <div style={{ backgroundColor: '#7676ba' }} className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar style={{ backgroundColor: '#000000' }} className="w-5 h-5 text-rose-500" />
                <h3 style={{ borderColor: '#000000', backgroundColor: '#49347d', fontFamily: 'Georgia' }} className="text-base font-bold text-zinc-900 dark:text-white">Upcoming Deadlines</h3>
              </div>
              <button
                onClick={() => onNavigate('planner')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Planner</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <p style={{ backgroundColor: '#141414' }} className="text-xs text-zinc-500 text-center py-6">No approaching deadlines.</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingDeadlines.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[160px]">
                        {task.title}
                      </span>
                      <span className="text-[11px] font-bold text-rose-500">{task.dueDate}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                      <span className="capitalize">{task.priority} Priority</span>
                      <span>{task.estimatedMinutes}m est</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Notes */}
          <div style={{ backgroundColor: '#48489a' }} className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs">
            <div style={{ fontFamily: 'Georgia' }} className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-500" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Recent Notes</h3>
              </div>
              <button
                onClick={() => onNavigate('notes')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>All Notes</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentNotes.length === 0 ? (
              <div className="py-6 text-center text-zinc-500">
                <p className="text-xs">No notes created yet.</p>
                <button
                  onClick={onOpenCreateNote}
                  className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  + Create your first study note
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => onNavigate('notes', note.id)}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 cursor-pointer transition-all group"
                  >
                    <h4 style={{ fontFamily: 'Times New Roman', fontSize: '13px' }} className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-500 transition-colors truncate">
                      {note.title}
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-1 truncate">
                      {note.tags.join(', ') || 'General'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Saved AI Notes */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Saved AI Notes ({savedAiNotes.length})</h3>
              </div>
              <button
                onClick={() => onNavigate('notes')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>View</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {savedAiNotes.length === 0 ? (
              <div className="py-4 text-center text-zinc-500">
                <p className="text-xs">No saved AI notes yet.</p>
                <button
                  onClick={() => onNavigate('notes')}
                  className="mt-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Generate with AI Assistant
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {savedAiNotes.map((aiN) => (
                  <div
                    key={aiN.id}
                    onClick={() => onNavigate('notes')}
                    className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-900/30 hover:border-purple-500/50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                        {aiN.title}
                      </h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        AI
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1">
                      {aiN.topic || aiN.tags?.join(', ') || 'AI Synthesis'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick AI Quizzes & Flashcards launch */}
          <div style={{ backgroundColor: '#60359a' }} className="p-5 rounded-2xl bg-gradient-to-tr from-purple-950/40 to-indigo-950/40 border border-purple-800/40 shadow-xs flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-purple-400" />
                <span style={{ color: '#f1ffff', fontFamily: 'Georgia', fontSize: '16px' }}>Test Your Recall</span>
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">Generate an AI self-testing quiz in seconds</p>
            </div>
            <button
              onClick={() => onNavigate('quizzes')}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
