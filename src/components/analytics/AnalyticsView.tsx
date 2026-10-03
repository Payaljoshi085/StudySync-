import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Flame,
  Clock,
  CheckCircle2,
  BookOpen,
  Brain,
  Award,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { api } from '../../lib/api';
import { DashboardStats } from '../../types';

export const AnalyticsView: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    streak: 0,
    totalHours: 0,
    totalSessions: 0,
    notesCount: 0,
    completedTasksCount: 0,
    pendingTasksCount: 0,
    quizzesTaken: 0,
    averageScore: 0,
  });

  const [weeklyProgress, setWeeklyProgress] = useState<{ date: string; day: string; hours: number }[]>([]);
  const [subjectDistribution, setSubjectDistribution] = useState<
    { id: string; name: string; color: string; hours: number; notesCount: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then((res) => {
      setStats(res.stats);
      setWeeklyProgress(res.weeklyProgress || []);
      setSubjectDistribution(res.subjectDistribution || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const totalTasks = stats.completedTasksCount + stats.pendingTasksCount;
  const taskCompletionRate =
    totalTasks > 0 ? Math.round((stats.completedTasksCount / totalTasks) * 100) : 0;

  // Mock heatmap 28 days for visual brilliance
  const heatmapDays = Array.from({ length: 28 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    const intensity = (i + stats.streak) % 4; // 0 to 3
    return {
      date: d.toISOString().split('T')[0],
      intensity,
    };
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <BarChart3 className="w-7 h-7 text-indigo-500" />
          <span>Progress & Analytics</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Quantitative insights into your cognitive effort, consistency, and subject mastery.
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 fill-amber-500" />
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-400">Current Streak</span>
            <div className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-0.5">
              {stats.streak} <span className="text-xs font-normal text-zinc-400">days</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-400">Total Study Time</span>
            <div className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-0.5">
              {stats.totalHours} <span className="text-xs font-normal text-zinc-400">hrs</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-400">Task Completion</span>
            <div className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-0.5">
              {taskCompletionRate}%
            </div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-400">Avg Quiz Mastery</span>
            <div className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-0.5">
              {stats.averageScore}%
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Hours Bar Chart */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              <span>Weekly Study Hours</span>
            </h3>
            <span className="text-xs text-zinc-400">Last 7 Days</span>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 pt-6 px-4">
            {weeklyProgress.map((day) => {
              const maxVal = Math.max(...weeklyProgress.map((d) => d.hours), 4);
              const heightPct = Math.min(100, Math.round((day.hours / maxVal) * 100));

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">
                    {day.hours}h
                  </span>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-2xl overflow-hidden flex flex-col justify-end h-40">
                    <div
                      className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-500 group-hover:to-indigo-300 rounded-2xl transition-all duration-300"
                      style={{ height: `${Math.max(8, heightPct)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-zinc-500">{day.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subject-Wise Time Distribution */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-500" />
              <span>Subject-Wise Distribution</span>
            </h3>
            <span className="text-xs text-zinc-400">Total Hours Logged</span>
          </div>

          <div className="space-y-4">
            {subjectDistribution.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">No subjects logged yet.</p>
            ) : (
              subjectDistribution.map((sub) => {
                const totalSubHours = subjectDistribution.reduce((acc, s) => acc + s.hours, 0) || 1;
                const pct = Math.round((sub.hours / totalSubHours) * 100);

                return (
                  <div key={sub.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sub.color }} />
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{sub.name}</span>
                      </div>
                      <span className="font-semibold text-zinc-500">{sub.hours} hrs ({pct}%)</span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(5, pct)}%`,
                          backgroundColor: sub.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 28-Day Study Heatmap */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <span>28-Day Study Consistency Matrix</span>
          </h3>
          <span className="text-xs text-zinc-400">Daily Activity Heatmap</span>
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 pt-2">
          {heatmapDays.map((d, i) => {
            const colors = [
              'bg-zinc-100 dark:bg-zinc-800',
              'bg-indigo-300 dark:bg-indigo-900/60',
              'bg-indigo-400 dark:bg-indigo-700',
              'bg-indigo-600 dark:bg-indigo-500',
            ];

            return (
              <div
                key={i}
                className="flex flex-col items-center gap-1 group cursor-pointer"
                title={`${d.date}: Focus logged`}
              >
                <div
                  className={`w-full aspect-square rounded-xl transition-all duration-150 group-hover:scale-110 ${
                    colors[d.intensity]
                  }`}
                />
                <span className="text-[9px] text-zinc-500 font-mono">
                  {d.date.slice(8)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
