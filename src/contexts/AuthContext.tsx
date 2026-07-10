import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import * as api from '../lib/api';
import type { ApiUser, GameResult } from '../lib/api';

interface AuthContextValue {
  user: ApiUser | null;
  isGuest: boolean;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  exitGuestMode: () => void;
  recordGameResult: (score: number, result: GameResult) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .fetchCurrentUser()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { user } = await api.signUp(email, password);
    setUser(user);
    setIsGuest(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { user } = await api.signIn(email, password);
    setUser(user);
    setIsGuest(false);
  }, []);

  const signOut = useCallback(async () => {
    await api.signOutRequest();
    setUser(null);
  }, []);

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
  }, []);

  const exitGuestMode = useCallback(() => {
    setIsGuest(false);
  }, []);

  const recordGameResult = useCallback(async (score: number, result: GameResult) => {
    await api.recordGameResult(score, result);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        loading,
        signUp,
        signIn,
        signOut,
        continueAsGuest,
        exitGuestMode,
        recordGameResult,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
