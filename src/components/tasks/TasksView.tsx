import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  Circle,
  MoreVertical,
  X,
  Play,
  LayoutGrid,
  List,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Task, Subject } from '../../types';
import { useToast } from '../../context/ToastContext';

interface TasksViewProps {
  onStartFocusOnTask?: (task: Task) => void;
  openCreateModalDirectly?: boolean;
}

export const TasksView: React.FC<TasksViewProps> = ({
  onStartFocusOnTask,
  openCreateModalDirectly,
}) => {
  const { success, error, info } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskSubjectId, setTaskSubjectId] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskStatus, setTaskStatus] = useState<'todo' | 'in_progress' | 'completed'>('todo');
  const [taskDueDate, setTaskDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [taskEstimatedMinutes, setTaskEstimatedMinutes] = useState(45);

  const loadData = async () => {
    try {
      const [tasksRes, subsRes] = await Promise.all([
        api.getTasks(),
        api.getSubjects(),
      ]);
      setTasks(tasksRes.tasks || []);
      setSubjects(subsRes.subjects || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (openCreateModalDirectly) {
      openCreateModal();
    }
  }, [openCreateModalDirectly]);

  const openCreateModal = () => {
    setEditingTaskId(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskSubjectId(subjects[0]?.id || '');
    setTaskPriority('medium');
    setTaskStatus('todo');
    setTaskDueDate(new Date().toISOString().split('T')[0]);
    setTaskEstimatedMinutes(45);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDescription(task.description);
    setTaskSubjectId(task.subjectId);
    setTaskPriority(task.priority);
    setTaskStatus(task.status);
    setTaskDueDate(task.dueDate);
    setTaskEstimatedMinutes(task.estimatedMinutes);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      error('Task title is required');
      return;
    }

    try {
      if (editingTaskId) {
        const res = await api.updateTask(editingTaskId, {
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          subjectId: taskSubjectId,
          priority: taskPriority,
          status: taskStatus,
          dueDate: taskDueDate,
          estimatedMinutes: taskEstimatedMinutes,
        });
        setTasks((prev) => prev.map((t) => (t.id === editingTaskId ? res.task : t)));
        success('Task updated');
      } else {
        const res = await api.createTask({
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          subjectId: taskSubjectId || subjects[0]?.id || '',
          priority: taskPriority,
          status: taskStatus,
          dueDate: taskDueDate,
          estimatedMinutes: taskEstimatedMinutes,
        });
        setTasks((prev) => [res.task, ...prev]);
        success('Task created');
      }
      setIsModalOpen(false);
    } catch (err) {
      error('Failed to save task');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      success('Task deleted');
    } catch (err) {
      error('Failed to delete task');
    }
  };

  const handleUpdateStatus = async (task: Task, newStatus: 'todo' | 'in_progress' | 'completed') => {
    try {
      const res = await api.updateTask(task.id, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? res.task : t)));
    } catch (err) {
      error('Failed to update task status');
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterSubjectId !== 'all' && t.subjectId !== filterSubjectId) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    }
    return true;
  });

  const columns: { id: 'todo' | 'in_progress' | 'completed'; label: string; color: string }[] = [
    { id: 'todo', label: 'To Do', color: 'border-blue-500/40 text-blue-400' },
    { id: 'in_progress', label: 'In Progress', color: 'border-amber-500/40 text-amber-400' },
    { id: 'completed', label: 'Completed', color: 'border-emerald-500/40 text-emerald-400' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-7 h-7 text-indigo-500" />
            <span>Task Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Organize coursework tasks, assignments, and exam revision milestones.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'board'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
              }`}
              title="Board View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter tasks by title or description..."
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Subject Filter */}
          <select
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 focus:outline-none"
          >
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Main Content: Board or List */}
      {viewMode === 'board' ? (
        /* KANBAN BOARD */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className="flex flex-col rounded-3xl bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 p-4 min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{col.label}</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {colTasks.length}
                    </span>
                  </div>

                  <button
                    onClick={openCreateModal}
                    className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    title="Add task to column"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Column Task Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="h-32 flex items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-400">
                      No tasks in {col.label}
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const sub = subjects.find((s) => s.id === task.subjectId);

                      return (
                        <div
                          key={task.id}
                          className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                task.priority === 'high'
                                  ? 'bg-rose-500/10 text-rose-500'
                                  : task.priority === 'medium'
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : 'bg-blue-500/10 text-blue-500'
                              }`}
                            >
                              {task.priority} Priority
                            </span>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditModal(task)}
                                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 text-zinc-400 hover:text-rose-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                            {task.title}
                          </h4>

                          {task.description && (
                            <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
                            <div className="flex items-center gap-1 truncate max-w-[140px]">
                              {sub && (
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: sub.color }}
                                />
                              )}
                              <span className="truncate">{sub?.name || 'General'}</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-zinc-400" />
                                {task.estimatedMinutes}m
                              </span>
                            </div>
                          </div>

                          {/* Quick Status Move Row */}
                          <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-400">
                            <span className="flex items-center gap-1 text-zinc-500">
                              <Calendar className="w-3 h-3" />
                              {task.dueDate}
                            </span>

                            <div className="flex items-center gap-1">
                              {col.id !== 'todo' && (
                                <button
                                  onClick={() => handleUpdateStatus(task, 'todo')}
                                  className="px-1.5 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                >
                                  To Do
                                </button>
                              )}
                              {col.id !== 'in_progress' && (
                                <button
                                  onClick={() => handleUpdateStatus(task, 'in_progress')}
                                  className="px-1.5 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-amber-500 font-semibold"
                                >
                                  In Progress
                                </button>
                              )}
                              {col.id !== 'completed' && (
                                <button
                                  onClick={() => handleUpdateStatus(task, 'completed')}
                                  className="px-1.5 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-emerald-500 font-semibold"
                                >
                                  Done ✓
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/80 shadow-xs">
          {filteredTasks.length === 0 ? (
            <div className="py-16 text-center text-zinc-400">No tasks found.</div>
          ) : (
            filteredTasks.map((task) => {
              const sub = subjects.find((s) => s.id === task.subjectId);
              const isDone = task.status === 'completed';

              return (
                <div
                  key={task.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      onClick={() =>
                        handleUpdateStatus(task, isDone ? 'todo' : 'completed')
                      }
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-zinc-400 dark:border-zinc-600 hover:border-indigo-500'
                      }`}
                    >
                      {isDone && <CheckCircle2 className="w-4 h-4" />}
                    </button>

                    <div className="truncate">
                      <h4
                        className={`text-sm font-bold truncate ${
                          isDone ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-white'
                        }`}
                      >
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                        {sub && (
                          <span className="flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: sub.color }}
                            />
                            {sub.name}
                          </span>
                        )}
                        <span>Due: {task.dueDate}</span>
                        <span>{task.estimatedMinutes}m est</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        task.priority === 'high'
                          ? 'bg-rose-500/10 text-rose-500'
                          : task.priority === 'medium'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-blue-500/10 text-blue-500'
                      }`}
                    >
                      {task.priority}
                    </span>

                    <button
                      onClick={() => openEditModal(task)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Create / Edit Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700/80 rounded-3xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">
              {editingTaskId ? 'Edit Study Task' : 'Add New Study Task'}
            </h3>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Task Title *</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Solve Binary Tree rotation problems"
                  required
                  className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Description (Optional)</label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={2}
                  placeholder="Notes, links, or specific page numbers..."
                  className="w-full px-3.5 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Subject</label>
                  <select
                    value={taskSubjectId}
                    onChange={(e) => setTaskSubjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Est. Time (Minutes)</label>
                  <input
                    type="number"
                    value={taskEstimatedMinutes}
                    onChange={(e) => setTaskEstimatedMinutes(Number(e.target.value))}
                    min={5}
                    step={5}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Status</label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-colors"
              >
                {editingTaskId ? 'Save Changes' : 'Create Task'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
