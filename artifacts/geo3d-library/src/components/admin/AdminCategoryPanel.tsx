import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2, Edit2, Check, Loader2, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("geo3d_token");
  return token ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

interface Category {
  id: number; name: string; slug: string;
  description?: string; iconName?: string; color?: string; resourceCount?: number;
}

const PRESET_COLORS = [
  "#f59e0b", "#ef4444", "#10b981", "#3b82f6",
  "#8b5cf6", "#ec4899", "#f97316", "#06b6d4",
  "#84cc16", "#64748b",
];

const emptyForm = { name: "", slug: "", description: "", iconName: "", color: "#3b82f6" };

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
}

interface AdminCategoryPanelProps { onRefresh: () => void; }

export function AdminCategoryPanel({ onRefresh }: AdminCategoryPanelProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "add" | "edit">("list");
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState("");

  const fetchData = async () => {
    const res = await fetch(`${BASE}/api/categories`, { credentials: "include" });
    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
  };

  useEffect(() => { if (open) fetchData(); }, [open]);

  const handleSave = async () => {
    setError(""); setSaving(true);
    try {
      const body = { name: form.name, slug: form.slug, description: form.description || undefined, iconName: form.iconName || undefined, color: form.color || undefined };
      const url = editId ? `${BASE}/api/admin/categories/${editId}` : `${BASE}/api/admin/categories`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(body), credentials: "include" });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Eroare"); return; }
      setForm({ ...emptyForm }); setEditId(null); setView("list");
      await fetchData(); onRefresh();
    } catch { setError("Eroare de rețea"); }
    finally { setSaving(false); }
  };

  const handleEdit = (c: Category) => {
    setForm({ name: c.name, slug: c.slug, description: c.description || "", iconName: c.iconName || "", color: c.color || "#3b82f6" });
    setEditId(c.id); setView("edit"); setError("");
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    await fetch(`${BASE}/api/admin/categories/${id}`, { method: "DELETE", headers: getAuthHeaders(), credentials: "include" });
    setDeleting(null); await fetchData(); onRefresh();
  };

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed bottom-6 right-6 z-[1200] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="w-[400px] max-h-[80vh] bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl shadow-black/30 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Categorii — Admin</h3>
              </div>
              <div className="flex items-center gap-2">
                {view !== "list" ? (
                  <button onClick={() => { setView("list"); setEditId(null); setForm({ ...emptyForm }); setError(""); }}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-secondary transition-colors">
                    ← Listă
                  </button>
                ) : (
                  <button onClick={() => { setView("add"); setEditId(null); setForm({ ...emptyForm }); setError(""); }}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors font-medium">
                    <Plus className="w-3.5 h-3.5" /> Adaugă
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {view === "list" && (
                <div className="divide-y divide-border/50">
                  {categories.length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">Nicio categorie</div>
                  )}
                  {categories.map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors group">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color || "#3b82f6" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.slug} · {c.resourceCount ?? 0} resurse</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(c)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                          className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors">
                          {deleting === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(view === "add" || view === "edit") && (
                <div className="p-4 space-y-3">
                  {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nume *</label>
                    <input value={form.name} onChange={e => { f("name", e.target.value); if (!editId) f("slug", slugify(e.target.value)); }}
                      className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                      placeholder="Geologie Structurală" />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Slug *</label>
                    <input value={form.slug} onChange={e => f("slug", e.target.value)}
                      className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground font-mono outline-none focus:border-primary/50 transition-colors"
                      placeholder="geologie-structurala" />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Descriere</label>
                    <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={2}
                      className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors resize-none"
                      placeholder="Descriere categorie..." />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Iconiță (Lucide icon name)</label>
                    <input value={form.iconName} onChange={e => f("iconName", e.target.value)}
                      className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground font-mono outline-none focus:border-primary/50 transition-colors"
                      placeholder="layers, database, map..." />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Culoare</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => f("color", c)}
                          className="w-6 h-6 rounded-full border-2 transition-all"
                          style={{ backgroundColor: c, borderColor: form.color === c ? "#fff" : "transparent" }} />
                      ))}
                      <input type="color" value={form.color} onChange={e => f("color", e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent" />
                    </div>
                  </div>

                  <button onClick={handleSave} disabled={saving || !form.name || !form.slug}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
                      saving || !form.name || !form.slug
                        ? "bg-secondary text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                    )}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {editId ? "Salvează modificările" : "Adaugă categorie"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm shadow-xl transition-all",
          open
            ? "bg-secondary text-foreground border border-border"
            : "bg-primary text-primary-foreground shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5"
        )}
      >
        {open ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        {open ? "Închide" : "Categorii"}
      </button>
    </div>
  );
}
