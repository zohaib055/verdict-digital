import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { api, type AuthResponse, type AuthUser } from "@/lib/api";

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  signup: (payload: { email: string; username: string; full_name: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const TOKEN_KEY = "verdict_token";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function persistAuth(response: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, response.access_token);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(!!token);

  const handleAuthResponse = (response: AuthResponse) => {
    persistAuth(response);
    setToken(response.access_token);
    setUser(response.user);
  };

  const refreshMe = async () => {
    if (!token) {
      setUser(null);
      return;
    }
    setLoading(true);
    try {
      const response = await api.me(token);
      handleAuthResponse(response);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshMe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      loading,
      login: async (payload) => {
        const response = await api.login(payload);
        handleAuthResponse(response);
      },
      signup: async (payload) => {
        const response = await api.signup(payload);
        handleAuthResponse(response);
      },
      logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      },
      refreshMe,
    }),
    [token, user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
