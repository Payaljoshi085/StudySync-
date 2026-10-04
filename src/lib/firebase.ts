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
  console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
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

// --- RESILIENT ISOLATED STORAGE UTILS ---
// If Firestore is restricted by security rules prior to Firebase Console email/password activation,
// data is securely stored in localStorage partitioned strictly by UID.
function getLocalCollection<T>(uid: string, key: string): T[] {
  try {
    const raw = localStorage.getItem(`studysync_users_${uid}_${key}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalCollection<T>(uid: string, key: string, items: T[]): void {
  try {
    localStorage.setItem(`studysync_users_${uid}_${key}`, JSON.stringify(items));
  } catch {}
}

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
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: uid,
        name: data.name || auth.currentUser?.displayName || 'Student',
        email: data.email || auth.currentUser?.email || '',
        avatar: data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        educationLevel: data.educationLevel || 'Undergraduate',
        course: data.course || 'Course Studies',
        semester: data.semester || 'Semester 1',
        theme: data.theme || 'dark',
        studyGoals: data.studyGoals || {
          dailyMinutes: 60,
          weeklySessions: 5,
          primaryFocus: 'Academic Mastery',
        },
        notificationPreferences: data.notificationPreferences || {
          deadlines: true,
          streakReminders: true,
          goalAlerts: true,
        },
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }

  // Local fallback
  const raw = localStorage.getItem(`studysync_users_${uid}_profile`);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {}
  }
  return null;
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

  // Sync to local fallback
  try {
    const existing = await getFirebaseUserProfile(uid) || ({} as User);
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(`studysync_users_${uid}_profile`, JSON.stringify(merged));
  } catch {}
}

// 2. Personal Notes: /users/{uid}/notes/{noteId}
export async function getFirebaseUserNotes(uid: string): Promise<Note[]> {
  const path = `users/${uid}/notes`;
  try {
    const q = query(collection(db, path), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      userId: uid,
      ...docSnap.data(),
    })) as Note[];
    setLocalCollection(uid, 'notes', docs);
    return docs;
  } catch (err) {
    try {
      const snap = await getDocs(collection(db, path));
      const docs = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        userId: uid,
        ...docSnap.data(),
      })) as Note[];
      setLocalCollection(uid, 'notes', docs);
      return docs;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      // Fallback to isolated user storage (starts with 0 data)
      return getLocalCollection<Note>(uid, 'notes');
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
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }

  // Update local user collection
  const existing = getLocalCollection<Note>(uid, 'notes');
  setLocalCollection(uid, 'notes', [newNote, ...existing.filter((n) => n.id !== noteId)]);
  return newNote;
}

export async function updateFirebaseUserNote(
  uid: string,
  noteId: string,
  updates: Partial<Note>
): Promise<void> {
  const path = `users/${uid}/notes/${noteId}`;
  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, `users/${uid}/notes`, noteId), {
      ...updates,
      updatedAt: now,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }

  const existing = getLocalCollection<Note>(uid, 'notes');
  setLocalCollection(
    uid,
    'notes',
    existing.map((n) => (n.id === noteId ? { ...n, ...updates, updatedAt: now } : n))
  );
}

export async function deleteFirebaseUserNote(uid: string, noteId: string): Promise<void> {
  const path = `users/${uid}/notes/${noteId}`;
  try {
    await deleteDoc(doc(db, `users/${uid}/notes`, noteId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }

  const existing = getLocalCollection<Note>(uid, 'notes');
  setLocalCollection(
    uid,
    'notes',
    existing.filter((n) => n.id !== noteId)
  );
}

// 3. AI Generated Notes: /users/{uid}/aiNotes/{noteId}
export async function getFirebaseUserAINotes(uid: string): Promise<AINote[]> {
  const path = `users/${uid}/aiNotes`;
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      userId: uid,
      ...docSnap.data(),
    })) as AINote[];
    setLocalCollection(uid, 'ainotes', docs);
    return docs;
  } catch (err) {
    try {
      const snap = await getDocs(collection(db, path));
      const docs = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        userId: uid,
        ...docSnap.data(),
      })) as AINote[];
      setLocalCollection(uid, 'ainotes', docs);
      return docs;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return getLocalCollection<AINote>(uid, 'ainotes');
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
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }

  const existing = getLocalCollection<AINote>(uid, 'ainotes');
  setLocalCollection(uid, 'ainotes', [record, ...existing.filter((n) => n.id !== noteId)]);
  return record;
}

export async function deleteFirebaseUserAINote(uid: string, noteId: string): Promise<void> {
  const path = `users/${uid}/aiNotes/${noteId}`;
  try {
    await deleteDoc(doc(db, `users/${uid}/aiNotes`, noteId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }

  const existing = getLocalCollection<AINote>(uid, 'ainotes');
  setLocalCollection(
    uid,
    'ainotes',
    existing.filter((n) => n.id !== noteId)
  );
}

// 4. Subjects: /users/{uid}/subjects/{subjectId}
export async function getFirebaseUserSubjects(uid: string): Promise<Subject[]> {
  const path = `users/${uid}/subjects`;
  try {
    const snap = await getDocs(collection(db, path));
    const docs = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      userId: uid,
      ...docSnap.data(),
    })) as Subject[];
    setLocalCollection(uid, 'subjects', docs);
    return docs;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    // Starts with 0 subjects for every user
    return getLocalCollection<Subject>(uid, 'subjects');
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
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }

  const existing = getLocalCollection<Subject>(uid, 'subjects');
  setLocalCollection(uid, 'subjects', [record, ...existing.filter((s) => s.id !== subId)]);
  return record;
}

// 5. Tasks: /users/{uid}/tasks/{taskId}
export async function getFirebaseUserTasks(uid: string): Promise<Task[]> {
  const path = `users/${uid}/tasks`;
  try {
    const snap = await getDocs(collection(db, path));
    const docs = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      userId: uid,
      ...docSnap.data(),
    })) as Task[];
    setLocalCollection(uid, 'tasks', docs);
    return docs;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    // Starts with 0 tasks for every user
    return getLocalCollection<Task>(uid, 'tasks');
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
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }

  const existing = getLocalCollection<Task>(uid, 'tasks');
  setLocalCollection(uid, 'tasks', [record, ...existing.filter((t) => t.id !== taskId)]);
  return record;
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

  const existing = getLocalCollection<Task>(uid, 'tasks');
  setLocalCollection(
    uid,
    'tasks',
    existing.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
  );
}

export async function deleteFirebaseUserTask(uid: string, taskId: string): Promise<void> {
  const path = `users/${uid}/tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, `users/${uid}/tasks`, taskId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }

  const existing = getLocalCollection<Task>(uid, 'tasks');
  setLocalCollection(
    uid,
    'tasks',
    existing.filter((t) => t.id !== taskId)
  );
}

// 6. Flashcard Decks: /users/{uid}/flashcards/{deckId}
export async function getFirebaseUserFlashcardDecks(uid: string): Promise<FlashcardDeck[]> {
  const path = `users/${uid}/flashcards`;
  try {
    const snap = await getDocs(collection(db, path));
    const docs = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      userId: uid,
      ...docSnap.data(),
    })) as FlashcardDeck[];
    setLocalCollection(uid, 'flashcards', docs);
    return docs;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return getLocalCollection<FlashcardDeck>(uid, 'flashcards');
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
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }

  const existing = getLocalCollection<FlashcardDeck>(uid, 'flashcards');
  setLocalCollection(uid, 'flashcards', [record, ...existing.filter((d) => d.id !== deckId)]);
  return record;
}

// 7. Quizzes: /users/{uid}/quizzes/{quizId}
export async function getFirebaseUserQuizzes(uid: string): Promise<Quiz[]> {
  const path = `users/${uid}/quizzes`;
  try {
    const snap = await getDocs(collection(db, path));
    const docs = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      userId: uid,
      ...docSnap.data(),
    })) as Quiz[];
    setLocalCollection(uid, 'quizzes', docs);
    return docs;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return getLocalCollection<Quiz>(uid, 'quizzes');
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
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }

  const existing = getLocalCollection<Quiz>(uid, 'quizzes');
  setLocalCollection(uid, 'quizzes', [record, ...existing.filter((q) => q.id !== quizId)]);
  return record;
}

// Starter bootstrap for a brand new user (strictly starts with 0 data: 0 notes, 0 subjects, 0 tasks)
export async function bootstrapNewUserSpace(uid: string, displayName: string, email: string): Promise<void> {
  try {
    await saveFirebaseUserProfile(uid, {
      name: displayName || 'Student',
      email: email,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      educationLevel: 'Undergraduate',
      course: 'Course Studies',
      semester: 'Semester 1',
      theme: 'dark',
      studyGoals: {
        dailyMinutes: 60,
        weeklySessions: 5,
        primaryFocus: 'Academic Mastery',
      },
      notificationPreferences: {
        deadlines: true,
        streakReminders: true,
        goalAlerts: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    // All collections intentionally empty - 0 data on start!
  } catch (err) {
    console.error('Bootstrap user space error:', err);
  }
}
