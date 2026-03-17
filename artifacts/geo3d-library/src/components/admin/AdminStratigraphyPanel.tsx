import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2, Edit2, Check, Loader2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("geo3d_token");
  return token ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

interface StratUnit {
  id: number; name: string; era: string; period?: string; epoch?: string;
  ageFrom: number; ageTo: number; color?: string; description?: string; region?: string;
}

const ERAS = ["Cenozoic", "Mesozoic", "Paleozoic", "Precambrian"];

const ERA_COLORS: Record<string, string> = {
  Cenozoic: "#fdba74", Mesozoic: "#86efac",
  Paleozoic: "#93c5fd", Precambrian: "#d8b4fe",
};

const emptyForm = {
  name: "", era: "Cenozoic", period: "", epoch: "",
  ageFrom: "", ageTo: "", color: "", description: "", region: "",
};

interface AdminStratigraphyPanelProps { onRefresh: () => void; }

export function AdminStratigraphyPanel({ onRefresh }: AdminStratigraphyPanelProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "add" | "edit">("list");
  const [units, setUnits] = useState<StratUnit[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState("");

  const fetchData = async () => {
    const res = await fetch(`${BASE}/api/stratigraphic-units`, { credentials: "include" });
    const data = await res.json();
    setUnits(Array.isArray(data) ? data : []);
  };

  useEffect(() => { if (open) fetchData(); }, [open]);

  const handleSave = async () => {
    setError(""); setSaving(true);
    try {
      const body = {
        name: form.name, era: form.era,
        period: form.period || undefined, epoch: form.epoch || undefined,
        ageFrom: Number(form.ageFrom), ageTo: Number(form.ageTo),
        color: form.color || ERA_COLORS[form.era] || undefined,
        description: form.description || undefined, region: form.region || undefined,
      };
      const url = editId ? `${BASE}/api/admin/stratigraphic-units/${editId}` : `${BASE}/api/admin/stratigraphic-units`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(body), credentials: "include" });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Eroare"); return; }
      setForm({ ...emptyForm }); setEditId(null); setView("list");
      await fetchData(); onRefresh();
    } catch { setError("Eroare de rețea"); }
    finally { setSaving(false); }
  };

  const handleEdit = (u: StratUnit) => {
    setForm({
      name: u.name, era: u.era, period: u.period || "", epoch: u.epoch || "",
      ageFrom: u.ageFrom.toString(), ageTo: u.ageTo.toString(),
      color: u.color || "", description: u.description || "", region: u.region || "",
    });
    setEditId(u.id); setView("edit"); setError("");
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    await fetch(`${BASE}/api/admin/stratigraphic-units/${id}`, { method: "DELETE", headers: getAuthHeaders(), credentials: "include" });
    setDeleting(null); await fetchData(); onRefresh();
  };

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const grouped = units.reduce((acc: Record<string, StratUnit[]>, u) => {
    if (!acc[u.era]) acc[u.era] = [];
    acc[u.era].push(u);
    return acc;
  }, {});

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
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Stratigrafie — Admin</h3>
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
                <div>
                  {units.length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">Nicio unitate stratigrafică</div>
                  )}
                  {ERAS.map(era => {
                    const eraUnits = grouped[era];
                    if (!eraUnits?.length) return null;
                    return (
                      <div key={era}>
                        <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground bg-secondary/30 border-b border-border/50">
                          {era}
                        </div>
                        {eraUnits.map(u => (
                          <div key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/30 transition-colors group border-b border-border/30">
                            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: u.color || ERA_COLORS[u.era] || "#888" }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                              <p className="text-[11px] text-muted-foreground">{u.period || u.epoch ? `${u.period}${u.epoch ? ` · ${u.epoch}` : ""}` : "—"} · {u.ageFrom}–{u.ageTo} Ma</p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEdit(u)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(u.id)} disabled={deleting === u.id}
                                className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors">
                                {deleting === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {(view === "add" || view === "edit") && (
                <div className="p-4 space-y-3">
                  {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nume *</label>
                    <input value={form.name} onChange={e => f("name", e.target.value)}
                      className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                      placeholder="Cretacic Superior" />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Eră *</label>
                      <select value={form.era} onChange={e => f("era", e.target.value)}
                        className="w-full bg-secondary/60 border border-border rounded-xl px-2 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors">
                        {ERAS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Perioadă</label>
                      <input value={form.period} onChange={e => f("period", e.target.value)}
                        className="w-full bg-secondary/60 border border-border rounded-xl px-2 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                        placeholder="Cretacic" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Epocă</label>
                      <input value={form.epoch} onChange={e => f("epoch", e.target.value)}
                        className="w-full bg-secondary/60 border border-border rounded-xl px-2 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                        placeholder="Superior" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Vârstă De (Ma) *</label>
                      <input value={form.ageFrom} onChange={e => f("ageFrom", e.target.value)} type="number" step="0.1"
                        className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                        placeholder="66" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Vârstă Până (Ma) *</label>
                      <input value={form.ageTo} onChange={e => f("ageTo", e.target.value)} type="number" step="0.1"
                        className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                        placeholder="100.5" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Regiune</label>
                    <input value={form.region} onChange={e => f("region", e.target.value)}
                      className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                      placeholder="Carpați, România..." />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Descriere</label>
                    <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={2}
                      className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors resize-none"
                      placeholder="Descriere unitate stratigrafică..." />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Culoare</label>
                    <div className="flex items-center gap-2">
                      {Object.values(ERA_COLORS).map(c => (
                        <button key={c} onClick={() => f("color", c)}
                          className="w-6 h-6 rounded-full border-2 transition-all"
                          style={{ backgroundColor: c, borderColor: form.color === c ? "#fff" : "transparent" }} />
                      ))}
                      <input type="color" value={form.color || ERA_COLORS[form.era] || "#888"} onChange={e => f("color", e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent" />
                    </div>
                  </div>

                  <button onClick={handleSave} disabled={saving || !form.name || !form.ageFrom || !form.ageTo}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
                      saving || !form.name || !form.ageFrom || !form.ageTo
                        ? "bg-secondary text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                    )}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {editId ? "Salvează modificările" : "Adaugă unitate"}
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
        {open ? "Închide" : "Stratigrafie"}
      </button>
    </div>
  );
}
