import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  signOut,
  updateProfile as updateFirebaseProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider, getFirebaseUserProfile, saveFirebaseUserProfile, bootstrapNewUserSpace } from '../lib/firebase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const syncUserProfile = async (fbUser: FirebaseUser) => {
    try {
      let profile = await getFirebaseUserProfile(fbUser.uid);
      if (!profile) {
        // First-time user bootstrap
        await bootstrapNewUserSpace(fbUser.uid, fbUser.displayName || 'Student', fbUser.email || '');
        profile = await getFirebaseUserProfile(fbUser.uid);
      }
      if (profile) {
        setUser(profile);
      } else {
        // Fallback default
        setUser({
          id: fbUser.uid,
          name: fbUser.displayName || 'Student',
          email: fbUser.email || '',
          avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
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
      }
    } catch (err) {
      console.error('Error syncing user profile:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await syncUserProfile(fbUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    await syncUserProfile(cred.user);
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (name.trim()) {
      await updateFirebaseProfile(cred.user, { displayName: name.trim() });
    }
    await bootstrapNewUserSpace(cred.user.uid, name.trim(), email.trim());
    await syncUserProfile(cred.user);
  };

  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(cred.user);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!firebaseUser) return;
    await saveFirebaseUserProfile(firebaseUser.uid, updates);
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const refreshUser = async () => {
    if (firebaseUser) {
      await syncUserProfile(firebaseUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        resetPassword,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
