import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  apiLogin,
  apiLogout,
  apiMe,
  apiRegister,
  apiUpdateProfile,
  apiUpgradePlan,
  type PlanId,
  type User,
} from "./db";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  setUserFromLogin: (user: User) => void;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  upgradePlan: (planId: PlanId) => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

function isSessionUser(res: unknown): res is User {
  return !!res && typeof res === "object" && "id" in res && "email" in res;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiMe()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshUser = useCallback(async () => {
    const u = await apiMe().catch(() => null);
    setUser(u);
  }, []);

  const setUserFromLogin = useCallback((u: User) => {
    setUser(u);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    if (!isSessionUser(res)) {
      throw new Error("Additional verification required.");
    }
    setUser(res);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const u = await apiRegister(name, email, password);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout().catch(() => undefined);
    setUser(null);
  }, []);

  const upgradePlan = useCallback(async (planId: PlanId) => {
    const u = await apiUpgradePlan(planId);
    setUser(u);
  }, []);

  const updateProfile = useCallback(async (name: string) => {
    const u = await apiUpdateProfile(name);
    setUser(u);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        setUserFromLogin,
        signup,
        logout,
        refreshUser,
        upgradePlan,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
