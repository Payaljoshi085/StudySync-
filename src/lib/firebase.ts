import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
} from 'firebase/firestore';
import defaultConfig from '../../firebase-applet-config.json';
import { Note, Subject, Task, FlashcardDeck, Quiz, User } from '../types';

// Load Firebase configuration with environment variable overrides
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultConfig.appId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || defaultConfig.firestoreDatabaseId,
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: getFirestore requires firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Standardized error handler according to skill guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(errInfo.error);
}

// Connection test on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network is limited.');
    }
  }
}
testConnection();

// --- MULTI-USER DATA ACCESS LAYER ---
// Paths follow: users/{uid}/notes, users/{uid}/aiNotes, users/{uid}/subjects, etc.

export interface AINote {
  id: string;
  userId: string;
  title: string;
  content: string;
  topic?: string;
  sourceText?: string;
  mode?: string;
  subject?: string;
  subjectId?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// 1. User Profile: /users/{uid}
export async function getFirebaseUserProfile(uid: string): Promise<User | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, path));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: uid,
      name: data.name || auth.currentUser?.displayName || 'Student',
      email: data.email || auth.currentUser?.email || '',
      avatar: data.avatar || auth.currentUser?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      educationLevel: data.educationLevel || 'Undergraduate',
      course: data.course || 'Computer Science & AI',
      semester: data.semester || 'Semester 1',
      theme: data.theme || 'dark',
      studyGoals: data.studyGoals || {
        dailyMinutes: 120,
        weeklySessions: 8,
        primaryFocus: 'Exam Preparation & Mastery',
      },
      notificationPreferences: data.notificationPreferences || {
        deadlines: true,
        streakReminders: true,
        goalAlerts: true,
      },
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

export async function saveFirebaseUserProfile(uid: string, updates: Partial<User>): Promise<void> {
  const path = `users/${uid}`;
  try {
    await setDoc(
      doc(db, path),
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// 2. Personal Notes: /users/{uid}/notes/{noteId}
export async function getFirebaseUserNotes(uid: string): Promise<Note[]> {
  const path = `users/${uid}/notes`;
  try {
    const q = query(collection(db, path), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      userId: uid,
      ...docSnap.data(),
    })) as Note[];
  } catch (err) {
    // If index or ordering issue, fallback to un-ordered query
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map((docSnap) => ({
        id: docSnap.id,
        userId: uid,
        ...docSnap.data(),
      })) as Note[];
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  }
}

export async function saveFirebaseUserNote(
  uid: string,
  noteData: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Note> {
  const noteId = noteData.id || `note_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const path = `users/${uid}/notes/${noteId}`;
  const now = new Date().toISOString();

  const newNote: Note = {
    id: noteId,
    userId: uid,
    title: noteData.title || 'Untitled Note',
    content: noteData.content || '',
    subjectId: noteData.subjectId || '',
    tags: noteData.tags || [],
    color: noteData.color || '#3B82F6',
    isPinned: noteData.isPinned ?? false,
    isFavorite: noteData.isFavorite ?? false,
    isArchived: noteData.isArchived ?? false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, `users/${uid}/notes`, noteId), newNote);
    return newNote;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    throw err;
  }
}

export async function updateFirebaseUserNote(
  uid: string,
  noteId: string,
  updates: Partial<Note>
): Promise<void> {
  const path = `users/${uid}/notes/${noteId}`;
  try {
    await updateDoc(doc(db, `users/${uid}/notes`, noteId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteFirebaseUserNote(uid: string, noteId: string): Promise<void> {
  const path = `users/${uid}/notes/${noteId}`;
  try {
    await deleteDoc(doc(db, `users/${uid}/notes`, noteId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 3. AI Generated Notes: /users/{uid}/aiNotes/{noteId}
export async function getFirebaseUserAINotes(uid: string): Promise<AINote[]> {
  const path = `users/${uid}/aiNotes`;
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      userId: uid,
      ...docSnap.data(),
    })) as AINote[];
  } catch (err) {
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map((docSnap) => ({
        id: docSnap.id,
        userId: uid,
        ...docSnap.data(),
      })) as AINote[];
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  }
}

export async function saveFirebaseUserAINote(
  uid: string,
  aiNote: Omit<AINote, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<AINote> {
  const noteId = `ainote_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const path = `users/${uid}/aiNotes/${noteId}`;
  const now = new Date().toISOString();

  const record: AINote = {
    id: noteId,
    userId: uid,
    title: aiNote.title || 'AI Generated Note',
    content: aiNote.content || '',
    topic: aiNote.topic || '',
    sourceText: aiNote.sourceText || '',
    mode: aiNote.mode || 'comprehensive',
    subject: aiNote.subject || '',
    subjectId: aiNote.subjectId || '',
    tags: aiNote.tags || ['AI Generated'],
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, `users/${uid}/aiNotes`, noteId), record);
    return record;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    throw err;
  }
}

export async function deleteFirebaseUserAINote(uid: string, noteId: string): Promise<void> {
  const path = `users/${uid}/aiNotes/${noteId}`;
  try {
    await deleteDoc(doc(db, `users/${uid}/aiNotes`, noteId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 4. Subjects: /users/{uid}/subjects/{subjectId}
export async function getFirebaseUserSubjects(uid: string): Promise<Subject[]> {
  const path = `users/${uid}/subjects`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      userId: uid,
      ...docSnap.data(),
    })) as Subject[];
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function saveFirebaseUserSubject(
  uid: string,
  sub: Omit<Subject, 'id' | 'userId'> & { id?: string }
): Promise<Subject> {
  const subId = sub.id || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const path = `users/${uid}/subjects/${subId}`;
  const record: Subject = {
    id: subId,
    userId: uid,
    name: sub.name,
    color: sub.color || '#3B82F6',
    icon: sub.icon || 'BookOpen',
    targetHoursPerWeek: sub.targetHoursPerWeek || 6,
    examDate: sub.examDate,
  };

  try {
    await setDoc(doc(db, `users/${uid}/subjects`, subId), record);
    return record;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    throw err;
  }
}

// 5. Tasks: /users/{uid}/tasks/{taskId}
export async function getFirebaseUserTasks(uid: string): Promise<Task[]> {
  const path = `users/${uid}/tasks`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      userId: uid,
      ...docSnap.data(),
    })) as Task[];
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function saveFirebaseUserTask(
  uid: string,
  taskData: Omit<Task, 'id' | 'userId' | 'createdAt'> & { id?: string }
): Promise<Task> {
  const taskId = taskData.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const path = `users/${uid}/tasks/${taskId}`;
  const record: Task = {
    id: taskId,
    userId: uid,
    title: taskData.title,
    description: taskData.description || '',
    subjectId: taskData.subjectId || '',
    priority: taskData.priority || 'medium',
    status: taskData.status || 'todo',
    dueDate: taskData.dueDate || new Date().toISOString().split('T')[0],
    estimatedMinutes: taskData.estimatedMinutes || 45,
    completedAt: taskData.completedAt || null,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, `users/${uid}/tasks`, taskId), record);
    return record;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    throw err;
  }
}

export async function updateFirebaseUserTask(
  uid: string,
  taskId: string,
  updates: Partial<Task>
): Promise<void> {
  const path = `users/${uid}/tasks/${taskId}`;
  try {
    await updateDoc(doc(db, `users/${uid}/tasks`, taskId), updates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteFirebaseUserTask(uid: string, taskId: string): Promise<void> {
  const path = `users/${uid}/tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, `users/${uid}/tasks`, taskId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 6. Flashcard Decks: /users/{uid}/flashcards/{deckId}
export async function getFirebaseUserFlashcardDecks(uid: string): Promise<FlashcardDeck[]> {
  const path = `users/${uid}/flashcards`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      userId: uid,
      ...docSnap.data(),
    })) as FlashcardDeck[];
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function saveFirebaseUserFlashcardDeck(
  uid: string,
  deckData: Omit<FlashcardDeck, 'id' | 'userId' | 'createdAt'> & { id?: string }
): Promise<FlashcardDeck> {
  const deckId = deckData.id || `deck_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const path = `users/${uid}/flashcards/${deckId}`;
  const record: FlashcardDeck = {
    id: deckId,
    userId: uid,
    title: deckData.title,
    subjectId: deckData.subjectId || '',
    noteId: deckData.noteId || null,
    cards: deckData.cards || [],
    createdAt: new Date().toISOString(),
    lastReviewed: null,
  };

  try {
    await setDoc(doc(db, `users/${uid}/flashcards`, deckId), record);
    return record;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    throw err;
  }
}

// 7. Quizzes: /users/{uid}/quizzes/{quizId}
export async function getFirebaseUserQuizzes(uid: string): Promise<Quiz[]> {
  const path = `users/${uid}/quizzes`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      userId: uid,
      ...docSnap.data(),
    })) as Quiz[];
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function saveFirebaseUserQuiz(
  uid: string,
  quizData: Omit<Quiz, 'id' | 'userId' | 'createdAt'> & { id?: string }
): Promise<Quiz> {
  const quizId = quizData.id || `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const path = `users/${uid}/quizzes/${quizId}`;
  const record: Quiz = {
    id: quizId,
    userId: uid,
    title: quizData.title,
    subjectId: quizData.subjectId || '',
    difficulty: quizData.difficulty || 'medium',
    questions: quizData.questions || [],
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, `users/${uid}/quizzes`, quizId), record);
    return record;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    throw err;
  }
}

// Starter bootstrap for a brand new user
export async function bootstrapNewUserSpace(uid: string, displayName: string, email: string): Promise<void> {
  try {
    // 1. Root profile
    await saveFirebaseUserProfile(uid, {
      name: displayName || 'Student',
      email: email,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      educationLevel: 'Undergraduate',
      course: 'Computer Science & AI',
      semester: 'Semester 1',
      theme: 'dark',
      studyGoals: {
        dailyMinutes: 120,
        weeklySessions: 8,
        primaryFocus: 'Exam Preparation & Mastery',
      },
      notificationPreferences: {
        deadlines: true,
        streakReminders: true,
        goalAlerts: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. Default Starter Subjects
    const sub1 = await saveFirebaseUserSubject(uid, {
      name: 'Computer Science & Algorithms',
      color: '#3B82F6',
      icon: 'Binary',
      targetHoursPerWeek: 8,
    });

    const sub2 = await saveFirebaseUserSubject(uid, {
      name: 'Artificial Intelligence & ML',
      color: '#8B5CF6',
      icon: 'BrainCircuit',
      targetHoursPerWeek: 6,
    });

    // 3. Welcome Note
    await saveFirebaseUserNote(uid, {
      title: 'Welcome to your private StudySync Space 🎓',
      content: `<h1>Welcome to StudySync, ${displayName || 'Student'}!</h1>
<p>Your notes and study materials are private and securely stored in your personal cloud workspace.</p>
<h2>Quick Start Guide:</h2>
<ul>
  <li><strong>Create Notes:</strong> Write, format, and organize rich study notes by subject.</li>
  <li><strong>AI Notes:</strong> Use the AI Assistant to synthesize lectures or generate exam study sheets.</li>
  <li><strong>Flashcards & Quizzes:</strong> Convert notes into revision cards or practice quizzes with one click.</li>
</ul>
<p>Enjoy focused, productive study sessions!</p>`,
      subjectId: sub1.id,
      tags: ['Getting Started', 'Guide'],
      color: '#3B82F6',
      isPinned: true,
      isFavorite: true,
      isArchived: false,
    });
  } catch (err) {
    console.error('Bootstrap user space error:', err);
  }
}
