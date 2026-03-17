import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Users, RefreshCw, ChevronDown, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface UserRow {
  id: number;
  email: string;
  name: string | null;
  role: string;
  subscription: string;
  createdAt: string;
}

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

const subscriptionColors: Record<string, string> = {
  none: "bg-secondary text-muted-foreground",
  basic: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  pro: "bg-primary/10 text-primary border border-primary/20",
  business: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
};

const roleColors: Record<string, string> = {
  user: "bg-secondary text-muted-foreground",
  admin: "bg-red-500/10 text-red-400 border border-red-500/20",
};

export default function AdminPanel() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLocation("/");
      return;
    }
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/admin/users");
      setUsers(data.users);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id: number, field: "subscription" | "role", value: string) => {
    setUpdating(id);
    try {
      const data = await apiFetch(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value }),
      });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data.user } : u));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };

  if (!user || user.role !== "admin") return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
              <Shield className="w-6 h-6 text-red-400" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Panou Admin</h1>
          </div>
          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border text-foreground text-sm hover:bg-secondary/80 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizează
          </button>
        </div>
        <p className="text-muted-foreground ml-14">Gestionează utilizatorii și abonamentele</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total utilizatori", value: users.length },
          { label: "Basic", value: users.filter(u => u.subscription === "basic").length },
          { label: "Pro", value: users.filter(u => u.subscription === "pro").length },
          { label: "Business", value: users.filter(u => u.subscription === "business").length },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-serif font-semibold text-foreground">Utilizatori înregistrați</h2>
          <span className="ml-auto text-sm text-muted-foreground">{users.length} total</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/20">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ID</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nume</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rol</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Abonament</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Înregistrat</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr
                    key={u.id}
                    className={cn(
                      "border-b border-border/50 hover:bg-secondary/20 transition-colors",
                      updating === u.id ? "opacity-60" : ""
                    )}
                  >
                    <td className="px-6 py-4 text-sm text-muted-foreground">#{u.id}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-foreground">{u.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{u.name || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <select
                          value={u.role}
                          onChange={(e) => updateUser(u.id, "role", e.target.value)}
                          disabled={updating === u.id}
                          className={cn(
                            "text-xs font-semibold px-2 py-1 rounded-md border appearance-none pr-6 cursor-pointer bg-transparent",
                            roleColors[u.role] || "bg-secondary"
                          )}
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-current opacity-50" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <select
                          value={u.subscription}
                          onChange={(e) => updateUser(u.id, "subscription", e.target.value)}
                          disabled={updating === u.id}
                          className={cn(
                            "text-xs font-semibold px-2 py-1 rounded-md border appearance-none pr-6 cursor-pointer bg-transparent capitalize",
                            subscriptionColors[u.subscription] || "bg-secondary"
                          )}
                        >
                          <option value="none">none</option>
                          <option value="basic">basic</option>
                          <option value="pro">pro</option>
                          <option value="business">business</option>
                        </select>
                        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-current opacity-50" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString("ro-RO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
