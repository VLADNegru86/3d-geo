import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, X, Trash2, Eye, EyeOff, Loader2,
  FileUp, Layers, ChevronDown, ChevronUp, Palette, Check
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("geo3d_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface LayerItem {
  id: number;
  name: string;
  fileType: string;
  geojson: GeoJSON.FeatureCollection;
  color: string;
  visible: boolean;
  featureCount: number;
  createdAt: string;
}

const PRESET_COLORS = [
  "#f59e0b", "#ef4444", "#10b981", "#3b82f6",
  "#8b5cf6", "#ec4899", "#f97316", "#06b6d4",
  "#84cc16", "#ffffff",
];

const FILE_FORMATS = [
  { ext: ".zip", label: "Shapefile (ZIP)", desc: "Arhivă ZIP cu .shp, .dbf, .shx, .prj" },
  { ext: ".shp", label: "Shapefile", desc: "Fișier .shp (fără arhivă)" },
  { ext: ".geojson", label: "GeoJSON", desc: "Format GeoJSON standard" },
  { ext: ".json", label: "JSON GeoJSON", desc: "Fișier JSON cu date geografice" },
  { ext: ".kml", label: "KML", desc: "Keyhole Markup Language (Google Earth)" },
  { ext: ".gpx", label: "GPX", desc: "GPS Exchange Format" },
];

interface MapLayerUploadProps {
  layers: LayerItem[];
  onLayersChange: () => void;
  onLayerToggle: (id: number, visible: boolean) => void;
}

export function MapLayerUpload({ layers, onLayersChange, onLayerToggle }: MapLayerUploadProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [layerName, setLayerName] = useState("");
  const [layerColor, setLayerColor] = useState("#3b82f6");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [colorPickerId, setColorPickerId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setSelectedFile(file);
    setLayerName(file.name.replace(/\.[^/.]+$/, ""));
    setUploadError("");
    setUploadSuccess("");
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError("");
    setUploadSuccess("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", layerName || selectedFile.name);
      formData.append("color", layerColor);

      const res = await fetch(`${BASE}/api/admin/map-layers/upload`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload eșuat");
      setUploadSuccess(`Stratul „${data.layer.name}" a fost adăugat cu ${data.layer.featureCount} elemente.`);
      setSelectedFile(null);
      setLayerName("");
      onLayersChange();
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch(`${BASE}/api/admin/map-layers/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      onLayersChange();
    } finally {
      setDeletingId(null);
    }
  };

  const handleColorChange = async (id: number, color: string) => {
    await fetch(`${BASE}/api/admin/map-layers/${id}`, {
      method: "PATCH",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ color }),
    });
    setColorPickerId(null);
    onLayersChange();
  };

  const handleVisibilityToggle = async (id: number, visible: boolean) => {
    await fetch(`${BASE}/api/admin/map-layers/${id}`, {
      method: "PATCH",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ visible }),
    });
    onLayerToggle(id, visible);
    onLayersChange();
  };

  return (
    <div className="absolute top-3 left-3 z-[1000] w-80">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg",
          open
            ? "bg-primary text-primary-foreground rounded-b-none"
            : "bg-card/95 backdrop-blur-sm border border-border text-foreground hover:border-primary/30"
        )}
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" />
          <span>Straturi date ({layers.length})</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card/95 backdrop-blur-md border border-t-0 border-border rounded-b-xl shadow-2xl shadow-black/30 overflow-hidden max-h-[70vh] overflow-y-auto">

              {/* Upload section */}
              <div className="p-4 border-b border-border/50">
                <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-3">
                  Încarcă strat nou
                </p>

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleFile(file);
                  }}
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all",
                    dragOver
                      ? "border-primary bg-primary/10"
                      : selectedFile
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-border hover:border-primary/40 hover:bg-primary/5"
                  )}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".zip,.shp,.geojson,.json,.kml,.gpx"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                  {selectedFile ? (
                    <div className="flex items-center gap-2 justify-center">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm text-emerald-400 font-medium truncate max-w-[200px]">
                        {selectedFile.name}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <FileUp className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">
                        Trage fișierul sau <span className="text-primary">alege</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        ZIP (SHP), GeoJSON, KML, GPX
                      </p>
                    </div>
                  )}
                </div>

                {/* Formats info */}
                <details className="mt-2">
                  <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                    Formate acceptate ▾
                  </summary>
                  <div className="mt-1.5 space-y-1">
                    {FILE_FORMATS.map(f => (
                      <div key={f.ext} className="flex items-start gap-2 text-[10px]">
                        <code className="bg-secondary px-1 rounded text-primary font-mono">{f.ext}</code>
                        <span className="text-muted-foreground">{f.desc}</span>
                      </div>
                    ))}
                  </div>
                </details>

                {selectedFile && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      value={layerName}
                      onChange={e => setLayerName(e.target.value)}
                      placeholder="Nume strat..."
                      className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder-muted-foreground focus:ring-1 focus:ring-primary outline-none"
                    />

                    {/* Color picker */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Culoare:</span>
                      <div className="flex gap-1 flex-wrap">
                        {PRESET_COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => setLayerColor(c)}
                            className={cn(
                              "w-5 h-5 rounded-full border-2 transition-transform hover:scale-110",
                              layerColor === c ? "border-white scale-110" : "border-transparent"
                            )}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60 transition-all hover:shadow-md hover:shadow-primary/20"
                    >
                      {uploading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Se procesează...</>
                      ) : (
                        <><Upload className="w-4 h-4" /> Încarcă stratul</>
                      )}
                    </button>
                  </div>
                )}

                {uploadError && (
                  <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
                    ⚠ {uploadError}
                  </div>
                )}
                {uploadSuccess && (
                  <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400">
                    ✓ {uploadSuccess}
                  </div>
                )}
              </div>

              {/* Layers list */}
              {layers.length > 0 && (
                <div className="p-3">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-2">
                    Straturi active
                  </p>
                  <div className="space-y-2">
                    {layers.map(layer => (
                      <div
                        key={layer.id}
                        className="flex items-center gap-2 p-2.5 bg-secondary/50 rounded-xl border border-border/50"
                      >
                        {/* Color dot + color picker */}
                        <div className="relative">
                          <button
                            onClick={() => setColorPickerId(colorPickerId === layer.id ? null : layer.id)}
                            className="w-6 h-6 rounded-full border-2 border-white/20 hover:border-white/60 transition-colors flex-shrink-0"
                            style={{ backgroundColor: layer.color }}
                            title="Schimbă culoarea"
                          />
                          {colorPickerId === layer.id && (
                            <div className="absolute left-0 top-8 z-10 bg-card border border-border rounded-xl p-2 shadow-xl">
                              <div className="grid grid-cols-5 gap-1">
                                {PRESET_COLORS.map(c => (
                                  <button
                                    key={c}
                                    onClick={() => handleColorChange(layer.id, c)}
                                    className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform"
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Name + info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{layer.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">
                            {layer.fileType} · {layer.featureCount} elem.
                          </p>
                        </div>

                        {/* Visibility toggle */}
                        <button
                          onClick={() => handleVisibilityToggle(layer.id, !layer.visible)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            layer.visible
                              ? "text-primary hover:bg-primary/10"
                              : "text-muted-foreground hover:bg-secondary"
                          )}
                          title={layer.visible ? "Ascunde" : "Afișează"}
                        >
                          {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(layer.id)}
                          disabled={deletingId === layer.id}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Șterge"
                        >
                          {deletingId === layer.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
