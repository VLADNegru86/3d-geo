import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import proj4 from "proj4";

export type GridCRS = "geographic" | "utm" | "stereo70";

interface MapGridOverlayProps {
  crs: GridCRS;
  spacing?: number;
  color?: string;
  opacity?: number;
  enabled?: boolean;
}

// ─── Projection definitions ─────────────────────────────────────────────────

proj4.defs("EPSG:31700", "+proj=sterea +lat_0=45.9 +lon_0=25.39246588888889 +k=0.9996 +x_0=500000 +y_0=500000 +ellps=krass +towgs84=33.4,-146.6,-76.3,-0.359,-0.053,0.844,-0.84 +units=m +no_defs");

const UTM_ZONES: Record<number, string> = {
  34: "+proj=utm +zone=34 +datum=WGS84 +units=m +no_defs",
  35: "+proj=utm +zone=35 +datum=WGS84 +units=m +no_defs",
  36: "+proj=utm +zone=36 +datum=WGS84 +units=m +no_defs",
};
for (const [z, def] of Object.entries(UTM_ZONES)) {
  proj4.defs(`EPSG:326${z}`, def);
}

function toWGS84(x: number, y: number, crs: GridCRS, utmZone?: number): [number, number] {
  if (crs === "geographic") return [y, x]; // [lat, lon]
  if (crs === "stereo70") {
    const [lon, lat] = proj4("EPSG:31700", "EPSG:4326", [x, y]);
    return [lat, lon];
  }
  if (crs === "utm") {
    const zone = utmZone || 35;
    const [lon, lat] = proj4(`EPSG:326${zone}`, "EPSG:4326", [x, y]);
    return [lat, lon];
  }
  return [y, x];
}

function getGridParams(crs: GridCRS, map: L.Map): {
  min: [number, number]; max: [number, number];
  stepX: number; stepY: number; utmZone?: number;
} {
  const bounds = map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  if (crs === "geographic") {
    const spanLon = ne.lng - sw.lng;
    const spanLat = ne.lat - sw.lat;
    const span = Math.max(spanLon, spanLat);
    const raw = span / 5;
    const exp = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 30, 45].reduce((best, v) =>
      Math.abs(v * exp - raw) < Math.abs(best * exp - raw) ? v : best, 1) * exp;

    return {
      min: [Math.floor(sw.lng / step) * step, Math.floor(sw.lat / step) * step],
      max: [Math.ceil(ne.lng / step) * step, Math.ceil(ne.lat / step) * step],
      stepX: step, stepY: step,
    };
  }

  if (crs === "stereo70") {
    const [xmin, ymin] = proj4("EPSG:4326", "EPSG:31700", [sw.lng, sw.lat]);
    const [xmax, ymax] = proj4("EPSG:4326", "EPSG:31700", [ne.lng, ne.lat]);
    const span = Math.max(xmax - xmin, ymax - ymin);
    const raw = span / 5;
    const step = Math.pow(10, Math.ceil(Math.log10(raw)));
    return {
      min: [Math.floor(xmin / step) * step, Math.floor(ymin / step) * step],
      max: [Math.ceil(xmax / step) * step, Math.ceil(ymax / step) * step],
      stepX: step, stepY: step,
    };
  }

  // UTM
  const centerLon = (sw.lng + ne.lng) / 2;
  const utmZone = Math.floor((centerLon + 180) / 6) + 1;
  const code = `EPSG:326${utmZone}`;
  const [xmin, ymin] = proj4("EPSG:4326", code, [sw.lng, sw.lat]);
  const [xmax, ymax] = proj4("EPSG:4326", code, [ne.lng, ne.lat]);
  const span = Math.max(xmax - xmin, ymax - ymin);
  const raw = span / 5;
  const step = Math.pow(10, Math.ceil(Math.log10(raw)));
  return {
    min: [Math.floor(xmin / step) * step, Math.floor(ymin / step) * step],
    max: [Math.ceil(xmax / step) * step, Math.ceil(ymax / step) * step],
    stepX: step, stepY: step,
    utmZone,
  };
}

export function MapGridOverlay({ crs, color = "#2563eb", opacity = 0.5, enabled = true }: MapGridOverlayProps) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const labelLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!enabled) {
      layerRef.current?.clearLayers();
      labelLayerRef.current?.clearLayers();
      return;
    }

    const draw = () => {
      layerRef.current?.clearLayers();
      labelLayerRef.current?.clearLayers();

      const params = getGridParams(crs, map);
      const { min, max, stepX, stepY, utmZone } = params;
      const bounds = map.getBounds();
      const PADDING = 0.05;
      const B_SW = bounds.getSouthWest();
      const B_NE = bounds.getNorthEast();

      const lineOpts: L.PolylineOptions = { color, weight: 1.2, opacity, dashArray: "5 7", interactive: false };

      const makeLabelHtml = (val: string, isVertical: boolean) =>
        `<div style="
          color:#fff;
          font-size:11px;
          font-weight:700;
          font-family:monospace;
          white-space:nowrap;
          background:rgba(0,0,0,0.72);
          border:1px solid rgba(255,255,255,0.18);
          padding:2px 5px;
          border-radius:3px;
          letter-spacing:0.02em;
          box-shadow:0 1px 4px rgba(0,0,0,0.5);
          ${isVertical ? "transform:rotate(-90deg);transform-origin:left center;" : ""}
        ">${val}</div>`;

      // Vertical lines (constant X)
      for (let x = min[0]; x <= max[0] + stepX * 0.01; x += stepX) {
        const pts: L.LatLngTuple[] = [];
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const y = min[1] + (max[1] - min[1]) * t;
          const [lat, lon] = toWGS84(x, y, crs, utmZone);
          if (lat >= B_SW.lat - PADDING && lat <= B_NE.lat + PADDING) {
            pts.push([lat, lon]);
          }
        }
        if (pts.length >= 2) {
          L.polyline(pts, lineOpts).addTo(layerRef.current!);
          const labelVal = crs === "geographic"
            ? `${x.toFixed(x < 1 ? 3 : 2)}°`
            : crs === "stereo70"
              ? `X=${(x / 1000).toFixed(0)}k`
              : `${(x / 1000).toFixed(0)}kE`;
          /* label near bottom edge */
          const lastPt = pts[pts.length - 1];
          L.marker(lastPt, {
            icon: L.divIcon({
              html: makeLabelHtml(labelVal, false),
              className: "",
              iconAnchor: [0, 20],
            }),
            interactive: false,
          }).addTo(labelLayerRef.current!);
        }
      }

      // Horizontal lines (constant Y)
      for (let y = min[1]; y <= max[1] + stepY * 0.01; y += stepY) {
        const pts: L.LatLngTuple[] = [];
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = min[0] + (max[0] - min[0]) * t;
          const [lat, lon] = toWGS84(x, y, crs, utmZone);
          if (lon >= B_SW.lng - PADDING && lon <= B_NE.lng + PADDING) {
            pts.push([lat, lon]);
          }
        }
        if (pts.length >= 2) {
          L.polyline(pts, lineOpts).addTo(layerRef.current!);
          const labelVal = crs === "geographic"
            ? `${y.toFixed(y < 1 ? 3 : 2)}°`
            : crs === "stereo70"
              ? `Y=${(y / 1000).toFixed(0)}k`
              : `${(y / 1000).toFixed(0)}kN`;
          /* label near left edge */
          L.marker(pts[0], {
            icon: L.divIcon({
              html: makeLabelHtml(labelVal, false),
              className: "",
              iconAnchor: [0, 10],
            }),
            interactive: false,
          }).addTo(labelLayerRef.current!);
        }
      }
    };

    if (!layerRef.current) {
      layerRef.current = L.layerGroup().addTo(map);
      labelLayerRef.current = L.layerGroup().addTo(map);
    }

    draw();
    map.on("moveend zoomend", draw);

    return () => {
      map.off("moveend zoomend", draw);
      layerRef.current?.clearLayers();
      labelLayerRef.current?.clearLayers();
    };
  }, [map, crs, color, opacity, enabled]);

  return null;
}
