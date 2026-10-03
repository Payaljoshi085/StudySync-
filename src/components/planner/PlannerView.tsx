import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Sparkles,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  TrendingUp,
  Award,
} from 'lucide-react';
import { api } from '../../lib/api';
import { StudyPlan, StudyPlanSlot, Subject, Task } from '../../types';
import { useToast } from '../../context/ToastContext';

export const PlannerView: React.FC = () => {
  const { success, error, info } = useToast();

  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  // New Slot Input
  const [newTime, setNewTime] = useState('10:00 - 11:00');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const loadData = async (date: string) => {
    try {
      setLoading(true);
      const [planRes, subsRes, tasksRes] = await Promise.all([
        api.getPlanner(date),
        api.getSubjects(),
        api.getTasks(),
      ]);
      setPlan(planRes.plan);
      setSubjects(subsRes.subjects || []);
      setTasks(tasksRes.tasks || []);
      if (subsRes.subjects && subsRes.subjects.length > 0 && !newSubjectId) {
        setNewSubjectId(subsRes.subjects[0].id);
      }
    } catch (err) {
      console.error('Failed to load planner:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentDate);
  }, [currentDate]);

  const handleToggleSlot = async (slotId: string) => {
    if (!plan) return;
    const updatedSlots = plan.slots.map((s) =>
      s.id === slotId ? { ...s, completed: !s.completed } : s
    );
    try {
      const res = await api.savePlanner(currentDate, updatedSlots);
      setPlan(res.plan);
    } catch (err) {
      error('Failed to update slot');
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      error('Please enter a session or task goal');
      return;
    }

    const currentSlots = plan ? [...plan.slots] : [];
    const newSlot: StudyPlanSlot = {
      id: `slot_${Date.now()}`,
      time: newTime,
      subjectId: newSubjectId || (subjects[0]?.id || ''),
      taskTitle: newTaskTitle.trim(),
      completed: false,
    };

    try {
      const res = await api.savePlanner(currentDate, [...currentSlots, newSlot]);
      setPlan(res.plan);
      setNewTaskTitle('');
      success('Study slot added');
    } catch (err) {
      error('Failed to add slot');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!plan) return;
    const remaining = plan.slots.filter((s) => s.id !== slotId);
    try {
      const res = await api.savePlanner(currentDate, remaining);
      setPlan(res.plan);
    } catch (err) {
      error('Failed to remove slot');
    }
  };

  const handleAutoSchedule = async () => {
    try {
      const res = await api.autoSchedule(currentDate);
      setPlan(res.plan);
      success('Smart study schedule generated based on pending high-priority tasks!');
    } catch (err) {
      error('Failed to auto-schedule');
    }
  };

  // Exam Countdown calculation
  const examSubjects = subjects
    .filter((s) => s.examDate)
    .map((s) => {
      const examTime = new Date(s.examDate!).getTime();
      const diffDays = Math.ceil((examTime - Date.now()) / (1000 * 60 * 60 * 24));
      return {
        ...s,
        daysRemaining: diffDays,
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const completedCount = plan ? plan.slots.filter((s) => s.completed).length : 0;
  const totalSlots = plan ? plan.slots.length : 0;
  const progressPct = totalSlots > 0 ? Math.round((completedCount / totalSlots) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-indigo-500" />
            <span>Personalized Study Planner</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Structure your study blocks, track exam countdowns, and stay ahead of deadlines.
          </p>
        </div>

        <button
          onClick={handleAutoSchedule}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02] self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Auto-Generate Smart Schedule</span>
        </button>
      </div>

      {/* Exam Countdowns Strip */}
      {examSubjects.length > 0 && (
        <div className="space-y-3">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Exam Countdowns
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {examSubjects.map((sub) => (
              <div
                key={sub.id}
                className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                    <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      {sub.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-0.5 block">
                    Exam Date: {new Date(sub.examDate!).toLocaleDateString()}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                    {sub.daysRemaining > 0 ? `${sub.daysRemaining}d` : 'Today!'}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-semibold">Remaining</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Date Switcher & Daily Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Schedule Slots */}
        <div className="lg:col-span-2 space-y-5">
          {/* Day Selector */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-zinc-900 dark:text-white focus:outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500 font-medium">
                {completedCount}/{totalSlots} Completed ({progressPct}%)
              </span>
            </div>
          </div>

          {/* Slots List */}
          <div className="space-y-3">
            {!plan || plan.slots.length === 0 ? (
              <div className="py-16 text-center text-zinc-400 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 p-8 space-y-3">
                <Clock className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700" />
                <p className="text-sm font-medium">No study blocks scheduled for this date.</p>
                <p className="text-xs text-zinc-500">
                  Add custom study intervals or click "Auto-Generate Smart Schedule" above.
                </p>
              </div>
            ) : (
              plan.slots.map((slot) => {
                const sub = subjects.find((s) => s.id === slot.subjectId);

                return (
                  <div
                    key={slot.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      slot.completed
                        ? 'bg-emerald-950/10 border-emerald-800/30 text-zinc-400'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/80 text-zinc-900 dark:text-white shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <button
                        onClick={() => handleToggleSlot(slot.id)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          slot.completed
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-zinc-400 dark:border-zinc-600 hover:border-indigo-500'
                        }`}
                      >
                        {slot.completed && <CheckCircle2 className="w-4 h-4" />}
                      </button>

                      <div className="truncate">
                        <span className="text-xs font-mono font-bold text-indigo-500 block mb-0.5">
                          {slot.time}
                        </span>
                        <div
                          className={`text-sm font-bold truncate ${
                            slot.completed ? 'line-through text-zinc-400' : ''
                          }`}
                        >
                          {slot.taskTitle}
                        </div>
                        {sub && (
                          <span className="text-[11px] text-zinc-500 mt-0.5 inline-block">
                            Subject: {sub.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Delete Slot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Study Block Form */}
          <form
            onSubmit={handleAddSlot}
            className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center gap-3"
          >
            <input
              type="text"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              placeholder="e.g. 14:00 - 15:30"
              className="w-full sm:w-36 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-900 dark:text-white focus:outline-none"
            />
            <select
              value={newSubjectId}
              onChange={(e) => setNewSubjectId(e.target.value)}
              className="w-full sm:w-44 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Target study task or chapter..."
              className="w-full sm:flex-1 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none"
            />
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors"
            >
              + Add Slot
            </button>
          </form>
        </div>

        {/* Right 1 Col: Quick Daily Goals & Tasks Queue */}
        <div className="space-y-6">
          <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-500" />
              <span>Daily Study Target</span>
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Completion Status</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{progressPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Completing scheduled blocks reinforces cognitive retention and builds study resilience.
            </p>
          </div>

          {/* Pending Tasks Queue */}
          <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-3">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Unscheduled Coursework</h3>
            {tasks.filter((t) => t.status !== 'completed').length === 0 ? (
              <p className="text-xs text-zinc-400 py-3">All tasks completed or scheduled!</p>
            ) : (
              <div className="space-y-2">
                {tasks
                  .filter((t) => t.status !== 'completed')
                  .slice(0, 4)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs"
                    >
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {task.title}
                      </div>
                      <div className="text-[10px] text-zinc-400 flex items-center justify-between mt-1">
                        <span>Due: {task.dueDate}</span>
                        <span>{task.estimatedMinutes}m est</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
