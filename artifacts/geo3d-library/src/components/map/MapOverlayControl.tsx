import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import { createPortal } from "react-dom";
import L from "leaflet";
import { NorthArrow } from "./NorthArrow";

function niceNumber(n: number): number {
  const nice = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
  return nice.reduce((best, v) => Math.abs(v - n) < Math.abs(best - n) ? v : best, 1);
}

function formatDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} km`;
  return `${m} m`;
}

function ScaleBarInner({ map }: { map: L.Map }) {
  const [scale, setScale] = useState({ width: 80, label: "" });

  useEffect(() => {
    const update = () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      const mapWidthPx = map.getSize().x;
      const eastPoint = L.latLng(center.lat, bounds.getEast());
      const mapWidthMeters = center.distanceTo(eastPoint);
      const metersPerPx = mapWidthMeters / (mapWidthPx / 2);
      const rawMeters = metersPerPx * 100;
      const niceMeters = niceNumber(rawMeters);
      const barWidthPx = niceMeters / metersPerPx;
      setScale({ width: Math.min(Math.max(barWidthPx, 40), 200), label: formatDistance(niceMeters) });
    };
    map.on("zoomend moveend", update);
    update();
    return () => { map.off("zoomend moveend", update); };
  }, [map]);

  return (
    <div className="flex flex-col items-start gap-0.5">
      <div className="relative" style={{ width: scale.width }}>
        <div className="h-3 border-l-2 border-r-2 border-b-2 border-slate-300/80" style={{ width: "100%" }}>
          <div className="flex h-full">
            <div className="flex-1 bg-slate-200/80" />
            <div className="flex-1 bg-slate-600/80" />
          </div>
        </div>
      </div>
      <span className="text-[10px] text-slate-200 font-medium leading-none">{scale.label}</span>
    </div>
  );
}

export function MapOverlayControl() {
  const map = useMap();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const CustomControl = L.Control.extend({
      onAdd() {
        const el = L.DomUtil.create("div");
        el.style.cssText = "pointer-events:none;background:transparent;border:none;box-shadow:none;margin-bottom:8px;margin-left:8px;";
        L.DomEvent.disableClickPropagation(el);
        L.DomEvent.disableScrollPropagation(el);
        setContainer(el);
        return el;
      },
      onRemove() { setContainer(null); }
    });

    const ctrl = new (CustomControl as any)({ position: "bottomleft" });
    ctrl.addTo(map);
    return () => ctrl.remove();
  }, [map]);

  if (!container) return null;

  return createPortal(
    <div className="flex flex-col items-start gap-2 select-none">
      <NorthArrow />
      <ScaleBarInner map={map} />
    </div>,
    container
  );
}
