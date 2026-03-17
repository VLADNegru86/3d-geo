import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Check, Loader2, MapPin, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("geo3d_token");
  return token ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

const POINT_TYPES = ["borehole", "outcrop", "fossil", "fault", "sample"];
const TYPE_LABELS: Record<string, string> = {
  borehole: "Foraj", outcrop: "Afloriment", fossil: "Fosilă", fault: "Falie", sample: "Probă",
};

const emptyForm = {
  name: "", type: "outcrop", latitude: "", longitude: "",
  description: "", age: "", formation: "", resourceId: "",
};

interface AdminMapPointPanelProps { onRefresh: () => void; }

export function AdminMapPointPanel({ onRefresh }: AdminMapPointPanelProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError(""); setSaving(true); setSuccess(false);
    try {
      const body = {
        name: form.name, type: form.type,
        latitude: Number(form.latitude), longitude: Number(form.longitude),
        description: form.description || undefined,
        age: form.age || undefined, formation: form.formation || undefined,
        resourceId: form.resourceId ? Number(form.resourceId) : undefined,
      };
      const res = await fetch(`${BASE}/api/admin/map-points`, {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify(body), credentials: "include",
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Eroare"); return; }
      setForm({ ...emptyForm }); setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
      onRefresh();
    } catch { setError("Eroare de rețea"); }
    finally { setSaving(false); }
  };

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.name && form.latitude && form.longitude && !isNaN(Number(form.latitude)) && !isNaN(Number(form.longitude));

  return (
    <div className="fixed bottom-6 left-6 z-[1200] flex flex-col items-start gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="w-[360px] bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl shadow-black/30 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Adaugă Punct Geologic</h3>
              </div>
              <button onClick={() => setOpen(false)} className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
              {success && <p className="text-xs text-green-400 bg-green-500/10 rounded-lg px-3 py-2 flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Punct adăugat cu succes!</p>}

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nume *</label>
                <input value={form.name} onChange={e => f("name", e.target.value)}
                  className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                  placeholder="Foraj Berca-1" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tip *</label>
                <div className="relative">
                  <select value={form.type} onChange={e => f("type", e.target.value)}
                    className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors appearance-none">
                    {POINT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Latitudine *</label>
                  <input value={form.latitude} onChange={e => f("latitude", e.target.value)} type="number" step="0.0001"
                    className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground font-mono outline-none focus:border-primary/50 transition-colors"
                    placeholder="45.9432" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Longitudine *</label>
                  <input value={form.longitude} onChange={e => f("longitude", e.target.value)} type="number" step="0.0001"
                    className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground font-mono outline-none focus:border-primary/50 transition-colors"
                    placeholder="24.9668" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Vârstă geologică</label>
                  <input value={form.age} onChange={e => f("age", e.target.value)}
                    className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                    placeholder="Cretacic" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Formațiune</label>
                  <input value={form.formation} onChange={e => f("formation", e.target.value)}
                    className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                    placeholder="Flysch" />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Descriere</label>
                <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={2}
                  className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors resize-none"
                  placeholder="Detalii despre punct..." />
              </div>

              <button onClick={handleSave} disabled={saving || !valid}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  saving || !valid
                    ? "bg-secondary text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                )}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adaugă pe hartă
              </button>
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
        {open ? <X className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
        {open ? "Închide" : "Punct nou"}
      </button>
    </div>
  );
}
