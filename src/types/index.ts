export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  educationLevel: string;
  course: string;
  semester: string;
  theme: 'light' | 'dark' | 'system';
  studyGoals: {
    dailyMinutes: number;
    weeklySessions: number;
    primaryFocus: string;
  };
  notificationPreferences: {
    deadlines: boolean;
    streakReminders: boolean;
    goalAlerts: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
  targetHoursPerWeek: number;
  examDate?: string | null;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  subjectId: string;
  tags: string[];
  color: string;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  subjectId: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'completed';
  dueDate: string;
  estimatedMinutes: number;
  completedAt: string | null;
  createdAt: string;
}

export interface FlashcardItem {
  id: string;
  question: string;
  answer: string;
  difficulty?: 'easy' | 'difficult' | 'unrated';
}

export interface FlashcardDeck {
  id: string;
  userId: string;
  title: string;
  subjectId: string;
  noteId?: string | null;
  cards: FlashcardItem[];
  createdAt: string;
  lastReviewed?: string | null;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  userId: string;
  title: string;
  subjectId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: QuizQuestion[];
  createdAt: string;
}

export interface QuizResult {
  id: string;
  userId: string;
  quizId: string;
  quizTitle: string;
  subjectId: string;
  score: number;
  total: number;
  percentage: number;
  userAnswers: {
    questionId: string;
    selectedAnswer: number;
    isCorrect: boolean;
  }[];
  improvementAreas: string[];
  completedAt: string;
}

export interface StudySession {
  id: string;
  userId: string;
  subjectId: string;
  taskId?: string | null;
  durationMinutes: number;
  sessionType: 'pomodoro' | 'deep_work' | 'custom';
  notes?: string;
  completedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface AIConversation {
  id: string;
  userId: string;
  title: string;
  noteContextId?: string | null;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface StudyPlanSlot {
  id: string;
  time: string;
  subjectId: string;
  taskTitle: string;
  completed: boolean;
}

export interface StudyPlan {
  id: string;
  userId: string;
  date: string;
  slots: StudyPlanSlot[];
  updatedAt: string;
}

export interface DashboardStats {
  streak: number;
  totalHours: number;
  totalSessions: number;
  notesCount: number;
  completedTasksCount: number;
  pendingTasksCount: number;
  quizzesTaken: number;
  averageScore: number;
}
