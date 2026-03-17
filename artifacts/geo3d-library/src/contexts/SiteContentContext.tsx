import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "./AuthContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SiteContentCtx {
  content: Record<string, string>;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  updateContent: (key: string, value: string) => Promise<void>;
  getContent: (key: string, fallback: string) => string;
}

const Ctx = createContext<SiteContentCtx>({
  content: {}, editMode: false,
  setEditMode: () => {}, updateContent: async () => {},
  getContent: (_k, f) => f,
});

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [content, setContent] = useState<Record<string, string>>({});
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/site-content`)
      .then(r => r.json())
      .then(d => setContent(d || {}))
      .catch(() => {});
  }, []);

  const updateContent = useCallback(async (key: string, value: string) => {
    const token = localStorage.getItem("geo3d_token");
    await fetch(`${BASE}/api/admin/site-content/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ value }),
      credentials: "include",
    });
    setContent(prev => ({ ...prev, [key]: value }));
  }, []);

  const getContent = useCallback((key: string, fallback: string) => {
    return content[key] ?? fallback;
  }, [content]);

  // Turn off edit mode if not admin
  useEffect(() => {
    if (user?.role !== "admin") setEditMode(false);
  }, [user]);

  return (
    <Ctx.Provider value={{ content, editMode, setEditMode, updateContent, getContent }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSiteContent() { return useContext(Ctx); }
