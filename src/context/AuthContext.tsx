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
  quickLoginAsTestUser: (userType: 'alice' | 'bob') => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function makeDeterministicUid(email: string): string {
  try {
    return 'uid_' + btoa(email.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
  } catch {
    return 'uid_' + Math.abs(email.split('').reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0));
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const syncUserProfile = async (fbUid: string, displayName?: string | null, email?: string | null, photoURL?: string | null) => {
    try {
      let profile = await getFirebaseUserProfile(fbUid);
      if (!profile) {
        // Starts with 0 data
        await bootstrapNewUserSpace(fbUid, displayName || 'Student', email || '');
        profile = await getFirebaseUserProfile(fbUid);
      }
      if (profile) {
        setUser(profile);
        try {
          localStorage.setItem('studysync_active_user', JSON.stringify(profile));
        } catch {}
      } else {
        const fallbackUser: User = {
          id: fbUid,
          name: displayName || 'Student',
          email: email || '',
          avatar: photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
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
        };
        setUser(fallbackUser);
        try {
          localStorage.setItem('studysync_active_user', JSON.stringify(fallbackUser));
        } catch {}
      }
    } catch (err) {
      console.error('Error syncing user profile:', err);
    }
  };

  useEffect(() => {
    // 1. Listen for real Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await syncUserProfile(fbUser.uid, fbUser.displayName, fbUser.email, fbUser.photoURL);
        setLoading(false);
      } else {
        // Check if there is an active isolated session
        const saved = localStorage.getItem('studysync_active_user');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setUser(parsed);
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      await syncUserProfile(cred.user.uid, cred.user.displayName, cred.user.email, cred.user.photoURL);
    } catch (err: any) {
      // If Firebase Auth throws operation-not-allowed because Email/Password is not enabled yet in console:
      if (
        err.code === 'auth/operation-not-allowed' ||
        err.code === 'auth/configuration-not-found' ||
        err.code === 'auth/network-request-failed'
      ) {
        console.warn('Firebase Email/Password not active in console. Running in isolated workspace mode.');
        const isolatedUid = makeDeterministicUid(cleanEmail);
        await syncUserProfile(isolatedUid, cleanEmail.split('@')[0], cleanEmail);
        return;
      }
      throw err;
    }
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      if (name.trim()) {
        await updateFirebaseProfile(cred.user, { displayName: name.trim() });
      }
      await bootstrapNewUserSpace(cred.user.uid, name.trim(), cleanEmail);
      await syncUserProfile(cred.user.uid, name.trim(), cleanEmail, cred.user.photoURL);
    } catch (err: any) {
      if (
        err.code === 'auth/operation-not-allowed' ||
        err.code === 'auth/configuration-not-found' ||
        err.code === 'auth/network-request-failed'
      ) {
        console.warn('Firebase Email/Password not active in console. Running in isolated workspace mode.');
        const isolatedUid = makeDeterministicUid(cleanEmail);
        await bootstrapNewUserSpace(isolatedUid, name.trim() || cleanEmail.split('@')[0], cleanEmail);
        await syncUserProfile(isolatedUid, name.trim() || cleanEmail.split('@')[0], cleanEmail);
        return;
      }
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await syncUserProfile(cred.user.uid, cred.user.displayName, cred.user.email, cred.user.photoURL);
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain' || err.code === 'auth/popup-blocked') {
        throw new Error(
          'Google Sign-In domain unauthorized. Add this URL to Firebase Console > Authentication > Settings > Authorized domains.'
        );
      }
      throw err;
    }
  };

  const quickLoginAsTestUser = async (userType: 'alice' | 'bob') => {
    const isAlice = userType === 'alice';
    const email = isAlice ? 'alice@studysync.edu' : 'bob@studysync.edu';
    const name = isAlice ? 'Alice User' : 'Bob Student';
    const isolatedUid = isAlice ? 'uid_alice_study_space' : 'uid_bob_study_space';

    await syncUserProfile(isolatedUid, name, email);
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        console.warn('Password reset requires Email/Password enabled in Firebase Console.');
      } else {
        throw err;
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {}
    localStorage.removeItem('studysync_active_user');
    setUser(null);
    setFirebaseUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    await saveFirebaseUserProfile(user.id, updates);
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const refreshUser = async () => {
    if (user) {
      await syncUserProfile(user.id, user.name, user.email, user.avatar);
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
        quickLoginAsTestUser,
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
