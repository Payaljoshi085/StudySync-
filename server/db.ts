import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'studysync.json');

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
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

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
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

export interface DatabaseSchema {
  users: User[];
  sessions: Session[];
  passwordResets: { token: string; userId: string; createdAt: string; expiresAt: string }[];
  subjects: Subject[];
  notes: Note[];
  tasks: Task[];
  flashcardDecks: FlashcardDeck[];
  quizzes: Quiz[];
  quizResults: QuizResult[];
  studySessions: StudySession[];
  aiConversations: AIConversation[];
  studyPlans: StudyPlan[];
}

function getInitialData(): DatabaseSchema {
  return {
    users: [],
    sessions: [],
    passwordResets: [],
    subjects: [],
    notes: [],
    tasks: [],
    flashcardDecks: [],
    quizzes: [],
    quizResults: [],
    studySessions: [],
    aiConversations: [],
    studyPlans: [],
  };
}

class Database {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = getInitialData();
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = { ...getInitialData(), ...JSON.parse(raw) };
      } catch (err) {
        console.error('Error reading DB, using initial data:', err);
        this.data = getInitialData();
      }
    } else {
      this.data = getInitialData();
      this.seedDemoUser();
      this.flush();
    }

    // Ensure demo user exists
    if (!this.data.users.some(u => u.email === 'demo@studysync.edu')) {
      this.seedDemoUser();
      this.flush();
    }
  }

  private seedDemoUser() {
    const demoId = 'usr_demo_studysync';
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('StudySync@2026', salt);

    const demoUser: User = {
      id: demoId,
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
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.users.push(demoUser);

    // Seed Subjects
    const subCS: Subject = {
      id: 'sub_cs101',
      userId: demoId,
      name: 'Data Structures & Algorithms',
      color: '#3B82F6', // Blue
      icon: 'Binary',
      targetHoursPerWeek: 8,
      examDate: new Date(Date.now() + 18 * 86400000).toISOString(),
    };
    const subAI: Subject = {
      id: 'sub_ai202',
      userId: demoId,
      name: 'Machine Learning & Neural Nets',
      color: '#8B5CF6', // Purple
      icon: 'BrainCircuit',
      targetHoursPerWeek: 10,
      examDate: new Date(Date.now() + 25 * 86400000).toISOString(),
    };
    const subOS: Subject = {
      id: 'sub_os303',
      userId: demoId,
      name: 'Operating Systems & Concurrency',
      color: '#10B981', // Emerald
      icon: 'Cpu',
      targetHoursPerWeek: 6,
      examDate: new Date(Date.now() + 32 * 86400000).toISOString(),
    };
    this.data.subjects.push(subCS, subAI, subOS);

    // Seed Notes
    const note1: Note = {
      id: 'note_1',
      userId: demoId,
      title: 'Graph Traversals: BFS vs DFS Deep Dive',
      content: `<h1>Graph Traversals: BFS vs DFS</h1>
<p>Understanding the fundamental mechanics and trade-offs between breadth-first search and depth-first search for connected acyclic and cyclic graphs.</p>
<h2>1. Breadth-First Search (BFS)</h2>
<ul>
  <li><strong>Core Data Structure:</strong> Queue (FIFO)</li>
  <li><strong>Time Complexity:</strong> O(V + E)</li>
  <li><strong>Space Complexity:</strong> O(V) for the visited set and queue</li>
  <li><strong>Optimal For:</strong> Finding shortest paths in unweighted graphs</li>
</ul>
<blockquote>BFS explores neighbor-by-neighbor in concentric rings outwards from the source node.</blockquote>
<h2>2. Depth-First Search (DFS)</h2>
<ul>
  <li><strong>Core Data Structure:</strong> Stack (LIFO) or System Call Stack (Recursion)</li>
  <li><strong>Time Complexity:</strong> O(V + E)</li>
  <li><strong>Key Application:</strong> Topological sorting, cycle detection, strongly connected components</li>
</ul>
<pre><code>// DFS Recursive Template
function dfs(node, visited) {
  if (visited.has(node)) return;
  visited.add(node);
  for (const neighbor of node.neighbors) {
    dfs(neighbor, visited);
  }
}</code></pre>
<h2>Key Exam Takeaways</h2>
<p>Always verify if the graph is directed or undirected, and ensure your visited set handles disconnected subgraphs!</p>`,
      subjectId: 'sub_cs101',
      tags: ['Algorithms', 'Graphs', 'Revision'],
      color: '#3B82F6',
      isPinned: true,
      isFavorite: true,
      isArchived: false,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    };

    const note2: Note = {
      id: 'note_2',
      userId: demoId,
      title: 'Transformer Architecture: Self-Attention Mechanism',
      content: `<h1>Self-Attention Mechanics</h1>
<p>The core breakthrough behind modern Large Language Models and Foundation Transformers (Vaswani et al., 2017).</p>
<h2>Query, Key, Value Formulation</h2>
<p>Given an input matrix X, we compute three projections:</p>
<ul>
  <li><strong>Q = X * W_q</strong> (Queries: What am I looking for?)</li>
  <li><strong>K = X * W_k</strong> (Keys: What do I contain?)</li>
  <li><strong>V = X * W_v</strong> (Values: What information do I pass forward?)</li>
</ul>
<h3>Attention Formula</h3>
<p><strong>Attention(Q, K, V) = softmax( (Q * K^T) / sqrt(d_k) ) * V</strong></p>
<p>The scaling factor <em>sqrt(d_k)</em> prevents vanishing gradients in the softmax function when vector dimensions grow large.</p>`,
      subjectId: 'sub_ai202',
      tags: ['Transformers', 'AI', 'Exam High-Yield'],
      color: '#8B5CF6',
      isPinned: true,
      isFavorite: true,
      isArchived: false,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    };

    this.data.notes.push(note1, note2);

    // Seed Tasks
    const tasks: Task[] = [
      {
        id: 'task_1',
        userId: demoId,
        title: 'Complete Red-Black Tree Balancing Exercises',
        description: 'Solve the 4 rotation cases and verify invariants on practice sheet #4.',
        subjectId: 'sub_cs101',
        priority: 'high',
        status: 'todo',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        estimatedMinutes: 60,
        completedAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'task_2',
        userId: demoId,
        title: 'Review Multi-Head Attention equations',
        description: 'Understand projection concatenation and layer norm integration.',
        subjectId: 'sub_ai202',
        priority: 'medium',
        status: 'in_progress',
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        estimatedMinutes: 45,
        completedAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'task_3',
        userId: demoId,
        title: 'Read Concurrency & Mutex Deadlock Chapter',
        description: 'Review Coffman conditions: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.',
        subjectId: 'sub_os303',
        priority: 'high',
        status: 'completed',
        dueDate: new Date().toISOString().split('T')[0],
        estimatedMinutes: 50,
        completedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    this.data.tasks.push(...tasks);

    // Seed Flashcards
    const flashcardDeck: FlashcardDeck = {
      id: 'deck_1',
      userId: demoId,
      title: 'DSA Core Complexities & Formulas',
      subjectId: 'sub_cs101',
      noteId: 'note_1',
      cards: [
        {
          id: 'c1',
          question: 'What is the average and worst-case time complexity of QuickSort?',
          answer: 'Average: O(n log n)\nWorst case: O(n²) when the chosen pivot is continually the smallest or largest element.',
          difficulty: 'easy',
        },
        {
          id: 'c2',
          question: 'What data structure is required for Dijkstra\'s Algorithm for optimal O((V+E) log V) time?',
          answer: 'A Min-Priority Queue (Binary or Fibonacci Heap) paired with an adjacency list.',
          difficulty: 'easy',
        },
        {
          id: 'c3',
          question: 'What are the 4 Coffman conditions for system deadlock?',
          answer: '1. Mutual Exclusion\n2. Hold and Wait\n3. No Preemption\n4. Circular Wait',
          difficulty: 'difficult',
        },
        {
          id: 'c4',
          question: 'Why do we scale by sqrt(d_k) in Scaled Dot-Product Attention?',
          answer: 'To prevent large dot product magnitudes from pushing the softmax function into regions with extremely small gradients (vanishing gradients).',
          difficulty: 'easy',
        },
      ],
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      lastReviewed: new Date(Date.now() - 12 * 3600000).toISOString(),
    };
    this.data.flashcardDecks.push(flashcardDeck);

    // Seed Quiz
    const quiz1: Quiz = {
      id: 'quiz_1',
      userId: demoId,
      title: 'Graph Algorithms & Concurrency Quick Check',
      subjectId: 'sub_cs101',
      difficulty: 'medium',
      questions: [
        {
          id: 'q1',
          question: 'Which traversal algorithm is guaranteed to find the shortest path in an unweighted graph?',
          options: ['Depth-First Search', 'Breadth-First Search', 'Topological Sort', 'Bellman-Ford'],
          correctAnswer: 1,
          explanation: 'BFS explores vertices level-by-level, making the first time a target vertex is reached the shortest path in terms of edge count.',
        },
        {
          id: 'q2',
          question: 'Which of the following is NOT one of the Coffman conditions for deadlock?',
          options: ['Mutual Exclusion', 'Preemptive Allocation', 'Circular Wait', 'Hold and Wait'],
          correctAnswer: 1,
          explanation: '"No Preemption" is the required condition; allowing preemptive allocation actively breaks deadlock.',
        },
        {
          id: 'q3',
          question: 'What is the auxiliary space complexity of standard recursive DFS on a skewed binary tree with N nodes?',
          options: ['O(1)', 'O(log N)', 'O(N)', 'O(N²)'],
          correctAnswer: 2,
          explanation: 'In the worst case (a degenerate skewed tree like a linked list), the call stack reaches depth N.',
        },
      ],
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    };
    this.data.quizzes.push(quiz1);

    // Seed Quiz Result
    const quizResult: QuizResult = {
      id: 'qr_1',
      userId: demoId,
      quizId: 'quiz_1',
      quizTitle: 'Graph Algorithms & Concurrency Quick Check',
      subjectId: 'sub_cs101',
      score: 3,
      total: 3,
      percentage: 100,
      userAnswers: [
        { questionId: 'q1', selectedAnswer: 1, isCorrect: true },
        { questionId: 'q2', selectedAnswer: 1, isCorrect: true },
        { questionId: 'q3', selectedAnswer: 2, isCorrect: true },
      ],
      improvementAreas: ['Continue practicing graph cycle detection edge cases.'],
      completedAt: new Date(Date.now() - 86400000).toISOString(),
    };
    this.data.quizResults.push(quizResult);

    // Seed Study Sessions (for streaks & charts)
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const minutes = [45, 60, 90, 50, 75, 120, 90][6 - i];
      this.data.studySessions.push({
        id: `sess_seed_${i}`,
        userId: demoId,
        subjectId: i % 2 === 0 ? 'sub_cs101' : 'sub_ai202',
        durationMinutes: minutes,
        sessionType: 'pomodoro',
        notes: 'Focused revision session',
        completedAt: d.toISOString(),
      });
    }

    // Seed default study plan
    const todayStr = today.toISOString().split('T')[0];
    this.data.studyPlans.push({
      id: 'plan_1',
      userId: demoId,
      date: todayStr,
      slots: [
        { id: 's1', time: '09:00 - 10:00', subjectId: 'sub_cs101', taskTitle: 'Red-Black Tree Balancing Practice', completed: true },
        { id: 's2', time: '11:00 - 12:00', subjectId: 'sub_ai202', taskTitle: 'Review Transformer Self-Attention', completed: false },
        { id: 's3', time: '14:30 - 15:30', subjectId: 'sub_os303', taskTitle: 'Concurrency Mutex & Deadlock problems', completed: false },
      ],
      updatedAt: new Date().toISOString(),
    });
  }

  public flush() {
    try {
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Error writing DB to disk:', err);
    }
  }

  public scheduleFlush() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.flush();
    }, 150);
  }

  // --- User & Auth ---
  public getPrimaryUser(): User {
    let user = this.data.users.find(u => u.email.toLowerCase() === 'payal.26ds6014@jietjodhpur.ac.in');
    if (user) return user;
    if (this.data.users.length > 0) return this.data.users[0];

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('StudySync@2026', salt);
    user = this.createUser({
      name: 'Payal Joshi',
      email: 'payal.26ds6014@jietjodhpur.ac.in',
      passwordHash,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      educationLevel: 'Undergraduate / College',
      course: 'Computer Science & Engineering',
      semester: 'Year 2 (Semester 4)',
      theme: 'dark',
      studyGoals: {
        dailyMinutes: 180,
        weeklySessions: 12,
        primaryFocus: 'Computer Science & Engineering',
      },
      notificationPreferences: {
        deadlines: true,
        streakReminders: true,
        goalAlerts: true,
      },
    });
    return user;
  }

  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
    const user: User = {
      ...userData,
      id: `usr_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.users.push(user);

    // Automatically seed basic subjects for the user
    const defaultSubs: Subject[] = [
      { id: `sub_${crypto.randomUUID()}`, userId: user.id, name: 'Core Major Subject', color: '#3B82F6', icon: 'BookOpen', targetHoursPerWeek: 8 },
      { id: `sub_${crypto.randomUUID()}`, userId: user.id, name: 'Secondary Elective', color: '#10B981', icon: 'Sparkles', targetHoursPerWeek: 6 },
      { id: `sub_${crypto.randomUUID()}`, userId: user.id, name: 'General Studies', color: '#F59E0B', icon: 'Compass', targetHoursPerWeek: 4 },
    ];
    this.data.subjects.push(...defaultSubs);

    // Create a starter welcome note
    const welcomeNote: Note = {
      id: `note_${crypto.randomUUID()}`,
      userId: user.id,
      title: 'Welcome to StudySync 🚀 Your AI Study Hub',
      content: `<h1>Welcome to StudySync!</h1>
<p>StudySync is your personalized study space built to help you learn faster, retain more, and hit your academic goals.</p>
<h2>✨ What you can do:</h2>
<ul>
  <li><strong>Smart Notes:</strong> Write rich text notes with checklists, code blocks, and tags.</li>
  <li><strong>AI Notes Generator:</strong> Feed in any raw lecture text, chapter, or topic, and generate high-yield revision sheets.</li>
  <li><strong>Interactive Flashcards & Quizzes:</strong> Turn your notes into active recall flashcards and self-testing quizzes in one click.</li>
  <li><strong>Pomodoro Focus Mode:</strong> Log deep study sessions that automatically count towards your streaks and charts.</li>
  <li><strong>Study Planner:</strong> Organize your daily hours and track upcoming exam dates.</li>
</ul>
<blockquote>Pro-tip: Try clicking <em>"Ask AI about this note"</em> or <em>"Generate Flashcards"</em> from the note menu!</blockquote>`,
      subjectId: defaultSubs[0].id,
      tags: ['Welcome', 'Guide'],
      color: '#3B82F6',
      isPinned: true,
      isFavorite: true,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.notes.push(welcomeNote);

    this.scheduleFlush();
    return user;
  }

  public updateUser(id: string, updates: Partial<User>): User | null {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = {
      ...this.data.users[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.scheduleFlush();
    return this.data.users[idx];
  }

  public deleteUser(id: string): boolean {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.data.users.splice(idx, 1);
    // Cascade delete user data
    this.data.sessions = this.data.sessions.filter(s => s.userId !== id);
    this.data.notes = this.data.notes.filter(n => n.userId !== id);
    this.data.tasks = this.data.tasks.filter(t => t.userId !== id);
    this.data.subjects = this.data.subjects.filter(s => s.userId !== id);
    this.data.flashcardDecks = this.data.flashcardDecks.filter(f => f.userId !== id);
    this.data.quizzes = this.data.quizzes.filter(q => q.userId !== id);
    this.data.quizResults = this.data.quizResults.filter(q => q.userId !== id);
    this.data.studySessions = this.data.studySessions.filter(s => s.userId !== id);
    this.data.aiConversations = this.data.aiConversations.filter(c => c.userId !== id);
    this.data.studyPlans = this.data.studyPlans.filter(p => p.userId !== id);
    this.scheduleFlush();
    return true;
  }

  // Sessions
  public createSession(userId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString(); // 30 days
    this.data.sessions.push({
      token,
      userId,
      createdAt: new Date().toISOString(),
      expiresAt,
    });
    this.scheduleFlush();
    return token;
  }

  public getSession(token: string): Session | undefined {
    const session = this.data.sessions.find(s => s.token === token);
    if (!session) return undefined;
    if (new Date(session.expiresAt) < new Date()) {
      this.deleteSession(token);
      return undefined;
    }
    return session;
  }

  public deleteSession(token: string) {
    this.data.sessions = this.data.sessions.filter(s => s.token !== token);
    this.scheduleFlush();
  }

  // Password Resets
  public createPasswordReset(userId: string): string {
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour
    this.data.passwordResets.push({
      token,
      userId,
      createdAt: new Date().toISOString(),
      expiresAt,
    });
    this.scheduleFlush();
    return token;
  }

  public verifyPasswordReset(token: string): string | null {
    const reset = this.data.passwordResets.find(r => r.token === token);
    if (!reset) return null;
    if (new Date(reset.expiresAt) < new Date()) {
      return null;
    }
    return reset.userId;
  }

  public consumePasswordReset(token: string) {
    this.data.passwordResets = this.data.passwordResets.filter(r => r.token !== token);
    this.scheduleFlush();
  }

  // --- Subjects ---
  public getSubjects(userId: string): Subject[] {
    return this.data.subjects.filter(s => s.userId === userId);
  }

  public createSubject(userId: string, data: Omit<Subject, 'id' | 'userId'>): Subject {
    const sub: Subject = {
      ...data,
      id: `sub_${crypto.randomUUID()}`,
      userId,
    };
    this.data.subjects.push(sub);
    this.scheduleFlush();
    return sub;
  }

  public updateSubject(userId: string, id: string, data: Partial<Subject>): Subject | null {
    const idx = this.data.subjects.findIndex(s => s.id === id && s.userId === userId);
    if (idx === -1) return null;
    this.data.subjects[idx] = { ...this.data.subjects[idx], ...data };
    this.scheduleFlush();
    return this.data.subjects[idx];
  }

  public deleteSubject(userId: string, id: string): boolean {
    const before = this.data.subjects.length;
    this.data.subjects = this.data.subjects.filter(s => !(s.id === id && s.userId === userId));
    const deleted = this.data.subjects.length !== before;
    if (deleted) this.scheduleFlush();
    return deleted;
  }

  // --- Notes ---
  public getNotes(userId: string): Note[] {
    return this.data.notes.filter(n => n.userId === userId);
  }

  public getNote(userId: string, id: string): Note | undefined {
    return this.data.notes.find(n => n.id === id && n.userId === userId);
  }

  public createNote(userId: string, noteData: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Note {
    const note: Note = {
      ...noteData,
      id: `note_${crypto.randomUUID()}`,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.notes.push(note);
    this.scheduleFlush();
    return note;
  }

  public updateNote(userId: string, id: string, noteData: Partial<Note>): Note | null {
    const idx = this.data.notes.findIndex(n => n.id === id && n.userId === userId);
    if (idx === -1) return null;
    this.data.notes[idx] = {
      ...this.data.notes[idx],
      ...noteData,
      updatedAt: new Date().toISOString(),
    };
    this.scheduleFlush();
    return this.data.notes[idx];
  }

  public deleteNote(userId: string, id: string): boolean {
    const before = this.data.notes.length;
    this.data.notes = this.data.notes.filter(n => !(n.id === id && n.userId === userId));
    const deleted = this.data.notes.length !== before;
    if (deleted) this.scheduleFlush();
    return deleted;
  }

  // --- Tasks ---
  public getTasks(userId: string): Task[] {
    return this.data.tasks.filter(t => t.userId === userId);
  }

  public createTask(userId: string, taskData: Omit<Task, 'id' | 'userId' | 'createdAt'>): Task {
    const task: Task = {
      ...taskData,
      id: `task_${crypto.randomUUID()}`,
      userId,
      createdAt: new Date().toISOString(),
    };
    this.data.tasks.push(task);
    this.scheduleFlush();
    return task;
  }

  public updateTask(userId: string, id: string, updates: Partial<Task>): Task | null {
    const idx = this.data.tasks.findIndex(t => t.id === id && t.userId === userId);
    if (idx === -1) return null;
    this.data.tasks[idx] = { ...this.data.tasks[idx], ...updates };
    this.scheduleFlush();
    return this.data.tasks[idx];
  }

  public deleteTask(userId: string, id: string): boolean {
    const before = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter(t => !(t.id === id && t.userId === userId));
    const deleted = this.data.tasks.length !== before;
    if (deleted) this.scheduleFlush();
    return deleted;
  }

  // --- Flashcard Decks ---
  public getFlashcardDecks(userId: string): FlashcardDeck[] {
    return this.data.flashcardDecks.filter(f => f.userId === userId);
  }

  public getFlashcardDeck(userId: string, id: string): FlashcardDeck | undefined {
    return this.data.flashcardDecks.find(f => f.id === id && f.userId === userId);
  }

  public createFlashcardDeck(userId: string, deckData: Omit<FlashcardDeck, 'id' | 'userId' | 'createdAt'>): FlashcardDeck {
    const deck: FlashcardDeck = {
      ...deckData,
      id: `deck_${crypto.randomUUID()}`,
      userId,
      createdAt: new Date().toISOString(),
    };
    this.data.flashcardDecks.push(deck);
    this.scheduleFlush();
    return deck;
  }

  public updateFlashcardDeck(userId: string, id: string, updates: Partial<FlashcardDeck>): FlashcardDeck | null {
    const idx = this.data.flashcardDecks.findIndex(f => f.id === id && f.userId === userId);
    if (idx === -1) return null;
    this.data.flashcardDecks[idx] = { ...this.data.flashcardDecks[idx], ...updates };
    this.scheduleFlush();
    return this.data.flashcardDecks[idx];
  }

  public deleteFlashcardDeck(userId: string, id: string): boolean {
    const before = this.data.flashcardDecks.length;
    this.data.flashcardDecks = this.data.flashcardDecks.filter(f => !(f.id === id && f.userId === userId));
    const deleted = this.data.flashcardDecks.length !== before;
    if (deleted) this.scheduleFlush();
    return deleted;
  }

  // --- Quizzes & Results ---
  public getQuizzes(userId: string): Quiz[] {
    return this.data.quizzes.filter(q => q.userId === userId);
  }

  public getQuiz(userId: string, id: string): Quiz | undefined {
    return this.data.quizzes.find(q => q.id === id && q.userId === userId);
  }

  public createQuiz(userId: string, quizData: Omit<Quiz, 'id' | 'userId' | 'createdAt'>): Quiz {
    const quiz: Quiz = {
      ...quizData,
      id: `quiz_${crypto.randomUUID()}`,
      userId,
      createdAt: new Date().toISOString(),
    };
    this.data.quizzes.push(quiz);
    this.scheduleFlush();
    return quiz;
  }

  public deleteQuiz(userId: string, id: string): boolean {
    const before = this.data.quizzes.length;
    this.data.quizzes = this.data.quizzes.filter(q => !(q.id === id && q.userId === userId));
    const deleted = this.data.quizzes.length !== before;
    if (deleted) this.scheduleFlush();
    return deleted;
  }

  public getQuizResults(userId: string): QuizResult[] {
    return this.data.quizResults.filter(q => q.userId === userId);
  }

  public saveQuizResult(userId: string, resultData: Omit<QuizResult, 'id' | 'userId' | 'completedAt'>): QuizResult {
    const result: QuizResult = {
      ...resultData,
      id: `qr_${crypto.randomUUID()}`,
      userId,
      completedAt: new Date().toISOString(),
    };
    this.data.quizResults.push(result);
    this.scheduleFlush();
    return result;
  }

  // --- Study Sessions ---
  public getStudySessions(userId: string): StudySession[] {
    return this.data.studySessions.filter(s => s.userId === userId);
  }

  public logStudySession(userId: string, sessionData: Omit<StudySession, 'id' | 'userId' | 'completedAt'>): StudySession {
    const session: StudySession = {
      ...sessionData,
      id: `sess_${crypto.randomUUID()}`,
      userId,
      completedAt: new Date().toISOString(),
    };
    this.data.studySessions.push(session);
    this.scheduleFlush();
    return session;
  }

  // --- AI Conversations ---
  public getAIConversations(userId: string): AIConversation[] {
    return this.data.aiConversations.filter(c => c.userId === userId);
  }

  public getAIConversation(userId: string, id: string): AIConversation | undefined {
    return this.data.aiConversations.find(c => c.id === id && c.userId === userId);
  }

  public createAIConversation(userId: string, title: string, noteContextId?: string | null): AIConversation {
    const conv: AIConversation = {
      id: `conv_${crypto.randomUUID()}`,
      userId,
      title,
      noteContextId: noteContextId || null,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.aiConversations.push(conv);
    this.scheduleFlush();
    return conv;
  }

  public updateAIConversation(userId: string, id: string, messages: ChatMessage[], title?: string): AIConversation | null {
    const idx = this.data.aiConversations.findIndex(c => c.id === id && c.userId === userId);
    if (idx === -1) return null;
    this.data.aiConversations[idx].messages = messages;
    if (title) this.data.aiConversations[idx].title = title;
    this.data.aiConversations[idx].updatedAt = new Date().toISOString();
    this.scheduleFlush();
    return this.data.aiConversations[idx];
  }

  public deleteAIConversation(userId: string, id: string): boolean {
    const before = this.data.aiConversations.length;
    this.data.aiConversations = this.data.aiConversations.filter(c => !(c.id === id && c.userId === userId));
    const deleted = this.data.aiConversations.length !== before;
    if (deleted) this.scheduleFlush();
    return deleted;
  }

  // --- Study Plans ---
  public getStudyPlan(userId: string, date: string): StudyPlan | null {
    return this.data.studyPlans.find(p => p.userId === userId && p.date === date) || null;
  }

  public saveStudyPlan(userId: string, date: string, slots: StudyPlanSlot[]): StudyPlan {
    const idx = this.data.studyPlans.findIndex(p => p.userId === userId && p.date === date);
    if (idx !== -1) {
      this.data.studyPlans[idx].slots = slots;
      this.data.studyPlans[idx].updatedAt = new Date().toISOString();
      this.scheduleFlush();
      return this.data.studyPlans[idx];
    }
    const newPlan: StudyPlan = {
      id: `plan_${crypto.randomUUID()}`,
      userId,
      date,
      slots,
      updatedAt: new Date().toISOString(),
    };
    this.data.studyPlans.push(newPlan);
    this.scheduleFlush();
    return newPlan;
  }
}

export const db = new Database();
