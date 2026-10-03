import React from 'react';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  Bot,
  Layers,
  Brain,
  CheckSquare,
  CalendarDays,
  Timer,
  BarChart3,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
  Lock,
  Users,
} from 'lucide-react';

interface LandingPageProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  onTryDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenRegister,
  onOpenLogin,
  onTryDemo,
}) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-6 lg:px-12 h-18 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              StudySync
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                PRO
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onTryDemo}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors border border-zinc-800"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Try Demo (1-Click)</span>
          </button>
          <button
            onClick={onOpenLogin}
            className="px-4 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded-xl transition-colors"
          >
            Log In
          </button>
          <button
            onClick={onOpenRegister}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-6 lg:px-12 max-w-6xl mx-auto text-center flex flex-col items-center overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 text-xs font-semibold mb-8 shadow-xs">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Next-Generation AI Study & Academic OS</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
          Study Smarter. <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
            Stay Organized.
          </span>{' '}
          Achieve More.
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl leading-relaxed mb-10">
          StudySync is your personalized AI-powered study companion for structured notes, active recall flashcards, self-grading quizzes, focused Pomodoro sessions, and exam-ready planning.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <button
            onClick={onOpenRegister}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-xl shadow-indigo-600/35 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={onTryDemo}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-semibold text-base border border-zinc-700/80 transition-all flex items-center justify-center gap-2.5"
          >
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>Explore Demo Student</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-zinc-400 font-medium">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Private & Isolated Accounts</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span>Powered by Gemini AI</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
            <span>Zero Slop • High-Yield Retention</span>
          </div>
        </div>

        {/* Hero Interactive App Preview */}
        <div className="mt-16 w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4 shadow-2xl backdrop-blur-md">
          <div className="rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-950 p-6 text-left">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-mono text-zinc-500">studysync.ai / workspace</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/50">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Focus Session: 25:00
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">AI Study Note</span>
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Transformer Attention Mechanics</h4>
                <p className="text-xs text-zinc-400 line-clamp-2">
                  Q, K, V matrix projections scaled by sqrt(d_k) to prevent softmax gradient saturation...
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Smart Flashcard</span>
                  <Layers className="w-4 h-4 text-purple-400" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">What is Dijkstra's Optimal Bound?</h4>
                <p className="text-xs text-zinc-400">
                  O((V + E) log V) with Min-Priority Queue for sparse non-negative graphs.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Study Streak</span>
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-extrabold text-white mb-0.5">14 Days 🔥</div>
                <p className="text-xs text-zinc-400">Top 5% consistency this semester</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="py-20 px-6 lg:px-12 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Built For Academic Excellence</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Everything You Need To Master Any Subject
          </h3>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto mt-3">
            Say goodbye to scattered notebooks, disorganized PDFs, and passive cramming. StudySync turns your raw materials into active mastery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: AI Study Assistant */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-indigo-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-indigo-950 border border-indigo-800/80 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
              <Bot className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">AI Study Assistant</h4>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Tutor trained specifically for student queries. Ask questions about your own notes, get step-by-step math breakdowns, and demystify complex theories.
            </p>
          </div>

          {/* Card 2: Smart Notes */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-indigo-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-purple-950 border border-purple-800/80 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Smart Notes System</h4>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Rich text editor with checklists, code blocks, color-coded subjects, autosave, and instantaneous AI high-yield note generation.
            </p>
          </div>

          {/* Card 3: AI Flashcards */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-indigo-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-blue-950 border border-blue-800/80 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Interactive Flashcards</h4>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Turn any topic or lecture note into spaced repetition active recall cards with smooth 3D flip physics and difficulty tracking.
            </p>
          </div>

          {/* Card 4: AI Quizzes */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-indigo-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-amber-950 border border-amber-800/80 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
              <Brain className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">AI Quiz Generator</h4>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Generate timed multiple-choice self-assessments from your notes with automatic grading, in-depth answer explanations, and weak area analysis.
            </p>
          </div>

          {/* Card 5: Focus Mode */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-indigo-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-800/80 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
              <Timer className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Pomodoro Focus Timer</h4>
            <p className="text-sm text-zinc-400 leading-relaxed">
              25/5 and 50/10 deep work timers connected directly to your subjects and tasks. Auto-logs focus hours and builds your daily study streak.
            </p>
          </div>

          {/* Card 6: Study Planner & Analytics */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-indigo-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-rose-950 border border-rose-800/80 flex items-center justify-center text-rose-400 mb-4 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Planner & Analytics</h4>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Exam countdown countdowns, weekly study hours charts, task Kanban boards, and smart scheduling based on pending priorities.
            </p>
          </div>
        </div>
      </section>

      {/* Security & Isolation Section */}
      <section className="py-16 px-6 lg:px-12 max-w-4xl mx-auto text-center border-t border-zinc-800/80">
        <div className="p-8 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800">
          <Shield className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Your Private Academic Sanctuary</h3>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed mb-6">
            Every student gets an isolated, secure workspace. Your personal notes, quiz scores, focus sessions, and tasks belong solely to you.
          </p>
          <button
            onClick={onOpenRegister}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-colors"
          >
            Start Studying Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-800/80 bg-zinc-950 px-6 lg:px-12 py-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-zinc-400">StudySync Platform</span>
          <span>© {new Date().getFullYear()} All Rights Reserved.</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={onOpenLogin} className="hover:text-zinc-300 transition-colors">
            Login
          </button>
          <button onClick={onOpenRegister} className="hover:text-zinc-300 transition-colors">
            Sign Up
          </button>
          <button onClick={onTryDemo} className="hover:text-amber-400 transition-colors">
            Demo Account
          </button>
        </div>
      </footer>
    </div>
  );
};
