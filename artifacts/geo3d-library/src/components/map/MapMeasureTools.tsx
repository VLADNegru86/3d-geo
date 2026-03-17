import { useEffect, useRef, useState, useCallback } from "react";
import { useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Ruler, Pentagon, Trash2, Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type MeasureMode = "none" | "polyline" | "polygon";

/* ── Distance (Haversine, via Leaflet) ───────────────────────────────────── */
function dist(a: L.LatLng, b: L.LatLng): number {
  return a.distanceTo(b);
}

/* ── Spherical polygon area (m²) ─────────────────────────────────────────── */
function sphericalArea(pts: L.LatLng[]): number {
  if (pts.length < 3) return 0;
  const R = 6371000;
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lat1 = (pts[i].lat * Math.PI) / 180;
    const lat2 = (pts[j].lat * Math.PI) / 180;
    const dlon = ((pts[j].lng - pts[i].lng) * Math.PI) / 180;
    area += dlon * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs(area * R * R) / 2;
}

function fmtLen(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(3)} km` : `${m.toFixed(1)} m`;
}
function fmtArea(m2: number): string {
  if (m2 >= 1_000_000) return `${(m2 / 1_000_000).toFixed(4)} km²`;
  if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(2)} ha`;
  return `${m2.toFixed(1)} m²`;
}

function popupHtml(label: string, value: string) {
  return `<div style="min-width:130px;font-family:sans-serif">
    <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px">${label}</div>
    <div style="font-size:17px;font-weight:800;color:#111">${value}</div>
  </div>`;
}

function segLabelHtml(txt: string, color: string) {
  return `<div style="background:${color};color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.4)">${txt}</div>`;
}

/* ── Core inner component (must be rendered inside MapContainer) ─────────── */
interface CoreProps {
  mode: MeasureMode;
  setMode: (m: MeasureMode) => void;
  clearTick?: number;
}

function MeasureCore({ mode, setMode, clearTick = 0 }: CoreProps) {
  const drawnRef = useRef<L.LayerGroup | null>(null);
  const pointsRef = useRef<L.LatLng[]>([]);
  const previewRef = useRef<L.Polyline | L.Polygon | null>(null);
  const ghostRef = useRef<L.Polyline | null>(null);
  const tempMarkersRef = useRef<L.CircleMarker[]>([]);

  const cleanPreview = () => {
    previewRef.current?.remove();
    previewRef.current = null;
    ghostRef.current?.remove();
    ghostRef.current = null;
    tempMarkersRef.current.forEach(m => m.remove());
    tempMarkersRef.current = [];
  };

  const resetDraw = useCallback(() => {
    cleanPreview();
    pointsRef.current = [];
  }, []);

  useEffect(() => {
    if (mode === "none") resetDraw();
  }, [mode, resetDraw]);

  const map = useMapEvents({
    click(e) {
      if (mode === "none" || !drawnRef.current) return;
      const pt = e.latlng;
      pointsRef.current = [...pointsRef.current, pt];
      const pts = pointsRef.current;

      /* node dot */
      const dot = L.circleMarker(pt, {
        radius: 5, color: "#fff", weight: 2,
        fillColor: mode === "polyline" ? "#2563eb" : "#16a34a",
        fillOpacity: 1, interactive: false,
      });
      dot.addTo(drawnRef.current);
      tempMarkersRef.current.push(dot);

      /* preview shape */
      previewRef.current?.remove();
      if (mode === "polyline" && pts.length >= 2) {
        previewRef.current = L.polyline(pts, {
          color: "#2563eb", weight: 2, dashArray: "6 4", opacity: 0.8, interactive: false,
        }).addTo(drawnRef.current);
      } else if (mode === "polygon" && pts.length >= 3) {
        previewRef.current = L.polygon(pts, {
          color: "#16a34a", weight: 2, fillColor: "#16a34a",
          fillOpacity: 0.15, dashArray: "6 4", interactive: false,
        }).addTo(drawnRef.current);
      }
    },

    dblclick(e) {
      if (mode === "none" || !drawnRef.current) return;
      e.originalEvent.preventDefault();
      const pts = [...pointsRef.current];
      resetDraw();

      if (mode === "polyline" && pts.length >= 2) {
        const line = L.polyline(pts, { color: "#2563eb", weight: 3 }).addTo(drawnRef.current);
        let total = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          const d = dist(pts[i], pts[i + 1]);
          total += d;
          /* segment label */
          const mid = L.latLng((pts[i].lat + pts[i + 1].lat) / 2, (pts[i].lng + pts[i + 1].lng) / 2);
          L.marker(mid, {
            icon: L.divIcon({ html: segLabelHtml(fmtLen(d), "#2563eb"), className: "", iconAnchor: [30, 10] }),
            interactive: false,
          }).addTo(drawnRef.current);
        }
        pts.forEach(p => L.circleMarker(p, {
          radius: 4, color: "#fff", weight: 2, fillColor: "#2563eb", fillOpacity: 1, interactive: false,
        }).addTo(drawnRef.current!));
        line.bindPopup(popupHtml("Lungime totală", fmtLen(total)), { maxWidth: 220 })
            .openPopup(pts[Math.floor(pts.length / 2)]);

      } else if (mode === "polygon" && pts.length >= 3) {
        const poly = L.polygon(pts, {
          color: "#16a34a", weight: 2.5, fillColor: "#16a34a", fillOpacity: 0.18,
        }).addTo(drawnRef.current);
        const area = sphericalArea(pts);
        let perim = 0;
        const closed = [...pts, pts[0]];
        for (let i = 0; i < closed.length - 1; i++) perim += dist(closed[i], closed[i + 1]);
        pts.forEach(p => L.circleMarker(p, {
          radius: 4, color: "#fff", weight: 2, fillColor: "#16a34a", fillOpacity: 1, interactive: false,
        }).addTo(drawnRef.current!));
        const center = poly.getBounds().getCenter();
        L.marker(center, {
          icon: L.divIcon({ html: segLabelHtml(`Perim: ${fmtLen(perim)}`, "#16a34a"), className: "", iconAnchor: [40, -14] }),
          interactive: false,
        }).addTo(drawnRef.current);
        poly.bindPopup(popupHtml("Suprafață", fmtArea(area)), { maxWidth: 220 })
            .openPopup(center);
      }

      setMode("none");
    },

    mousemove(e) {
      if (mode === "none" || !drawnRef.current || pointsRef.current.length === 0) return;
      ghostRef.current?.remove();
      ghostRef.current = L.polyline(
        [pointsRef.current[pointsRef.current.length - 1], e.latlng],
        { color: mode === "polyline" ? "#2563eb" : "#16a34a", weight: 1.5, dashArray: "4 5", opacity: 0.55, interactive: false }
      ).addTo(drawnRef.current);
    },
  });

  /* init layer group */
  useEffect(() => {
    const lg = L.layerGroup().addTo(map);
    drawnRef.current = lg;
    return () => { lg.remove(); };
  }, [map]);

  /* clearAll when parent increments clearTick */
  const prevTickRef = useRef(clearTick);
  useEffect(() => {
    if (clearTick !== prevTickRef.current) {
      prevTickRef.current = clearTick;
      drawnRef.current?.clearLayers();
      resetDraw();
    }
  }, [clearTick, resetDraw]);

  return null;
}

/* ── Toolbar (HTML overlay, placed outside Canvas) ───────────────────────── */
export function MapMeasureToolbar({ mode, setMode, onClearAll, className }: {
  mode: MeasureMode;
  setMode: (m: MeasureMode) => void;
  onClearAll: () => void;
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const toggle = (m: MeasureMode) => setMode(mode === m ? "none" : m);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/* Header / toggle button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-card/95 backdrop-blur-sm border border-border shadow-xl shadow-black/20 text-xs font-semibold text-foreground hover:border-primary/30 transition-all w-full"
      >
        <div className="flex items-center gap-2">
          <Ruler className="w-3.5 h-3.5 text-primary" />
          Măsurare
        </div>
        {collapsed
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {!collapsed && (
        <>
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-xl shadow-black/20 p-1.5 flex flex-col gap-1">
            <button
              onClick={() => toggle("polyline")}
              title="Linie — clic = punct, dublu-clic = finalizare"
              className={cn(
                "flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all",
                mode === "polyline" ? "bg-blue-600 text-white shadow-md" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Ruler className="w-3.5 h-3.5 flex-shrink-0" />
              Lungime
            </button>

            <button
              onClick={() => toggle("polygon")}
              title="Poligon — clic = punct, dublu-clic = finalizare"
              className={cn(
                "flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all",
                mode === "polygon" ? "bg-green-600 text-white shadow-md" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Pentagon className="w-3.5 h-3.5 flex-shrink-0" />
              Suprafață
            </button>

            <div className="border-t border-border/50 my-0.5" />

            <button
              onClick={onClearAll}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
              Șterge tot
            </button>
          </div>

          {mode !== "none" && (
            <div className={cn(
              "bg-card/95 backdrop-blur-sm border rounded-xl px-3 py-2 text-[10px] leading-snug shadow-xl",
              mode === "polyline" ? "border-blue-500/40 text-blue-400" : "border-green-500/40 text-green-400"
            )}>
              <div className="flex items-center gap-1.5 font-semibold mb-0.5">
                <Check className="w-3 h-3" />
                {mode === "polyline" ? "Mod linie" : "Mod poligon"}
              </div>
              <p className="text-white/50">Clic = adaugă punct</p>
              <p className="text-white/50">Dublu-clic = finalizare</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Combined component to use inside MapContainer ───────────────────────── */
export function MapMeasureInMap({ mode, setMode, clearTick }: {
  mode: MeasureMode;
  setMode: (m: MeasureMode) => void;
  clearTick?: number;
}) {
  return <MeasureCore mode={mode} setMode={setMode} clearTick={clearTick} />;
}
