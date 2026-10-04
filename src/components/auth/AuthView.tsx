import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const AuthView: React.FC = () => {
  const { loginWithEmail, signupWithEmail, loginWithGoogle, quickLoginAsTestUser, resetPassword } = useAuth();
  const { success, error } = useToast();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showFirebaseInfo, setShowFirebaseInfo] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        if (!password) {
          error('Please enter your password');
          setLoading(false);
          return;
        }
        await loginWithEmail(email.trim(), password);
        success('Signed in successfully! Starting with your clean workspace.');
      } else if (mode === 'signup') {
        if (password.length < 6) {
          error('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        await signupWithEmail(email.trim(), password, name.trim());
        success('Account created! Your private workspace starts with 0 data.');
      } else if (mode === 'forgot') {
        await resetPassword(email.trim());
        setResetSent(true);
        success('Password reset link processed.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Authentication failed';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
        msg = 'Invalid email or password. Please verify your credentials.';
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'An account with this email already exists. Try signing in instead.';
      } else if (msg.includes('auth/weak-password')) {
        msg = 'Password is too weak. Please use at least 6 characters.';
      } else if (msg.includes('auth/invalid-email')) {
        msg = 'Please enter a valid email address.';
      }
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      success('Signed in with Google!');
    } catch (err: any) {
      if (!err.message?.includes('popup-closed-by-user')) {
        error(err.message || 'Google sign in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestUser = async (userType: 'alice' | 'bob') => {
    setLoading(true);
    try {
      await quickLoginAsTestUser(userType);
      success(
        userType === 'alice'
          ? 'Signed in as Alice (User A) with 0 data!'
          : 'Signed in as Bob (User B) with 0 data!'
      );
    } catch (err: any) {
      error(err.message || 'Failed to switch test account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 ring-1 ring-white/20">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-1.5">
              StudySync
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                AI Hub
              </span>
            </h1>
            <p className="text-xs text-zinc-400 font-medium">Multi-User Isolated Study Platform</p>
          </div>
        </div>

        {/* Firebase Authentication Notice Box */}
        {showFirebaseInfo && (
          <div className="mt-3 p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-800/50 text-xs text-zinc-300 space-y-1.5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-indigo-400">
                <Info className="w-4 h-4 shrink-0" />
                <span>Why was Firebase Auth showing errors?</span>
              </div>
              <button
                type="button"
                onClick={() => setShowFirebaseInfo(false)}
                className="text-zinc-500 hover:text-zinc-300 text-[10px]"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              In newly provisioned Firebase projects, <strong>Email/Password is disabled by default</strong> until toggled in the Firebase Console (<em>Authentication &gt; Sign-in method &gt; Email/Password</em>).
            </p>
            <p className="text-[11px] text-indigo-300/90 font-medium">
              We added auto-resilience: You can sign up with any email, use Google, or click the 1-click test buttons below. Every user starts with strictly <strong>0 notes, 0 subjects, 0 data</strong>!
            </p>
          </div>
        )}

        {/* Main Card */}
        <div className="mt-4 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl">
          {/* Mode Switcher Tabs */}
          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-800/80 rounded-2xl mb-5 border border-zinc-700/50">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === 'signin'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === 'signup'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Create Account (0 Data)
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setResetSent(false);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 mb-2"
              >
                ← Back to Sign In
              </button>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-400" />
                Reset Password
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Enter your email address to receive password recovery details.
              </p>
            </div>
          )}

          {resetSent ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs font-semibold text-emerald-300">
                Password recovery sent to <span className="underline">{email}</span>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setResetSent(false);
                }}
                className="mt-2 text-xs font-bold text-indigo-400 hover:text-indigo-300"
              >
                Return to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Your Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Vance"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/60 border border-zinc-700 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
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
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/60 border border-zinc-700 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-zinc-300">Password</label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-10 py-2.5 bg-zinc-800/60 border border-zinc-700 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === 'signin'
                        ? 'Sign In to Workspace'
                        : mode === 'signup'
                        ? 'Create Workspace (Starts with 0 Data)'
                        : 'Send Recovery Link'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Google Sign In Divider */}
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-white text-xs font-semibold border border-zinc-700/80 transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.41 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.59 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Quick Test Users Section */}
          <div className="mt-4 pt-3.5 border-t border-zinc-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                Instant Test Accounts (0 Data)
              </span>
              <span className="text-[10px] text-zinc-500 font-medium">Verify isolation</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTestUser('alice')}
                disabled={loading}
                className="py-2 px-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold transition-all text-center"
              >
                👩‍🎓 Alice (User A)
              </button>
              <button
                type="button"
                onClick={() => handleTestUser('bob')}
                disabled={loading}
                className="py-2 px-2.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[11px] font-bold transition-all text-center"
              >
                👨‍🎓 Bob (User B)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
