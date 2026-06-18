import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface AuthUser {
  email: string;
  name: string;
  google_id: string | null;
  auth_method: 'otp' | 'google';
  avatar_url: string | null;
  role: 'visitor' | 'founder' | 'vc' | 'admin';
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => void;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json() as AuthUser;
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    console.log('token from URL:', urlToken);
    if (urlToken) {
      params.delete('token');
      const newSearch = params.toString();
      window.history.replaceState(
        null,
        '',
        window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash,
      );
      try {
        const base64 = urlToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64)) as Record<string, unknown>;
        if (payload.email && payload.name && payload.auth_method) {
          setUser({
            email: payload.email as string,
            name: payload.name as string,
            google_id: (payload.google_id as string | null) ?? null,
            auth_method: payload.auth_method as 'otp' | 'google',
            avatar_url: (payload.avatar_url as string | null) ?? null,
            role: (payload.role as 'visitor' | 'founder' | 'vc' | 'admin') ?? 'visitor',
          });
        }
      } catch { /* invalid token — refetch will resolve auth */ }
    }
    refetch();
  }, [refetch]);

  const login = useCallback(async (email: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json() as { message?: string };
      throw Object.assign(new Error(data.message || 'Login failed.'), await res.json().catch(() => ({})));
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    localStorage.removeItem('auth_user');
  }, []);

  const loginWithGoogle = useCallback(() => {
    sessionStorage.setItem('auth_redirect', window.location.pathname);
    window.location.href = '/api/auth/google';
  }, []);

  const deleteAccount = useCallback(async () => {
    const res = await fetch('/api/auth/delete-account', { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      const data = await res.json() as { message?: string };
      throw new Error(data.message || 'Failed to delete account.');
    }
    setUser(null);
    localStorage.removeItem('auth_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, refetch, login, logout, loginWithGoogle, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
