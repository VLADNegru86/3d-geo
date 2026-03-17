import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon, Upload, X, Trash2, Eye, EyeOff, Loader2,
  FileImage, ChevronDown, ChevronUp, Check, SlidersHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("geo3d_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface MapImageItem {
  id: number;
  name: string;
  fileName: string;
  northLat: number;
  southLat: number;
  eastLon: number;
  westLon: number;
  opacity: number;
  visible: boolean;
  createdAt: string;
}

interface MapImageUploadProps {
  images: MapImageItem[];
  onImagesChange: () => void;
  onImageToggle: (id: number, visible: boolean) => void;
  onImageOpacity: (id: number, opacity: number) => void;
}

interface BoundsForm {
  northLat: string;
  southLat: string;
  eastLon: string;
  westLon: string;
}

export function MapImageUpload({ images, onImagesChange, onImageToggle, onImageOpacity }: MapImageUploadProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [imageName, setImageName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [opacityEditId, setOpacityEditId] = useState<number | null>(null);
  const [bounds, setBounds] = useState<BoundsForm>({ northLat: "", southLat: "", eastLon: "", westLon: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setSelectedFile(file);
    setImageName(file.name.replace(/\.[^/.]+$/, ""));
    setUploadError("");
    setUploadSuccess("");
  };

  const boundsValid = () => {
    const { northLat, southLat, eastLon, westLon } = bounds;
    return [northLat, southLat, eastLon, westLon].every(v => v.trim() !== "" && !isNaN(parseFloat(v)));
  };

  const handleUpload = async () => {
    if (!selectedFile || !boundsValid()) return;
    setUploading(true);
    setUploadError("");
    setUploadSuccess("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", imageName || selectedFile.name);
      formData.append("northLat", bounds.northLat);
      formData.append("southLat", bounds.southLat);
      formData.append("eastLon", bounds.eastLon);
      formData.append("westLon", bounds.westLon);
      formData.append("opacity", "0.8");

      const res = await fetch(`${BASE}/api/admin/map-images/upload`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload eșuat");
      setUploadSuccess(`Imaginea „${data.image.name}" a fost adăugată cu succes.`);
      setSelectedFile(null);
      setImageName("");
      setBounds({ northLat: "", southLat: "", eastLon: "", westLon: "" });
      onImagesChange();
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch(`${BASE}/api/admin/map-images/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      onImagesChange();
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpacityChange = async (id: number, opacity: number) => {
    onImageOpacity(id, opacity);
    await fetch(`${BASE}/api/admin/map-images/${id}`, {
      method: "PATCH",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ opacity }),
    });
  };

  const handleVisibilityToggle = async (id: number, visible: boolean) => {
    await fetch(`${BASE}/api/admin/map-images/${id}`, {
      method: "PATCH",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ visible }),
    });
    onImageToggle(id, visible);
    onImagesChange();
  };

  const setBoundsField = (field: keyof BoundsForm, val: string) =>
    setBounds(prev => ({ ...prev, [field]: val }));

  return (
    <div className="absolute top-3 left-[21rem] z-[1000] w-72">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg",
          open
            ? "bg-violet-600 text-white rounded-b-none"
            : "bg-card/95 backdrop-blur-sm border border-border text-foreground hover:border-violet-500/40"
        )}
      >
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          <span>Imagini georef. ({images.length})</span>
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
                  Adaugă imagine georeferențiată
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
                      ? "border-violet-500 bg-violet-500/10"
                      : selectedFile
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-border hover:border-violet-500/40 hover:bg-violet-500/5"
                  )}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".png,.jpg,.jpeg,.tif,.tiff,.webp"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                  {selectedFile ? (
                    <div className="flex items-center gap-2 justify-center">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm text-emerald-400 font-medium truncate max-w-[180px]">
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
                      <FileImage className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">
                        Trage imaginea sau <span className="text-violet-400">alege</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        PNG, JPG, TIFF, WebP
                      </p>
                    </div>
                  )}
                </div>

                {selectedFile && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      value={imageName}
                      onChange={e => setImageName(e.target.value)}
                      placeholder="Numele imaginii..."
                      className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder-muted-foreground focus:ring-1 focus:ring-violet-500 outline-none"
                    />

                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-2">
                      Limite geografice (grade decimale)
                    </p>

                    <div className="grid grid-cols-2 gap-1.5">
                      {([
                        { field: "northLat", label: "Nord (Lat)" },
                        { field: "southLat", label: "Sud (Lat)" },
                        { field: "westLon", label: "Vest (Lon)" },
                        { field: "eastLon", label: "Est (Lon)" },
                      ] as { field: keyof BoundsForm; label: string }[]).map(({ field, label }) => (
                        <div key={field}>
                          <label className="text-[10px] text-muted-foreground mb-0.5 block">{label}</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={bounds[field]}
                            onChange={e => setBoundsField(field, e.target.value)}
                            placeholder="ex. 45.9432"
                            className="w-full px-2 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground placeholder-muted-foreground/50 focus:ring-1 focus:ring-violet-500 outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    <p className="text-[10px] text-muted-foreground/60">
                      Exemplu România: N=48.26, S=43.62, V=20.26, E=29.68
                    </p>

                    <button
                      onClick={handleUpload}
                      disabled={uploading || !boundsValid()}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold disabled:opacity-60 transition-all hover:shadow-md hover:shadow-violet-500/20"
                    >
                      {uploading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Se încarcă...</>
                      ) : (
                        <><Upload className="w-4 h-4" /> Încarcă imaginea</>
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

              {/* Images list */}
              {images.length > 0 && (
                <div className="p-3">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-2">
                    Imagini active
                  </p>
                  <div className="space-y-2">
                    {images.map(img => (
                      <div key={img.id} className="p-2.5 bg-secondary/50 rounded-xl border border-border/50 space-y-2">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{img.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              N{img.northLat.toFixed(2)} S{img.southLat.toFixed(2)} E{img.eastLon.toFixed(2)} V{img.westLon.toFixed(2)}
                            </p>
                          </div>

                          {/* Opacity toggle */}
                          <button
                            onClick={() => setOpacityEditId(opacityEditId === img.id ? null : img.id)}
                            className={cn("p-1.5 rounded-lg transition-colors", opacityEditId === img.id ? "bg-violet-500/20 text-violet-400" : "text-muted-foreground hover:bg-secondary")}
                            title="Ajustează opacitate"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>

                          {/* Visibility toggle */}
                          <button
                            onClick={() => handleVisibilityToggle(img.id, !img.visible)}
                            className={cn("p-1.5 rounded-lg transition-colors", img.visible ? "text-violet-400 hover:bg-violet-500/10" : "text-muted-foreground hover:bg-secondary")}
                            title={img.visible ? "Ascunde" : "Afișează"}
                          >
                            {img.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(img.id)}
                            disabled={deletingId === img.id}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Șterge"
                          >
                            {deletingId === img.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Opacity slider */}
                        {opacityEditId === img.id && (
                          <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                            <span className="text-[10px] text-muted-foreground w-16">Opacitate</span>
                            <input
                              type="range"
                              min={0.1}
                              max={1}
                              step={0.05}
                              value={img.opacity}
                              onChange={e => handleOpacityChange(img.id, parseFloat(e.target.value))}
                              className="flex-1 accent-violet-500"
                            />
                            <span className="text-[10px] text-muted-foreground w-8 text-right">
                              {Math.round(img.opacity * 100)}%
                            </span>
                          </div>
                        )}
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
