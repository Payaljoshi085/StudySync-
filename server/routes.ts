import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db, User, QuizResult } from './db.js';
import { AIService } from './aiService.js';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: User;
}

export const router = Router();

// Middleware to require authentication (seamless auto-fallback to primary user workspace)
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.studysync_token) {
    token = req.cookies.studysync_token;
  }

  let user: User | undefined;
  if (token) {
    const session = db.getSession(token);
    if (session) {
      user = db.findUserById(session.userId);
    }
  }

  if (!user) {
    user = db.getPrimaryUser();
  }

  req.userId = user.id;
  req.user = user;
  next();
}

function sanitizeUser(user: User) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// ----------------------------------------------------
// AUTHENTICATION ROUTES
// ----------------------------------------------------

router.post('/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, password, confirmPassword, educationLevel, course, semester, avatar } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const existing = db.findUserByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({
        error: 'An account with this email address already exists. Please sign in instead.',
        alreadyExists: true,
        email: cleanEmail,
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const user = db.createUser({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
      educationLevel: educationLevel || 'College / University',
      course: course || 'General Studies',
      semester: semester || 'Year 1',
      theme: 'dark',
      studyGoals: {
        dailyMinutes: 120,
        weeklySessions: 10,
        primaryFocus: course || 'Academic Excellence',
      },
      notificationPreferences: {
        deadlines: true,
        streakReminders: true,
        goalAlerts: true,
      },
    });

    const token = db.createSession(user.id);
    return res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Failed to create account.' });
  }
});

router.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({
        error: 'No account found with this email. Please check your spelling or sign up below.',
        notFound: true,
        email: cleanEmail,
      });
    }

    const match = bcrypt.compareSync(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({
        error: 'Incorrect password. Please verify your password or use "Forgot password?" to reset it.',
        incorrectPassword: true,
        email: cleanEmail,
      });
    }

    const token = db.createSession(user.id);
    return res.json({
      message: 'Login successful!',
      token,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to login.' });
  }
});

router.post('/auth/demo-login', (req: Request, res: Response) => {
  try {
    let demoUser = db.findUserByEmail('demo@studysync.edu');
    if (!demoUser) {
      // Re-seed demo user if somehow missing
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync('StudySync@2026', salt);
      demoUser = db.createUser({
        name: 'Alex Vance',
        email: 'demo@studysync.edu',
        passwordHash,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        educationLevel: 'Undergraduate',
        course: 'Computer Science & AI',
        semester: '4th Semester (Year 2)',
        theme: 'dark',
        studyGoals: {
          dailyMinutes: 180,
          weeklySessions: 12,
          primaryFocus: 'Data Structures & Distributed Systems',
        },
        notificationPreferences: {
          deadlines: true,
          streakReminders: true,
          goalAlerts: true,
        },
      });
    }

    const token = db.createSession(demoUser.id);
    return res.json({
      message: 'Logged in as Demo Student!',
      token,
      user: sanitizeUser(demoUser),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to login to demo account.' });
  }
});

router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.substring(7)
    : db.createSession(req.user!.id);

  return res.json({
    token,
    user: sanitizeUser(req.user!),
  });
});

router.post('/auth/logout', (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    db.deleteSession(authHeader.substring(7));
  }
  return res.json({ message: 'Logged out successfully.' });
});

router.post('/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = db.findUserByEmail(cleanEmail);
  if (!user) {
    return res.status(404).json({
      error: 'No account registered with this email address. Please sign up to create your account.',
      notFound: true,
    });
  }

  const resetToken = db.createPasswordReset(user.id);
  return res.json({
    message: 'Password reset link generated. You may now enter your new password.',
    resetToken,
    userEmail: cleanEmail,
  });
});

router.post('/auth/reset-password', (req: Request, res: Response) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Reset token and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  if (confirmPassword && newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  const userId = db.verifyPasswordReset(token);
  if (!userId) {
    return res.status(400).json({ error: 'Password reset link is invalid or has expired.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(newPassword, salt);
  db.updateUser(userId, { passwordHash });
  db.consumePasswordReset(token);

  // Automatically log user in upon resetting their password!
  const sessionToken = db.createSession(userId);
  const user = db.findUserById(userId);

  return res.json({
    message: 'Password has been reset successfully!',
    token: sessionToken,
    user: user ? sanitizeUser(user) : null,
  });
});

// ----------------------------------------------------
// USER PROFILE & SETTINGS
// ----------------------------------------------------

router.put('/user/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { name, avatar, educationLevel, course, semester, studyGoals, notificationPreferences, theme } = req.body;

  const updates: Partial<User> = {};
  if (name !== undefined) updates.name = name.trim();
  if (avatar !== undefined) updates.avatar = avatar;
  if (educationLevel !== undefined) updates.educationLevel = educationLevel;
  if (course !== undefined) updates.course = course;
  if (semester !== undefined) updates.semester = semester;
  if (studyGoals !== undefined) updates.studyGoals = studyGoals;
  if (notificationPreferences !== undefined) updates.notificationPreferences = notificationPreferences;
  if (theme !== undefined) updates.theme = theme;

  const updated = db.updateUser(req.userId!, updates);
  if (!updated) {
    return res.status(404).json({ error: 'User not found.' });
  }

  return res.json({
    message: 'Profile updated successfully!',
    user: sanitizeUser(updated),
  });
});

router.post('/user/change-password', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const user = db.findUserById(req.userId!);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const valid = bcrypt.compareSync(currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(400).json({ error: 'Incorrect current password.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(newPassword, salt);
  db.updateUser(user.id, { passwordHash });

  return res.json({ message: 'Password changed successfully.' });
});

router.delete('/user/account', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const deleted = db.deleteUser(req.userId!);
  if (deleted) {
    return res.json({ message: 'Your account and all associated study data have been deleted.' });
  }
  return res.status(500).json({ error: 'Failed to delete account.' });
});

// ----------------------------------------------------
// DASHBOARD & ANALYTICS
// ----------------------------------------------------

router.get('/dashboard', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const user = req.user!;

  const notes = db.getNotes(userId);
  const tasks = db.getTasks(userId);
  const subjects = db.getSubjects(userId);
  const sessions = db.getStudySessions(userId);
  const quizzes = db.getQuizzes(userId);
  const quizResults = db.getQuizResults(userId);

  // Calculate Streak & Total Study Time
  const totalMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  // Streak calculation (consecutive days with completed sessions)
  const sessionDates = Array.from(
    new Set(sessions.map(s => s.completedAt.split('T')[0]))
  ).sort().reverse();

  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let checkDate = sessionDates.includes(today) ? today : (sessionDates.includes(yesterday) ? yesterday : null);
  if (checkDate) {
    let curr = new Date(checkDate);
    while (true) {
      const dStr = curr.toISOString().split('T')[0];
      if (sessionDates.includes(dStr)) {
        streak++;
        curr.setDate(curr.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Today's Tasks
  const todayTasks = tasks.filter(t => t.dueDate === today);
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  // Weekly study hours breakdown (last 7 days)
  const weekDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    const daySessions = sessions.filter(s => s.completedAt.startsWith(dateStr));
    const dayMins = daySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    weekDays.push({
      date: dateStr,
      day: dayLabel,
      hours: Math.round((dayMins / 60) * 10) / 10,
    });
  }

  // Subject-wise study time
  const subjectDistribution = subjects.map(sub => {
    const subSessions = sessions.filter(s => s.subjectId === sub.id);
    const mins = subSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    return {
      id: sub.id,
      name: sub.name,
      color: sub.color,
      hours: Math.round((mins / 60) * 10) / 10,
      notesCount: notes.filter(n => n.subjectId === sub.id).length,
    };
  });

  // Upcoming deadlines (next 7 days)
  const upcomingDeadlines = tasks
    .filter(t => t.status !== 'completed' && t.dueDate)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  // Recent notes
  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  // AI Recommendations
  const recommendations: string[] = [];
  if (pendingTasks.some(t => t.priority === 'high')) {
    recommendations.push(`Priority Alert: High priority tasks due soon. Consider starting with "${pendingTasks.find(t => t.priority === 'high')?.title}".`);
  }
  if (streak > 0) {
    recommendations.push(`Great momentum! You're on a ${streak}-day study streak. Keep it active with a 25-minute Pomodoro session today.`);
  } else {
    recommendations.push(`Kickstart your focus: Log a 25-minute session today to ignite your new study streak!`);
  }
  if (notes.length > 0 && flashcardDecksCount(userId) === 0) {
    recommendations.push(`Convert your note "${notes[0].title}" into active recall flashcards with 1-click AI.`);
  }

  return res.json({
    stats: {
      streak,
      totalHours,
      totalSessions: sessions.length,
      notesCount: notes.length,
      completedTasksCount: completedTasks.length,
      pendingTasksCount: pendingTasks.length,
      quizzesTaken: quizResults.length,
      averageScore: quizResults.length > 0
        ? Math.round(quizResults.reduce((acc, r) => acc + r.percentage, 0) / quizResults.length)
        : 0,
    },
    todayTasks,
    pendingTasks: pendingTasks.slice(0, 6),
    upcomingDeadlines,
    recentNotes,
    weeklyProgress: weekDays,
    subjectDistribution,
    recommendations,
  });
});

function flashcardDecksCount(userId: string): number {
  return db.getFlashcardDecks(userId).length;
}

// ----------------------------------------------------
// SUBJECTS
// ----------------------------------------------------

router.get('/subjects', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const subjects = db.getSubjects(req.userId!);
  return res.json({ subjects });
});

router.post('/subjects', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { name, color, icon, targetHoursPerWeek, examDate } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Subject name is required.' });
  }

  const subject = db.createSubject(req.userId!, {
    name: name.trim(),
    color: color || '#3B82F6',
    icon: icon || 'BookOpen',
    targetHoursPerWeek: Number(targetHoursPerWeek) || 5,
    examDate: examDate || null,
  });

  return res.status(201).json({ subject });
});

router.put('/subjects/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updated = db.updateSubject(req.userId!, req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Subject not found.' });
  }
  return res.json({ subject: updated });
});

router.delete('/subjects/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const deleted = db.deleteSubject(req.userId!, req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Subject not found.' });
  }
  return res.json({ message: 'Subject deleted.' });
});

// ----------------------------------------------------
// NOTES
// ----------------------------------------------------

router.get('/notes', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  let notes = db.getNotes(userId);

  const { subjectId, search, tag, isArchived, isFavorite, isPinned, sortBy } = req.query;

  if (isArchived === 'true') {
    notes = notes.filter(n => n.isArchived);
  } else {
    notes = notes.filter(n => !n.isArchived);
  }

  if (subjectId) {
    notes = notes.filter(n => n.subjectId === subjectId);
  }

  if (isFavorite === 'true') {
    notes = notes.filter(n => n.isFavorite);
  }

  if (isPinned === 'true') {
    notes = notes.filter(n => n.isPinned);
  }

  if (tag) {
    notes = notes.filter(n => n.tags.includes(String(tag)));
  }

  if (search) {
    const q = String(search).toLowerCase();
    notes = notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  // Sort
  notes.sort((a, b) => {
    // Pinned notes always surface first in regular list
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'created') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    // Default sortBy updated
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return res.json({ notes });
});

router.get('/notes/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const note = db.getNote(req.userId!, req.params.id);
  if (!note) {
    return res.status(404).json({ error: 'Note not found.' });
  }
  return res.json({ note });
});

router.post('/notes', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { title, content, subjectId, tags, color, isPinned, isFavorite } = req.body;

  const note = db.createNote(req.userId!, {
    title: (title || 'Untitled Note').trim(),
    content: content || '<p></p>',
    subjectId: subjectId || '',
    tags: Array.isArray(tags) ? tags : [],
    color: color || '#3B82F6',
    isPinned: Boolean(isPinned),
    isFavorite: Boolean(isFavorite),
    isArchived: false,
  });

  return res.status(201).json({ note });
});

router.put('/notes/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updated = db.updateNote(req.userId!, req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Note not found.' });
  }
  return res.json({ note: updated });
});

router.post('/notes/:id/duplicate', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const original = db.getNote(req.userId!, req.params.id);
  if (!original) {
    return res.status(404).json({ error: 'Note not found.' });
  }

  const duplicated = db.createNote(req.userId!, {
    title: `${original.title} (Copy)`,
    content: original.content,
    subjectId: original.subjectId,
    tags: [...original.tags],
    color: original.color,
    isPinned: false,
    isFavorite: false,
    isArchived: false,
  });

  return res.status(201).json({ note: duplicated });
});

router.delete('/notes/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const deleted = db.deleteNote(req.userId!, req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Note not found.' });
  }
  return res.json({ message: 'Note deleted.' });
});

// ----------------------------------------------------
// TASKS
// ----------------------------------------------------

router.get('/tasks', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const tasks = db.getTasks(req.userId!);
  return res.json({ tasks });
});

router.post('/tasks', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { title, description, subjectId, priority, status, dueDate, estimatedMinutes } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Task title is required.' });
  }

  const task = db.createTask(req.userId!, {
    title: title.trim(),
    description: description || '',
    subjectId: subjectId || '',
    priority: priority || 'medium',
    status: status || 'todo',
    dueDate: dueDate || new Date().toISOString().split('T')[0],
    estimatedMinutes: Number(estimatedMinutes) || 30,
    completedAt: status === 'completed' ? new Date().toISOString() : null,
  });

  return res.status(201).json({ task });
});

router.put('/tasks/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updates = { ...req.body };
  if (updates.status === 'completed' && !updates.completedAt) {
    updates.completedAt = new Date().toISOString();
  } else if (updates.status && updates.status !== 'completed') {
    updates.completedAt = null;
  }

  const updated = db.updateTask(req.userId!, req.params.id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Task not found.' });
  }
  return res.json({ task: updated });
});

router.delete('/tasks/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const deleted = db.deleteTask(req.userId!, req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found.' });
  }
  return res.json({ message: 'Task deleted.' });
});

// ----------------------------------------------------
// FLASHCARDS
// ----------------------------------------------------

router.get('/flashcards', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const decks = db.getFlashcardDecks(req.userId!);
  return res.json({ decks });
});

router.get('/flashcards/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const deck = db.getFlashcardDeck(req.userId!, req.params.id);
  if (!deck) {
    return res.status(404).json({ error: 'Flashcard deck not found.' });
  }
  return res.json({ deck });
});

router.post('/flashcards', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { title, subjectId, noteId, cards } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Deck title is required.' });
  }

  const deck = db.createFlashcardDeck(req.userId!, {
    title: title.trim(),
    subjectId: subjectId || '',
    noteId: noteId || null,
    cards: Array.isArray(cards) ? cards : [],
    lastReviewed: null,
  });

  return res.status(201).json({ deck });
});

router.put('/flashcards/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updated = db.updateFlashcardDeck(req.userId!, req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Flashcard deck not found.' });
  }
  return res.json({ deck: updated });
});

router.delete('/flashcards/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const deleted = db.deleteFlashcardDeck(req.userId!, req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Flashcard deck not found.' });
  }
  return res.json({ message: 'Deck deleted.' });
});

// ----------------------------------------------------
// QUIZZES & QUIZ RESULTS
// ----------------------------------------------------

router.get('/quizzes', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const quizzes = db.getQuizzes(req.userId!);
  return res.json({ quizzes });
});

router.get('/quizzes/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const quiz = db.getQuiz(req.userId!, req.params.id);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found.' });
  }
  return res.json({ quiz });
});

router.post('/quizzes', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { title, subjectId, difficulty, questions } = req.body;
  if (!title || !questions || !questions.length) {
    return res.status(400).json({ error: 'Title and questions are required.' });
  }

  const quiz = db.createQuiz(req.userId!, {
    title: title.trim(),
    subjectId: subjectId || '',
    difficulty: difficulty || 'medium',
    questions,
  });

  return res.status(201).json({ quiz });
});

router.delete('/quizzes/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const deleted = db.deleteQuiz(req.userId!, req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Quiz not found.' });
  }
  return res.json({ message: 'Quiz deleted.' });
});

router.post('/quizzes/:id/submit', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const quiz = db.getQuiz(req.userId!, req.params.id);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found.' });
  }

  const { answers } = req.body; // Record<string, number>
  let score = 0;
  const userAnswers: QuizResult['userAnswers'] = [];
  const wrongTopics: string[] = [];

  quiz.questions.forEach(q => {
    const selected = answers ? answers[q.id] : -1;
    const isCorrect = selected === q.correctAnswer;
    if (isCorrect) {
      score++;
    } else {
      wrongTopics.push(q.question);
    }
    userAnswers.push({
      questionId: q.id,
      selectedAnswer: selected,
      isCorrect,
    });
  });

  const total = quiz.questions.length;
  const percentage = Math.round((score / total) * 100);

  const improvementAreas: string[] = [];
  if (wrongTopics.length > 0) {
    improvementAreas.push(`Review key concepts related to: ${wrongTopics.slice(0, 2).map(q => q.slice(0, 45) + '...').join('; ')}`);
  } else {
    improvementAreas.push('Outstanding mastery! Ready to tackle higher difficulty challenges.');
  }

  const result = db.saveQuizResult(req.userId!, {
    quizId: quiz.id,
    quizTitle: quiz.title,
    subjectId: quiz.subjectId,
    score,
    total,
    percentage,
    userAnswers,
    improvementAreas,
  });

  return res.json({ result });
});

router.get('/quiz-results', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const results = db.getQuizResults(req.userId!);
  return res.json({ results });
});

// ----------------------------------------------------
// STUDY SESSIONS & FOCUS MODE
// ----------------------------------------------------

router.get('/study-sessions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const sessions = db.getStudySessions(req.userId!);
  return res.json({ sessions });
});

router.post('/study-sessions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { subjectId, taskId, durationMinutes, sessionType, notes } = req.body;

  if (!durationMinutes || Number(durationMinutes) <= 0) {
    return res.status(400).json({ error: 'Valid duration is required.' });
  }

  const session = db.logStudySession(req.userId!, {
    subjectId: subjectId || '',
    taskId: taskId || null,
    durationMinutes: Number(durationMinutes),
    sessionType: sessionType || 'pomodoro',
    notes: notes || '',
  });

  return res.status(201).json({ session });
});

// ----------------------------------------------------
// STUDY PLANNER
// ----------------------------------------------------

router.get('/planner', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const date = String(req.query.date || new Date().toISOString().split('T')[0]);
  const plan = db.getStudyPlan(req.userId!, date);
  return res.json({ plan });
});

router.post('/planner', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { date, slots } = req.body;
  if (!date || !Array.isArray(slots)) {
    return res.status(400).json({ error: 'Date and slots array are required.' });
  }

  const plan = db.saveStudyPlan(req.userId!, date, slots);
  return res.json({ plan });
});

router.post('/planner/auto-schedule', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const tasks = db.getTasks(userId).filter(t => t.status !== 'completed');
  const subjects = db.getSubjects(userId);

  const date = String(req.body.date || new Date().toISOString().split('T')[0]);

  // Generate automated smart schedule blocks
  const timeSlots = [
    '09:00 - 10:00',
    '10:30 - 11:30',
    '13:00 - 14:00',
    '14:30 - 15:30',
    '16:30 - 17:30',
    '19:00 - 20:00',
  ];

  const slots = tasks.slice(0, 4).map((t, idx) => ({
    id: `slot_${idx + 1}`,
    time: timeSlots[idx] || '20:00 - 21:00',
    subjectId: t.subjectId || (subjects[0]?.id || ''),
    taskTitle: t.title,
    completed: false,
  }));

  const plan = db.saveStudyPlan(userId, date, slots);
  return res.json({ plan });
});

// ----------------------------------------------------
// GLOBAL SEARCH
// ----------------------------------------------------

router.get('/search', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) {
    return res.json({ notes: [], tasks: [], flashcards: [], quizzes: [], subjects: [] });
  }

  const userId = req.userId!;
  const notes = db.getNotes(userId).filter(n =>
    n.title.toLowerCase().includes(q) ||
    n.content.toLowerCase().includes(q) ||
    n.tags.some(t => t.toLowerCase().includes(q))
  ).slice(0, 5);

  const tasks = db.getTasks(userId).filter(t =>
    t.title.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q)
  ).slice(0, 5);

  const flashcards = db.getFlashcardDecks(userId).filter(f =>
    f.title.toLowerCase().includes(q) ||
    f.cards.some(c => c.question.toLowerCase().includes(q) || c.answer.toLowerCase().includes(q))
  ).slice(0, 5);

  const quizzes = db.getQuizzes(userId).filter(qu =>
    qu.title.toLowerCase().includes(q)
  ).slice(0, 5);

  const subjects = db.getSubjects(userId).filter(s =>
    s.name.toLowerCase().includes(q)
  ).slice(0, 5);

  return res.json({ notes, tasks, flashcards, quizzes, subjects });
});

// ----------------------------------------------------
// AI ROUTES (Protected, isolated, server-side Gemini)
// ----------------------------------------------------

router.post('/ai/generate-notes', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topic, sourceText, mode, subjectId } = req.body;
    if (!topic && !sourceText) {
      return res.status(400).json({ error: 'Please provide a topic or source material.' });
    }

    let subjectName = '';
    if (subjectId) {
      const sub = db.getSubjects(req.userId!).find(s => s.id === subjectId);
      if (sub) subjectName = sub.name;
    }

    const generated = await AIService.generateNotes({
      topic: topic || 'Study Notes',
      sourceText,
      mode: mode || 'comprehensive',
      subject: subjectName,
    });

    return res.json({ note: generated });
  } catch (err: any) {
    console.error('API /ai/generate-notes error:', err);
    return res.status(500).json({ error: 'Failed to generate AI notes. Please try again.' });
  }
});

router.post('/ai/chat', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messages, noteContextId, conversationId } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    let noteContext: { title: string; content: string } | null = null;
    if (noteContextId) {
      const note = db.getNote(req.userId!, noteContextId);
      if (note) {
        noteContext = { title: note.title, content: note.content };
      }
    }

    const aiResponseText = await AIService.chat(messages, noteContext);

    // Save to conversation history if requested
    if (conversationId) {
      const updatedMessages = [
        ...messages,
        {
          id: `msg_${Date.now()}`,
          role: 'assistant' as const,
          content: aiResponseText,
          timestamp: new Date().toISOString(),
        },
      ];
      db.updateAIConversation(req.userId!, conversationId, updatedMessages);
    }

    return res.json({
      role: 'assistant',
      content: aiResponseText,
    });
  } catch (err: any) {
    console.error('API /ai/chat error:', err);
    return res.status(500).json({ error: 'Failed to process AI query.' });
  }
});

router.get('/ai/conversations', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const conversations = db.getAIConversations(req.userId!);
  return res.json({ conversations });
});

router.get('/ai/conversations/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const conv = db.getAIConversation(req.userId!, req.params.id);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }
  return res.json({ conversation: conv });
});

router.post('/ai/conversations', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { title, noteContextId } = req.body;
  const conv = db.createAIConversation(req.userId!, title || 'New Study Session', noteContextId);
  return res.status(201).json({ conversation: conv });
});

router.delete('/ai/conversations/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const deleted = db.deleteAIConversation(req.userId!, req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }
  return res.json({ message: 'Conversation deleted.' });
});

router.post('/ai/generate-flashcards', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topic, sourceText, count, noteId } = req.body;
    let effectiveTopic = topic;
    let effectiveSource = sourceText;

    if (noteId) {
      const note = db.getNote(req.userId!, noteId);
      if (note) {
        if (!effectiveTopic) effectiveTopic = note.title;
        effectiveSource = `${note.content}\n${effectiveSource || ''}`;
      }
    }

    if (!effectiveTopic && !effectiveSource) {
      return res.status(400).json({ error: 'Please provide a topic or note to generate flashcards from.' });
    }

    const cards = await AIService.generateFlashcards({
      topic: effectiveTopic || 'Key Concepts',
      sourceText: effectiveSource,
      count: Number(count) || 6,
    });

    return res.json({ cards });
  } catch (err: any) {
    console.error('API /ai/generate-flashcards error:', err);
    return res.status(500).json({ error: 'Failed to generate flashcards.' });
  }
});

router.post('/ai/generate-quiz', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topic, sourceText, questionCount, difficulty, noteId } = req.body;
    let effectiveTopic = topic;
    let effectiveSource = sourceText;

    if (noteId) {
      const note = db.getNote(req.userId!, noteId);
      if (note) {
        if (!effectiveTopic) effectiveTopic = note.title;
        effectiveSource = `${note.content}\n${effectiveSource || ''}`;
      }
    }

    if (!effectiveTopic && !effectiveSource) {
      return res.status(400).json({ error: 'Please provide a topic or note to generate quiz from.' });
    }

    const questions = await AIService.generateQuiz({
      topic: effectiveTopic || 'Review Quiz',
      sourceText: effectiveSource,
      questionCount: Number(questionCount) || 5,
      difficulty: difficulty || 'medium',
    });

    return res.json({ questions });
  } catch (err: any) {
    console.error('API /ai/generate-quiz error:', err);
    return res.status(500).json({ error: 'Failed to generate quiz.' });
  }
});
