import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2, Edit2, Check, Loader2, BookOpen, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("geo3d_token");
  return token ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

const RESOURCE_TYPES = ["publication", "dataset", "map", "model3d", "report", "image"];
const TYPE_LABELS: Record<string, string> = {
  publication: "Publicație", dataset: "Dataset", map: "Hartă",
  model3d: "Model 3D", report: "Raport", image: "Imagine",
};

interface Category { id: number; name: string; }
interface Resource {
  id: number; title: string; type: string; author?: string;
  year?: number; region?: string; categoryId?: number; categoryName?: string;
  description?: string; downloadUrl?: string; thumbnailUrl?: string; tags?: string[];
}

const emptyForm = {
  title: "", type: "publication", description: "", author: "",
  year: "", region: "", categoryId: "", downloadUrl: "", thumbnailUrl: "", tags: "",
};

interface AdminResourcePanelProps {
  onRefresh: () => void;
}

export function AdminResourcePanel({ onRefresh }: AdminResourcePanelProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "add" | "edit">("list");
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState("");

  const fetchData = async () => {
    const [resRes, catRes] = await Promise.all([
      fetch(`${BASE}/api/resources?limit=50`, { credentials: "include" }),
      fetch(`${BASE}/api/categories`, { credentials: "include" }),
    ]);
    const [resData, catData] = await Promise.all([resRes.json(), catRes.json()]);
    setResources(resData.resources || []);
    setCategories(catData || []);
  };

  useEffect(() => { if (open) fetchData(); }, [open]);

  const handleSave = async () => {
    setError(""); setSaving(true);
    try {
      const body = {
        title: form.title, type: form.type,
        description: form.description || undefined,
        author: form.author || undefined,
        year: form.year ? Number(form.year) : undefined,
        region: form.region || undefined,
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        downloadUrl: form.downloadUrl || undefined,
        thumbnailUrl: form.thumbnailUrl || undefined,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      };
      const url = editId ? `${BASE}/api/admin/resources/${editId}` : `${BASE}/api/admin/resources`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(body), credentials: "include" });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Eroare"); return; }
      setForm({ ...emptyForm }); setEditId(null); setView("list");
      await fetchData(); onRefresh();
    } catch { setError("Eroare de rețea"); }
    finally { setSaving(false); }
  };

  const handleEdit = (r: Resource) => {
    setForm({
      title: r.title, type: r.type, description: r.description || "",
      author: r.author || "", year: r.year?.toString() || "",
      region: r.region || "", categoryId: r.categoryId?.toString() || "",
      downloadUrl: r.downloadUrl || "", thumbnailUrl: r.thumbnailUrl || "",
      tags: r.tags?.join(", ") || "",
    });
    setEditId(r.id); setView("edit"); setError("");
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    await fetch(`${BASE}/api/admin/resources/${id}`, { method: "DELETE", headers: getAuthHeaders(), credentials: "include" });
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
            className="w-[420px] max-h-[80vh] bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl shadow-black/30 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Resurse — Admin</h3>
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
              {/* List view */}
              {view === "list" && (
                <div className="divide-y divide-border/50">
                  {resources.length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">Nicio resursă adăugată</div>
                  )}
                  {resources.map(r => (
                    <div key={r.id} className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {TYPE_LABELS[r.type] || r.type}
                          {r.author && ` · ${r.author}`}
                          {r.year && ` · ${r.year}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(r)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id}
                          className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors">
                          {deleting === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add / Edit form */}
              {(view === "add" || view === "edit") && (
                <div className="p-4 space-y-3">
                  {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Titlu *</label>
                    <input value={form.title} onChange={e => f("title", e.target.value)}
                      className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                      placeholder="Titlul resursei" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Tip *</label>
                      <div className="relative">
                        <select value={form.type} onChange={e => f("type", e.target.value)}
                          className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors appearance-none">
                          {RESOURCE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Categorie</label>
                      <div className="relative">
                        <select value={form.categoryId} onChange={e => f("categoryId", e.target.value)}
                          className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors appearance-none">
                          <option value="">— nicio categorie</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Autor</label>
                      <input value={form.author} onChange={e => f("author", e.target.value)}
                        className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                        placeholder="Autor" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">An</label>
                      <input value={form.year} onChange={e => f("year", e.target.value)} type="number"
                        className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                        placeholder="2024" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Regiune</label>
                    <input value={form.region} onChange={e => f("region", e.target.value)}
                      className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                      placeholder="ex: Carpați, Dobrogea..." />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Descriere</label>
                    <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={2}
                      className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors resize-none"
                      placeholder="Descriere scurtă..." />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">URL Download</label>
                    <input value={form.downloadUrl} onChange={e => f("downloadUrl", e.target.value)}
                      className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                      placeholder="https://..." />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">URL Thumbnail</label>
                    <input value={form.thumbnailUrl} onChange={e => f("thumbnailUrl", e.target.value)}
                      className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                      placeholder="https://..." />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Etichete (separate prin virgulă)</label>
                    <input value={form.tags} onChange={e => f("tags", e.target.value)}
                      className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                      placeholder="geologie, cretacic, harta..." />
                  </div>

                  <button onClick={handleSave} disabled={saving || !form.title}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
                      saving || !form.title
                        ? "bg-secondary text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                    )}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {editId ? "Salvează modificările" : "Adaugă resursă"}
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
        {open ? "Închide" : "Resurse"}
      </button>
    </div>
  );
}
