'use client';

/**
 * Auth provider for Montu v1.
 *
 * Convention: visitors are signed in anonymously on first load so every
 * intention and session seat can be attributed to a stable uid. No Google
 * linking yet; v1 intentionally keeps it friction-free.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configError: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    let unsub: () => void = () => {};
    try {
      const auth = getFirebaseAuth();
      unsub = onAuthStateChanged(auth, (u) => {
        if (u) {
          setUser(u);
          setLoading(false);
          return;
        }
        // No session yet: create an anonymous one. Best-effort; the app
        // works without auth, but intentions are better tied to a uid.
        signInAnonymously(auth)
          .then((cred) => {
            setUser(cred.user);
            setLoading(false);
          })
          .catch((err) => {
            console.warn('[auth] anonymous sign-in failed', err instanceof Error ? err.message : err);
            setUser(null);
            setLoading(false);
          });
      });
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : 'Auth unavailable');
      setLoading(false);
    }
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, configError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
