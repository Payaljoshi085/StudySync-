import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  BookOpen,
  ArrowRight,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface RegisterPageProps {
  initialEmail?: string;
  onSwitchToLogin: (email?: string) => void;
  onBackToLanding: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
];

export const RegisterPage: React.FC<RegisterPageProps> = ({
  initialEmail = '',
  onSwitchToLogin,
  onBackToLanding,
}) => {
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [educationLevel, setEducationLevel] = useState('Undergraduate / College');
  const [course, setCourse] = useState('Computer Science & Engineering');
  const [semester, setSemester] = useState('Year 2');
  const [avatar, setAvatar] = useState(PRESET_AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsAlreadyRegistered(false);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: cleanEmail,
        password,
        confirmPassword,
        educationLevel,
        course,
        semester,
        avatar,
      });
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Please try again.';
      setErrorMessage(msg);
      if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('sign in')) {
        setIsAlreadyRegistered(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 text-zinc-100 font-sans relative selection:bg-indigo-500 selection:text-white py-12">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Header Logo */}
      <div
        onClick={onBackToLanding}
        className="flex items-center gap-2.5 mb-6 cursor-pointer group"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
          <GraduationCap className="w-6 h-6" />
        </div>
        <span className="text-2xl font-extrabold tracking-tight text-white">StudySync</span>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-lg bg-zinc-900/90 border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
        {/* Tab Switcher: Sign In vs Create Account */}
        <div className="flex items-center p-1 bg-zinc-800/80 rounded-2xl mb-6 border border-zinc-700/60">
          <button
            type="button"
            onClick={() => onSwitchToLogin(email.trim())}
            className="flex-1 py-2 text-xs font-bold rounded-xl text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            className="flex-1 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white shadow-sm transition-all"
          >
            Create Account
          </button>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">Create your study space</h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Join StudySync to organize your coursework, take AI-powered notes, and track your progress.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs space-y-2.5">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>

            {isAlreadyRegistered && (
              <button
                type="button"
                onClick={() => onSwitchToLogin(email.trim())}
                className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in with "{email.trim()}" now</span>
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              Choose Avatar
            </label>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              {PRESET_AVATARS.map((av, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setAvatar(av)}
                  className={`w-11 h-11 rounded-full p-0.5 border-2 transition-all shrink-0 ${
                    avatar === av ? 'border-indigo-500 scale-110 shadow-md shadow-indigo-500/30' : 'border-zinc-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={av} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Vance"
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-800/60 border border-zinc-700/80 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-800/60 border border-zinc-700/80 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Password (min 6) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-800/60 border border-zinc-700/80 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-800/60 border border-zinc-700/80 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Academic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Education Level
              </label>
              <select
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-800/60 border border-zinc-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                <option value="High School">High School</option>
                <option value="Undergraduate / College">Undergraduate / College</option>
                <option value="Graduate / Master">Graduate / Master</option>
                <option value="Doctorate / PhD">Doctorate / PhD</option>
                <option value="Self-Taught / Professional">Self-Taught / Professional</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Major / Course
              </label>
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="Computer Science, Medicine..."
                className="w-full px-3 py-2.5 bg-zinc-800/60 border border-zinc-700/80 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Setting up workspace...</span>
              </>
            ) : (
              <>
                <span>Create Free Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center text-xs text-zinc-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => onSwitchToLogin(email.trim())}
            className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors underline underline-offset-4"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};
