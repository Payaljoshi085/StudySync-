import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface LoginPageProps {
  initialEmail?: string;
  onSwitchToRegister: (email?: string) => void;
  onBackToLanding: () => void;
}

const LAST_EMAIL_KEY = 'studysync_last_email';

export const LoginPage: React.FC<LoginPageProps> = ({
  initialEmail = '',
  onSwitchToRegister,
  onBackToLanding,
}) => {
  const { login, demoLogin } = useAuth();

  const [email, setEmail] = useState(() => {
    if (initialEmail) return initialEmail;
    try {
      return localStorage.getItem(LAST_EMAIL_KEY) || '';
    } catch {
      return '';
    }
  });

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAccountNotFound, setIsAccountNotFound] = useState(false);
  const [isIncorrectPassword, setIsIncorrectPassword] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordDefaultEmail, setForgotPasswordDefaultEmail] = useState('');

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsAccountNotFound(false);
    setIsIncorrectPassword(false);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      if (rememberMe) {
        try {
          localStorage.setItem(LAST_EMAIL_KEY, cleanEmail);
        } catch {}
      }
      await login(cleanEmail, password);
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setErrorMessage(msg);
      if (msg.toLowerCase().includes('no account') || msg.toLowerCase().includes('not found')) {
        setIsAccountNotFound(true);
      }
      if (msg.toLowerCase().includes('incorrect password')) {
        setIsIncorrectPassword(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setErrorMessage('');
    setIsAccountNotFound(false);
    setIsIncorrectPassword(false);
    setDemoLoading(true);
    try {
      await demoLogin();
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo login failed.');
    } finally {
      setDemoLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('demo@studysync.edu');
    setPassword('StudySync@2026');
    setErrorMessage('');
    setIsAccountNotFound(false);
    setIsIncorrectPassword(false);
  };

  const openForgotPasswordWithEmail = () => {
    setForgotPasswordDefaultEmail(email.trim());
    setIsForgotPasswordOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 text-zinc-100 font-sans relative selection:bg-indigo-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Header Logo */}
      <div
        onClick={onBackToLanding}
        className="flex items-center gap-2.5 mb-6 cursor-pointer group"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-extrabold tracking-tight text-white">StudySync</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
        {/* Tab Switcher: Sign In vs Create Account */}
        <div className="flex items-center p-1 bg-zinc-800/80 rounded-2xl mb-6 border border-zinc-700/60">
          <button
            type="button"
            className="flex-1 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white shadow-sm transition-all"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => onSwitchToRegister(email.trim())}
            className="flex-1 py-2 text-xs font-bold rounded-xl text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Access your personal notes, tasks, flashcards & AI study space
          </p>
        </div>

        {/* 1-Click Demo Login */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={demoLoading || loading}
          className="w-full mb-5 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 hover:from-amber-500/20 hover:to-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{demoLoading ? 'Signing in as Demo...' : 'Try Demo Student Account (1-Click)'}</span>
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">or sign in with email</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Error / Assistance Banner */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs space-y-2.5">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>

            {isAccountNotFound && (
              <button
                type="button"
                onClick={() => onSwitchToRegister(email.trim())}
                className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create account with "{email.trim()}"</span>
              </button>
            )}

            {isIncorrectPassword && (
              <button
                type="button"
                onClick={openForgotPasswordWithEmail}
                className="w-full py-1.5 px-3 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Reset password for this email</span>
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                required
                autoComplete="email"
                className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-800/60 border border-zinc-700/80 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300">Password</label>
              <button
                type="button"
                onClick={openForgotPasswordWithEmail}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-2.5 bg-zinc-800/60 border border-zinc-700/80 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-zinc-400">Remember email</span>
            </label>

            <button
              type="button"
              onClick={fillDemoCredentials}
              className="text-[11px] text-zinc-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              title="Fill demo email and password"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Fill demo credentials</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In to StudySync</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center text-xs text-zinc-400">
          Don't have an account yet?{' '}
          <button
            type="button"
            onClick={() => onSwitchToRegister(email.trim())}
            className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors underline underline-offset-4"
          >
            Create your account for free
          </button>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        defaultEmail={forgotPasswordDefaultEmail}
        onClose={() => setIsForgotPasswordOpen(false)}
        onSuccess={() => setErrorMessage('')}
      />
    </div>
  );
};
