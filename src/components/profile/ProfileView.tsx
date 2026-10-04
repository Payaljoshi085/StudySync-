import React, { useState } from 'react';
import {
  User,
  Mail,
  GraduationCap,
  BookOpen,
  Target,
  Bell,
  Sun,
  Moon,
  Check,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
];

export const ProfileView: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { success, error } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [educationLevel, setEducationLevel] = useState(user?.educationLevel || 'Undergraduate');
  const [course, setCourse] = useState(user?.course || '');
  const [semester, setSemester] = useState(user?.semester || '');
  const [dailyMinutes, setDailyMinutes] = useState(user?.studyGoals?.dailyMinutes || 120);
  const [weeklySessions, setWeeklySessions] = useState(user?.studyGoals?.weeklySessions || 10);
  const [primaryFocus, setPrimaryFocus] = useState(user?.studyGoals?.primaryFocus || '');
  const [avatar, setAvatar] = useState(user?.avatar || PRESET_AVATARS[0]);

  const [deadlinesNotif, setDeadlinesNotif] = useState(
    user?.notificationPreferences?.deadlines ?? true
  );
  const [streakNotif, setStreakNotif] = useState(
    user?.notificationPreferences?.streakReminders ?? true
  );
  const [goalNotif, setGoalNotif] = useState(
    user?.notificationPreferences?.goalAlerts ?? true
  );

  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser({
        name: name.trim(),
        avatar,
        educationLevel,
        course: course.trim(),
        semester: semester.trim(),
        studyGoals: {
          dailyMinutes: Number(dailyMinutes),
          weeklySessions: Number(weeklySessions),
          primaryFocus: primaryFocus.trim(),
        },
        notificationPreferences: {
          deadlines: deadlinesNotif,
          streakReminders: streakNotif,
          goalAlerts: goalNotif,
        },
      });
      success('Profile & academic goals updated successfully!');
    } catch (err: any) {
      error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = {
        user,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studysync-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      success('StudySync data exported successfully!');
    } catch {
      error('Failed to export data');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <User className="w-7 h-7 text-indigo-500" />
          <span>Student Profile & Workspace Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Customize your academic identity, daily target hours, and study preferences.
        </p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Profile Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800/80">
            <img
              src={avatar}
              alt="Avatar"
              className="w-24 h-24 rounded-3xl object-cover ring-4 ring-indigo-500/20 shadow-xl shrink-0"
            />
            <div className="space-y-2 text-center sm:text-left flex-1">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{user?.name}</h3>
              <p className="text-xs text-zinc-500">{user?.email}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800/40">
                  {user?.course || 'Student'}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium">
                  {user?.educationLevel || 'Undergraduate'}
                </span>
              </div>
            </div>
          </div>

          {/* Avatar Switcher */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Choose Profile Avatar
            </label>
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {PRESET_AVATARS.map((av, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setAvatar(av)}
                  className={`w-12 h-12 rounded-2xl p-0.5 border-2 transition-all shrink-0 ${
                    avatar === av
                      ? 'border-indigo-500 scale-110 shadow-md shadow-indigo-500/20'
                      : 'border-zinc-300 dark:border-zinc-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={av} alt="Avatar" className="w-full h-full rounded-2xl object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Education Level
              </label>
              <select
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="High School">High School</option>
                <option value="Undergraduate">Undergraduate / College</option>
                <option value="Graduate / Post-Grad">Graduate / Post-Grad</option>
                <option value="Medical / Law School">Medical / Law School</option>
                <option value="Self-Directed Study">Self-Directed Study</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Course / Major
              </label>
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. Computer Science & AI"
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Semester / Year
              </label>
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="e.g. 4th Semester (Year 2)"
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Study Goals Section */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-500" />
            <span>Target Goals & Focus Discipline</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Daily Target Focus (Minutes)
              </label>
              <input
                type="number"
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                min={15}
                step={15}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Weekly Target Sessions
              </label>
              <input
                type="number"
                value={weeklySessions}
                onChange={(e) => setWeeklySessions(Number(e.target.value))}
                min={1}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Primary Academic Focus
              </label>
              <input
                type="text"
                value={primaryFocus}
                onChange={(e) => setPrimaryFocus(e.target.value)}
                placeholder="e.g. Algorithms & OS"
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Theme & Notifications */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Sun className="w-5 h-5 text-indigo-500" />
            <span>Theme & Notification Preferences</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Theme Mode
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="dark">Dark Theme (Recommended for Study)</option>
                <option value="light">Light Theme</option>
                <option value="system">Follow System</option>
              </select>
            </div>

            <div className="space-y-2 pt-2 sm:pt-0">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Alert Preferences
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deadlinesNotif}
                    onChange={(e) => setDeadlinesNotif(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span>Upcoming coursework deadline alerts</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={streakNotif}
                    onChange={(e) => setStreakNotif(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span>Daily study streak reminders</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving Changes...' : 'Save Profile & Settings'}
          </button>
        </div>
      </form>

      {/* Workspace Data Management */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-500" />
          <span>Workspace Data Management</span>
        </h3>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div>
            <span className="text-sm font-semibold text-zinc-900 dark:text-white">Export Study Data</span>
            <p className="text-xs text-zinc-500">Download a full JSON backup of your personal study space, goals, and records.</p>
          </div>
          <button
            type="button"
            onClick={handleExportData}
            className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 transition-colors"
          >
            Export Backup (.json)
          </button>
        </div>
      </div>
    </div>
  );
};
