import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  role: "guest" | "user" | "admin";
  subscription: "none" | "basic" | "pro" | "business";
}

interface AuthContextType {
  user: AuthUser | null;
  isGuest: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
  subscribe: (plan: string) => Promise<void>;
  refetchUser: () => Promise<void>;
  canDownload: (type: "map" | "model3d" | "report" | "publication" | "dataset" | "image") => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("geo3d_token");
  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const data = await apiFetch("/auth/me");
      setUser(data.user);
      setIsGuest(false);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // Check if guest mode was set
    if (localStorage.getItem("geo3d_guest") === "true") {
      setIsGuest(true);
      setIsLoading(false);
      return;
    }
    fetchMe().finally(() => setIsLoading(false));
  }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    setIsGuest(false);
    localStorage.removeItem("geo3d_guest");
    if (data.token) {
      localStorage.setItem("geo3d_token", data.token);
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    const data = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    setUser(data.user);
    setIsGuest(false);
    localStorage.removeItem("geo3d_guest");
    if (data.token) {
      localStorage.setItem("geo3d_token", data.token);
    }
  };

  const logout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem("geo3d_guest");
    localStorage.removeItem("geo3d_token");
  };

  const continueAsGuest = () => {
    setUser(null);
    setIsGuest(true);
    localStorage.setItem("geo3d_guest", "true");
  };

  const subscribe = async (plan: string) => {
    const data = await apiFetch("/auth/subscribe", {
      method: "POST",
      body: JSON.stringify({ plan }),
    });
    setUser(data.user);
    if (data.token) {
      localStorage.setItem("geo3d_token", data.token);
    }
  };

  const refetchUser = fetchMe;

  // Access control logic
  const canDownload = (type: "map" | "model3d" | "report" | "publication" | "dataset" | "image"): boolean => {
    if (!user) return false;
    if (user.role === "admin") return true;
    const sub = user.subscription;

    if (sub === "business") return true;
    if (sub === "pro") {
      // Pro: maps, images, 3D models, datasets
      return ["map", "model3d", "dataset", "image"].includes(type);
    }
    // basic and none: no downloads — only map viewing
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, isGuest, isLoading, login, register, logout, continueAsGuest, subscribe, refetchUser, canDownload }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
