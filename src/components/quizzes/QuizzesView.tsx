import React, { useState, useEffect } from 'react';
import {
  Brain,
  Plus,
  Sparkles,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Trash2,
  BookOpen,
  X,
  History,
  TrendingUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../lib/api';
import { Quiz, QuizQuestion, QuizResult, Subject, Note } from '../../types';
import { useToast } from '../../context/ToastContext';

interface QuizzesViewProps {
  initialQuizId?: string | null;
  initialNoteId?: string | null;
}

export const QuizzesView: React.FC<QuizzesViewProps> = ({
  initialQuizId,
  initialNoteId,
}) => {
  const { success, error, info } = useToast();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  // Active Quiz Runner State
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [latestResult, setLatestResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // AI Modal
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiSourceText, setAiSourceText] = useState('');
  const [aiNoteId, setAiNoteId] = useState(initialNoteId || '');
  const [aiSubjectId, setAiSubjectId] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);

  const loadData = async () => {
    try {
      const [quizzesRes, resultsRes, subsRes, notesRes] = await Promise.all([
        api.getQuizzes(),
        api.getQuizResults(),
        api.getSubjects(),
        api.getNotes(),
      ]);
      setQuizzes(quizzesRes.quizzes || []);
      setQuizResults(resultsRes.results || []);
      setSubjects(subsRes.subjects || []);
      setNotes(notesRes.notes || []);

      if (initialQuizId) {
        const found = quizzesRes.quizzes.find((q) => q.id === initialQuizId);
        if (found) startQuiz(found);
      }
    } catch (err) {
      console.error('Failed to load quizzes:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialNoteId) {
      setAiNoteId(initialNoteId);
      setIsAIModalOpen(true);
    }
  }, [initialNoteId]);

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setUserAnswers({});
    setCurrentQuestionIdx(0);
    setIsSubmitted(false);
    setLatestResult(null);
  };

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount < activeQuiz.questions.length) {
      if (!confirm(`You have only answered ${answeredCount} of ${activeQuiz.questions.length} questions. Submit anyway?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await api.submitQuiz(activeQuiz.id, userAnswers);
      setLatestResult(res.result);
      setQuizResults((prev) => [res.result, ...prev]);
      setIsSubmitted(true);

      // Trigger Confetti Celebration if passed!
      if (res.result.percentage >= 60) {
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}
      }
      success(`Quiz submitted! Your score: ${res.result.percentage}%`);
    } catch (err: any) {
      error(err.message || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    try {
      await api.deleteQuiz(quizId);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      if (activeQuiz?.id === quizId) setActiveQuiz(null);
      success('Quiz deleted');
    } catch (err) {
      error('Failed to delete quiz');
    }
  };

  // AI Quiz Generation
  const handleAIGenerateQuiz = async () => {
    if (!aiTopic.trim() && !aiNoteId && !aiSourceText.trim()) {
      error('Please provide a topic or select a note');
      return;
    }

    setAiLoading(true);
    try {
      let chosenTitle = aiTopic.trim();
      if (!chosenTitle && aiNoteId) {
        const n = notes.find((note) => note.id === aiNoteId);
        chosenTitle = n ? `${n.title} Quiz` : 'Self-Assessment Quiz';
      }

      const res = await api.generateQuiz({
        topic: aiTopic.trim(),
        sourceText: aiSourceText.trim(),
        noteId: aiNoteId || undefined,
        questionCount: aiQuestionCount,
        difficulty: aiDifficulty,
      });

      const questions: QuizQuestion[] = res.questions.map((q, idx) => ({
        id: `q_${Date.now()}_${idx}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      }));

      const newQuizRes = await api.createQuiz({
        title: chosenTitle || 'AI Quiz',
        subjectId: aiSubjectId || subjects[0]?.id || '',
        difficulty: aiDifficulty,
        questions,
      });

      setQuizzes((prev) => [newQuizRes.quiz, ...prev]);
      setIsAIModalOpen(false);
      startQuiz(newQuizRes.quiz);
      success('Generated new AI self-assessment quiz!');
    } catch (err: any) {
      error(err.message || 'Failed to generate quiz');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Brain className="w-7 h-7 text-indigo-500" />
            <span>AI Self-Testing Quizzes</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Validate mastery and pinpoint exam weaknesses with instant automated grading.
          </p>
        </div>

        <button
          onClick={() => setIsAIModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate AI Quiz</span>
        </button>
      </div>

      {activeQuiz ? (
        /* QUIZ RUNNER OR RESULTS */
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Top Back Nav */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveQuiz(null)}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Quizzes</span>
            </button>

            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[280px]">
              {activeQuiz.title}
            </span>

            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 uppercase text-zinc-500">
              {activeQuiz.difficulty}
            </span>
          </div>

          {!isSubmitted ? (
            /* Active Quiz Questions */
            <div className="space-y-6">
              {/* Progress header */}
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                <span>Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}</span>
                <span>{Object.keys(userAnswers).length} Answered</span>
              </div>

              {/* Current Question Card */}
              {activeQuiz.questions[currentQuestionIdx] && (
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-6">
                  <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white leading-relaxed">
                    {activeQuiz.questions[currentQuestionIdx].question}
                  </h3>

                  {/* Options */}
                  <div className="space-y-3">
                    {activeQuiz.questions[currentQuestionIdx].options.map((opt, optIdx) => {
                      const isSelected =
                        userAnswers[activeQuiz.questions[currentQuestionIdx].id] === optIdx;

                      return (
                        <div
                          key={optIdx}
                          onClick={() =>
                            handleSelectOption(activeQuiz.questions[currentQuestionIdx].id, optIdx)
                          }
                          className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3.5 ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-950 dark:text-indigo-100 font-semibold shadow-xs'
                              : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-zinc-400 dark:border-zinc-600 text-zinc-500'
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </div>
                          <span className="text-sm leading-relaxed">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation & Submit Controls */}
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIdx === 0}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs disabled:opacity-30 transition-colors"
                >
                  Previous
                </button>

                {currentQuestionIdx < activeQuiz.questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIdx((prev) => prev + 1)}
                    className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2"
                  >
                    <span>{submitting ? 'Evaluating...' : 'Submit & Score Quiz'}</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Results Screen */
            latestResult && (
              <div className="space-y-6">
                <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-5 shadow-xl">
                  <div
                    className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto ${
                      latestResult.percentage >= 80
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : latestResult.percentage >= 50
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-rose-500/10 text-rose-500'
                    }`}
                  >
                    <Award className="w-10 h-10" />
                  </div>

                  <div>
                    <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white">
                      {latestResult.percentage}% Mastery
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                      Scored {latestResult.score} out of {latestResult.total} points
                    </p>
                  </div>

                  {/* Areas for Improvement */}
                  {latestResult.improvementAreas.length > 0 && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left max-w-lg mx-auto">
                      <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4" />
                        <span>High-Yield Revision Focus:</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {latestResult.improvementAreas[0]}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => startQuiz(activeQuiz)}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-colors"
                    >
                      Retake Quiz
                    </button>
                    <button
                      onClick={() => setActiveQuiz(null)}
                      className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      All Quizzes
                    </button>
                  </div>
                </div>

                {/* Question-by-Question Detailed Review */}
                <div className="space-y-4">
                  <h4 className="text-base font-bold text-zinc-900 dark:text-white">Detailed Answer Explanations</h4>

                  {activeQuiz.questions.map((q, qIdx) => {
                    const ans = latestResult.userAnswers.find((a) => a.questionId === q.id);
                    const isCorrect = ans?.isCorrect;

                    return (
                      <div
                        key={q.id}
                        className={`p-5 rounded-2xl border space-y-3 ${
                          isCorrect
                            ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-100'
                            : 'bg-rose-950/20 border-rose-800/40 text-rose-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h5 className="text-sm font-bold text-white">
                            #{qIdx + 1}. {q.question}
                          </h5>
                          {isCorrect ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded shrink-0">
                              <XCircle className="w-3.5 h-3.5" /> Incorrect
                            </span>
                          )}
                        </div>

                        <div className="text-xs space-y-1 text-zinc-300">
                          <div>
                            <span className="font-semibold text-zinc-400">Your Answer: </span>
                            {ans?.selectedAnswer !== undefined && ans.selectedAnswer >= 0
                              ? q.options[ans.selectedAnswer]
                              : 'None selected'}
                          </div>
                          {!isCorrect && (
                            <div className="text-emerald-400 font-semibold">
                              <span>Correct Answer: </span>
                              {q.options[q.correctAnswer]}
                            </div>
                          )}
                        </div>

                        <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-zinc-300 leading-relaxed">
                          <span className="font-bold text-indigo-400">Explanation: </span>
                          {q.explanation}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        /* QUIZ LIBRARY & RECENT RESULTS */
        <div className="space-y-8">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4">Quiz Library</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {quizzes.length === 0 ? (
                <div className="col-span-full py-16 text-center text-zinc-400 space-y-3">
                  <Brain className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700" />
                  <p className="text-sm font-medium">No quizzes created yet.</p>
                  <p className="text-xs text-zinc-500">
                    Use our AI Quiz Generator to automatically test your knowledge on any topic.
                  </p>
                  <button
                    onClick={() => setIsAIModalOpen(true)}
                    className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
                  >
                    Generate First Quiz
                  </button>
                </div>
              ) : (
                quizzes.map((quiz) => {
                  const sub = subjects.find((s) => s.id === quiz.subjectId);
                  const lastResult = quizResults.find((r) => r.quizId === quiz.id);

                  return (
                    <div
                      key={quiz.id}
                      onClick={() => startQuiz(quiz)}
                      className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 hover:border-indigo-500/50 shadow-xs hover:shadow-lg hover:shadow-indigo-500/5 cursor-pointer transition-all group flex flex-col justify-between min-h-[190px]"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          {sub ? (
                            <span
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                              style={{ backgroundColor: `${sub.color}20`, color: sub.color }}
                            >
                              {sub.name}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">General</span>
                          )}

                          <button
                            onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500 rounded transition-opacity"
                            title="Delete Quiz"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <h4 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors line-clamp-2">
                          {quiz.title}
                        </h4>
                      </div>

                      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                        <span>
                          {quiz.questions.length} questions •{' '}
                          {lastResult ? (
                            <span className="font-bold text-emerald-500">{lastResult.percentage}% Score</span>
                          ) : (
                            'Not taken yet'
                          )}
                        </span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                          <span>Start Quiz</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quiz Results History */}
          {quizResults.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Assessment History</h3>
              </div>

              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/60 shadow-xs">
                {quizResults.slice(0, 5).map((res) => (
                  <div key={res.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-white text-sm">{res.quizTitle}</div>
                      <div className="text-zinc-500 text-[11px] mt-0.5">
                        {new Date(res.completedAt).toLocaleDateString()} at{' '}
                        {new Date(res.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div
                          className={`font-extrabold text-base ${
                            res.percentage >= 80 ? 'text-emerald-500' : 'text-amber-500'
                          }`}
                        >
                          {res.percentage}%
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {res.score}/{res.total} pts
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Generate Quiz Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700/80 rounded-3xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsAIModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-800/80 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">AI Quiz Generator</h3>
                <p className="text-xs text-zinc-400">Generate exam-calibrated multiple choice questions</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Generate From Note (Optional)
                </label>
                <select
                  value={aiNoteId}
                  onChange={(e) => {
                    setAiNoteId(e.target.value);
                    if (e.target.value) {
                      const n = notes.find((note) => note.id === e.target.value);
                      if (n) setAiTopic(n.title);
                    }
                  }}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select a note to test yourself on...</option>
                  {notes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Topic / Exam Subject
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Operating Systems Concurrency, Organic Reactions"
                  className="w-full px-3.5 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Questions Count
                  </label>
                  <select
                    value={aiQuestionCount}
                    onChange={(e) => setAiQuestionCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                    <option value={8}>8 Questions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Difficulty
                  </label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="easy">Easy (Fundamentals)</option>
                    <option value="medium">Medium (Standard Exam)</option>
                    <option value="hard">Hard (Advanced Rigor)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleAIGenerateQuiz}
                disabled={aiLoading}
                className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Constructing Exam Questions & Explanations...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate & Launch Quiz</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
