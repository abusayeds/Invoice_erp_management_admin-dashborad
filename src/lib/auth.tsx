import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getToken, setToken, clearToken, setUnauthorizedHandler } from "./api";

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  name?: string;
}

interface AuthState {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/** Decode a JWT payload without verifying (server verifies on every call). */
function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

function userFromToken(token: string): AdminUser | null {
  const payload = decodeJwt(token);
  const u = (payload?.user ?? payload) as Record<string, unknown> | undefined;
  if (!u) return null;
  const role = String(u.role ?? "");
  if (role !== "superadmin") return null;
  return { id: String(u._id ?? u.id ?? ""), email: String(u.email ?? ""), role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    clearToken();
    setUser(null);
  };

  // Wire 401 → logout.
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, []);

  // Restore session on load.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    const restored = userFromToken(token);
    if (!restored) {
      clearToken();
      setLoading(false);
      return;
    }
    setUser(restored);
    // Enrich with the profile name (best effort).
    api
      .get<{ name?: string; email?: string }>("/user/my-profile")
      .then((p) => setUser((cur) => (cur ? { ...cur, name: p?.name, email: p?.email || cur.email } : cur)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ token?: string }>("/user/login", { email, password });
    const token = res?.token;
    if (!token) throw new Error("Login failed — no token returned.");
    const admin = userFromToken(token);
    if (!admin) {
      throw new Error("This account is not a super admin. Access denied.");
    }
    setToken(token);
    setUser(admin);
    // Best-effort profile enrichment.
    try {
      const p = await api.get<{ name?: string; email?: string }>("/user/my-profile");
      setUser({ ...admin, name: p?.name, email: p?.email || admin.email });
    } catch {
      /* keep token-derived user */
    }
  };

  const value = useMemo<AuthState>(() => ({ user, loading, login, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
