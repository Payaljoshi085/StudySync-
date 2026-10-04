import {
  User,
  Subject,
  Note,
  Task,
  FlashcardDeck,
  Quiz,
  QuizResult,
  StudySession,
  StudyPlan,
  AIConversation,
  DashboardStats,
} from '../types';

const TOKEN_KEY = 'studysync_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {}
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (body: any) => request<{ token: string; user: User; message: string }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request<{ token: string; user: User; message: string }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  demoLogin: () => request<{ token: string; user: User; message: string }>('/auth/demo-login', { method: 'POST' }),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
  getMe: () => request<{ user: User; token?: string }>('/auth/me'),
  forgotPassword: (email: string) => request<{ message: string; resetToken?: string; userEmail?: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (body: any) => request<{ message: string; token?: string; user?: User }>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),

  // User Profile
  updateProfile: (updates: Partial<User>) => request<{ message: string; user: User }>('/user/profile', { method: 'PUT', body: JSON.stringify(updates) }),
  changePassword: (body: any) => request<{ message: string }>('/user/change-password', { method: 'POST', body: JSON.stringify(body) }),
  deleteAccount: () => request<{ message: string }>('/user/account', { method: 'DELETE' }),

  // Dashboard
  getDashboard: () => request<{
    stats: DashboardStats;
    todayTasks: Task[];
    pendingTasks: Task[];
    upcomingDeadlines: Task[];
    recentNotes: Note[];
    weeklyProgress: { date: string; day: string; hours: number }[];
    subjectDistribution: { id: string; name: string; color: string; hours: number; notesCount: number }[];
    recommendations: string[];
  }>('/dashboard'),

  // Subjects
  getSubjects: () => request<{ subjects: Subject[] }>('/subjects'),
  createSubject: (body: Partial<Subject>) => request<{ subject: Subject }>('/subjects', { method: 'POST', body: JSON.stringify(body) }),
  updateSubject: (id: string, body: Partial<Subject>) => request<{ subject: Subject }>(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSubject: (id: string) => request<{ message: string }>(`/subjects/${id}`, { method: 'DELETE' }),

  // Notes
  getNotes: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ notes: Note[] }>(`/notes${qs ? `?${qs}` : ''}`);
  },
  getNote: (id: string) => request<{ note: Note }>(`/notes/${id}`),
  createNote: (body: Partial<Note>) => request<{ note: Note }>('/notes', { method: 'POST', body: JSON.stringify(body) }),
  updateNote: (id: string, body: Partial<Note>) => request<{ note: Note }>(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  duplicateNote: (id: string) => request<{ note: Note }>(`/notes/${id}/duplicate`, { method: 'POST' }),
  deleteNote: (id: string) => request<{ message: string }>(`/notes/${id}`, { method: 'DELETE' }),

  // Tasks
  getTasks: () => request<{ tasks: Task[] }>('/tasks'),
  createTask: (body: Partial<Task>) => request<{ task: Task }>('/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id: string, body: Partial<Task>) => request<{ task: Task }>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTask: (id: string) => request<{ message: string }>(`/tasks/${id}`, { method: 'DELETE' }),

  // Flashcards
  getFlashcardDecks: () => request<{ decks: FlashcardDeck[] }>('/flashcards'),
  getFlashcardDeck: (id: string) => request<{ deck: FlashcardDeck }>(`/flashcards/${id}`),
  createFlashcardDeck: (body: Partial<FlashcardDeck>) => request<{ deck: FlashcardDeck }>('/flashcards', { method: 'POST', body: JSON.stringify(body) }),
  updateFlashcardDeck: (id: string, body: Partial<FlashcardDeck>) => request<{ deck: FlashcardDeck }>(`/flashcards/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteFlashcardDeck: (id: string) => request<{ message: string }>(`/flashcards/${id}`, { method: 'DELETE' }),

  // Quizzes
  getQuizzes: () => request<{ quizzes: Quiz[] }>('/quizzes'),
  getQuiz: (id: string) => request<{ quiz: Quiz }>(`/quizzes/${id}`),
  createQuiz: (body: Partial<Quiz>) => request<{ quiz: Quiz }>('/quizzes', { method: 'POST', body: JSON.stringify(body) }),
  deleteQuiz: (id: string) => request<{ message: string }>(`/quizzes/${id}`, { method: 'DELETE' }),
  submitQuiz: (id: string, answers: Record<string, number>) => request<{ result: QuizResult }>(`/quizzes/${id}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }),
  getQuizResults: () => request<{ results: QuizResult[] }>('/quiz-results'),

  // Study Sessions
  getStudySessions: () => request<{ sessions: StudySession[] }>('/study-sessions'),
  logStudySession: (body: Partial<StudySession>) => request<{ session: StudySession }>('/study-sessions', { method: 'POST', body: JSON.stringify(body) }),

  // Planner
  getPlanner: (date?: string) => request<{ plan: StudyPlan | null }>(`/planner${date ? `?date=${date}` : ''}`),
  savePlanner: (date: string, slots: any[]) => request<{ plan: StudyPlan }>('/planner', { method: 'POST', body: JSON.stringify({ date, slots }) }),
  autoSchedule: (date: string) => request<{ plan: StudyPlan }>('/planner/auto-schedule', { method: 'POST', body: JSON.stringify({ date }) }),

  // Search
  search: (q: string) => request<{
    notes: Note[];
    tasks: Task[];
    flashcards: FlashcardDeck[];
    quizzes: Quiz[];
    subjects: Subject[];
  }>(`/search?q=${encodeURIComponent(q)}`),

  // AI Service
  generateNotes: (body: { topic: string; sourceText?: string; mode?: string; subjectId?: string }) =>
    request<{ note: { title: string; content: string; tags: string[] } }>('/ai/generate-notes', { method: 'POST', body: JSON.stringify(body) }),
  chat: (body: { messages: any[]; noteContextId?: string | null; conversationId?: string }) =>
    request<{ role: string; content: string }>('/ai/chat', { method: 'POST', body: JSON.stringify(body) }),
  getConversations: () => request<{ conversations: AIConversation[] }>('/ai/conversations'),
  getConversation: (id: string) => request<{ conversation: AIConversation }>(`/ai/conversations/${id}`),
  createConversation: (title?: string, noteContextId?: string | null) =>
    request<{ conversation: AIConversation }>('/ai/conversations', { method: 'POST', body: JSON.stringify({ title, noteContextId }) }),
  deleteConversation: (id: string) => request<{ message: string }>(`/ai/conversations/${id}`, { method: 'DELETE' }),
  generateFlashcards: (body: { topic?: string; sourceText?: string; count?: number; noteId?: string }) =>
    request<{ cards: { question: string; answer: string }[] }>('/ai/generate-flashcards', { method: 'POST', body: JSON.stringify(body) }),
  generateQuiz: (body: { topic?: string; sourceText?: string; questionCount?: number; difficulty?: string; noteId?: string }) =>
    request<{ questions: any[] }>('/ai/generate-quiz', { method: 'POST', body: JSON.stringify(body) }),
};
