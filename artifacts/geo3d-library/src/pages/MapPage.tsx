import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useListMapPoints } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Layers, Map as MapIcon, Satellite, X, MapPin, Info, ArrowRight, Search, Loader2, Grid3X3, Camera, ChevronDown, ChevronUp, Image as ImageIcon } from "lucide-react";
import { Link } from "wouter";
import html2canvas from "html2canvas";
import { cn } from "@/lib/utils";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
  GeoJSON,
  ImageOverlay,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useAuth } from "@/contexts/AuthContext";
import { MapLayerUpload, type LayerItem } from "@/components/map/MapLayerUpload";
import { MapImageUpload, type MapImageItem } from "@/components/map/MapImageUpload";
import { AdminMapPointPanel } from "@/components/admin/AdminMapPointPanel";
import { MapGridOverlay, type GridCRS } from "@/components/map/MapGridOverlay";
import { MapOverlayControl } from "@/components/map/MapOverlayControl";
import { MapMeasureInMap, MapMeasureToolbar, type MeasureMode } from "@/components/map/MapMeasureTools";

// Fix leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const typeColors: Record<string, string> = {
  borehole: "#f59e0b",
  outcrop: "#10b981",
  fossil: "#8b5cf6",
  fault: "#ef4444",
  sample: "#3b82f6",
};

function createIcon(type: string) {
  const color = typeColors[type] || "#f59e0b";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26S32 26 32 16C32 7.163 24.837 0 16 0z" fill="${color}" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,0.4))"/>
    <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
    <circle cx="16" cy="16" r="4" fill="${color}"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -44],
  });
}

type LayerType = "street" | "satellite" | "hybrid";

const mapTypes = ["all", "borehole", "outcrop", "fossil", "fault", "sample"];

const typeLabels: Record<string, string> = {
  borehole: "Foraj",
  outcrop: "Afloriment",
  fossil: "Fosilă",
  fault: "Falie",
  sample: "Probă",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// Inner component that uses useMap() to fly to coordinates
function FlyToLocation({ coords }: { coords: [number, number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo([coords[0], coords[1]], coords[2], { duration: 1.4 });
    }
  }, [coords, map]);
  return null;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  boundingbox: [string, string, string, string];
}

export default function MapPage() {
  const [selectedType, setSelectedType] = useState<string>("");
  const [activeLayer, setActiveLayer] = useState<LayerType>("hybrid");
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);
  const [uploadedLayers, setUploadedLayers] = useState<LayerItem[]>([]);
  const [mapImages, setMapImages] = useState<MapImageItem[]>([]);
  const [measureMode, setMeasureMode] = useState<MeasureMode>("none");
  const [measureClearTick, setMeasureClearTick] = useState(0);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const mapAreaRef = useRef<HTMLDivElement>(null);
  const handleMeasureClearAll = useCallback(() => {
    setMeasureClearTick(t => t + 1);
    setMeasureMode("none");
  }, []);

  const handleMapScreenshot = useCallback(async () => {
    if (!mapAreaRef.current) return;
    try {
      const canvas = await html2canvas(mapAreaRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 1.5,
        ignoreElements: el => {
          const z = (el as HTMLElement).style?.zIndex;
          return z === "1000" || z === "1200"; /* skip UI overlays */
        },
      });
      const link = document.createElement("a");
      link.download = `harta-geologica-${new Date().toISOString().slice(0,10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Screenshot failed:", e);
    }
  }, []);
  const { user } = useAuth();

  // Grid state
  const [gridEnabled, setGridEnabled] = useState(false);
  const [gridCrs, setGridCrs] = useState<GridCRS>("geographic");
  const [showGridPanel, setShowGridPanel] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [flyTo, setFlyTo] = useState<[number, number, number] | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: points, isLoading, refetch: refetchPoints } = useListMapPoints({ type: selectedType || undefined }) as any;

  /* active marker types derived from loaded points — must be after points declaration */
  const activeMarkerTypes = useMemo(() => {
    if (!points?.length) return [] as string[];
    const types = new Set<string>(points.map((p: any) => p.type as string));
    return Object.keys(typeColors).filter(t => types.has(t));
  }, [points]);

  const fetchLayers = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/map-layers`, { credentials: "include" });
      const data = await res.json();
      setUploadedLayers(data.layers || []);
    } catch {
      setUploadedLayers([]);
    }
  }, []);

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/map-images`, { credentials: "include" });
      const data = await res.json();
      setMapImages(data.images || []);
    } catch {
      setMapImages([]);
    }
  }, []);

  useEffect(() => { fetchLayers(); fetchImages(); }, [fetchLayers, fetchImages]);

  const handleImageToggle = (id: number, visible: boolean) => {
    setMapImages(prev => prev.map(img => img.id === id ? { ...img, visible } : img));
  };

  const handleImageOpacity = (id: number, opacity: number) => {
    setMapImages(prev => prev.map(img => img.id === id ? { ...img, opacity } : img));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced Nominatim geocoding
  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value);
    setSearchOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim() || value.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: value.trim(),
          format: "json",
          limit: "6",
          addressdetails: "0",
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          headers: { "Accept-Language": "ro,en" },
        });
        const data: NominatimResult[] = await res.json();
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  }, []);

  const handleSelectResult = useCallback((result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    // Compute zoom from bounding box size
    const bb = result.boundingbox;
    const latSpan = Math.abs(parseFloat(bb[1]) - parseFloat(bb[0]));
    const zoom = latSpan < 0.02 ? 15 : latSpan < 0.1 ? 13 : latSpan < 0.5 ? 11 : latSpan < 2 ? 9 : 7;
    setFlyTo([lat, lon, zoom]);
    setSearchQuery(result.display_name.split(",").slice(0, 2).join(","));
    setSearchOpen(false);
    setSearchResults([]);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
    searchInputRef.current?.focus();
  }, []);

  const handleLayerToggle = (id: number, visible: boolean) => {
    setUploadedLayers(prev => prev.map(l => l.id === id ? { ...l, visible } : l));
  };

  const center: [number, number] = [45.9432, 24.9668];

  const layerButtons: { id: LayerType; label: string; icon: any }[] = [
    { id: "street", label: "Stradă", icon: MapIcon },
    { id: "satellite", label: "Satelit", icon: Satellite },
    { id: "hybrid", label: "Hibrid", icon: Layers },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      {/* Header / Controls */}
      <div className="bg-card/90 backdrop-blur-sm border-b border-border px-4 py-3 z-20 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-md shadow-black/20">
        <div>
          <h1 className="text-xl font-serif font-bold text-foreground">Harta Geologică Interactivă</h1>
          <p className="text-xs text-muted-foreground">{points?.length ?? 0} puncte geologice · {uploadedLayers.length} straturi încărcate</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          {/* Type filter */}
          <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-xl border border-border">
            <Filter className="w-3.5 h-3.5 text-muted-foreground ml-1.5" />
            {mapTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type === "all" ? "" : type)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-lg capitalize transition-all",
                  (type === "all" && selectedType === "") || selectedType === type
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                {type === "all" ? "Toate" : typeLabels[type] || type}
              </button>
            ))}
          </div>

          {/* Layer switcher */}
          <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-xl border border-border">
            {layerButtons.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveLayer(id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all",
                  activeLayer === id
                    ? "bg-card text-foreground shadow-md border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Screenshot */}
          <button
            onClick={handleMapScreenshot}
            title="Salvează harta ca imagine PNG"
            className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-xl border bg-secondary/60 text-muted-foreground border-border hover:text-foreground hover:border-primary/30 transition-all"
          >
            <Camera className="w-3.5 h-3.5" />
            Screenshot
          </button>

          {/* Grid toggle */}
          <div className="relative">
            <button
              onClick={() => setShowGridPanel(!showGridPanel)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-xl border transition-all",
                gridEnabled
                  ? "bg-primary/20 text-primary border-primary/40"
                  : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
              )}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              Grilă
            </button>
            {showGridPanel && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-xl z-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground">Configurare grilă</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Activă</span>
                  <button
                    onClick={() => setGridEnabled(!gridEnabled)}
                    className={cn("w-10 h-5 rounded-full transition-colors relative", gridEnabled ? "bg-primary" : "bg-secondary")}
                  >
                    <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", gridEnabled ? "translate-x-5" : "translate-x-0.5")} />
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Sistem de coordonate</p>
                  {(["geographic", "utm", "stereo70"] as GridCRS[]).map(c => (
                    <button
                      key={c}
                      onClick={() => { setGridCrs(c); setGridEnabled(true); }}
                      className={cn("w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all", gridCrs === c && gridEnabled ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/5")}
                    >
                      {c === "geographic" ? "Geographic (Lat/Lon)" : c === "utm" ? "UTM WGS84" : "Stereo70 (EPSG:31700)"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div ref={mapAreaRef} className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/50 backdrop-blur-sm pointer-events-none">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Se încarcă harta...</p>
            </div>
          </div>
        )}

        <MapContainer
          center={center}
          zoom={7}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          className="z-0"
        >
          <ZoomControl position="bottomright" />
          <FlyToLocation coords={flyTo} />

          {/* Street */}
          {activeLayer === "street" && (
            <TileLayer
              key="street"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={19}
            />
          )}

          {/* Satellite */}
          {activeLayer === "satellite" && (
            <TileLayer
              key="satellite"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS"
              maxZoom={19}
            />
          )}

          {/* Hybrid = Satellite + Labels */}
          {activeLayer === "hybrid" && (
            <>
              <TileLayer
                key="hybrid-sat"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Tiles &copy; Esri"
                maxZoom={19}
              />
              <TileLayer
                key="hybrid-labels"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                attribution=""
                maxZoom={19}
                opacity={0.85}
              />
            </>
          )}

          {/* Uploaded GeoJSON layers */}
          {uploadedLayers
            .filter(l => l.visible)
            .map(layer => (
              <GeoJSON
                key={`${layer.id}-${layer.color}-${layer.visible}`}
                data={layer.geojson}
                style={() => ({
                  color: layer.color,
                  weight: 2,
                  opacity: 0.85,
                  fillColor: layer.color,
                  fillOpacity: 0.25,
                })}
                pointToLayer={(_feature, latlng) => {
                  return L.circleMarker(latlng, {
                    radius: 7,
                    fillColor: layer.color,
                    color: "#fff",
                    weight: 1.5,
                    opacity: 1,
                    fillOpacity: 0.85,
                  });
                }}
                onEachFeature={(feature, leafLayer) => {
                  /* popup on click */
                  if (feature.properties) {
                    const props = feature.properties as Record<string, any>;
                    const entries = Object.entries(props).slice(0, 8);
                    if (entries.length > 0) {
                      const html = `
                        <div style="min-width:140px">
                          <div style="font-weight:bold;margin-bottom:4px;font-size:12px">${layer.name}</div>
                          ${entries.map(([k, v]) =>
                            `<div style="font-size:11px;color:#666"><b>${k}:</b> ${v ?? "—"}</div>`
                          ).join("")}
                        </div>`;
                      leafLayer.bindPopup(html);
                    }
                  }
                  /* zoom on double-click */
                  leafLayer.on("dblclick", (e: any) => {
                    e.originalEvent?.stopPropagation?.();
                    const map = (leafLayer as any)._map;
                    if (!map) return;
                    try {
                      const bounds = (leafLayer as any).getBounds?.();
                      if (bounds) {
                        map.flyToBounds(bounds, { maxZoom: 16, duration: 1.2, padding: [40, 40] });
                      } else {
                        const latlng = e.latlng;
                        map.flyTo(latlng, Math.min(map.getZoom() + 3, 18), { duration: 1.0 });
                      }
                    } catch {
                      map.flyTo(e.latlng, Math.min(map.getZoom() + 3, 18), { duration: 1.0 });
                    }
                  });
                }}
              />
            ))
          }

          {/* Georeferenced image overlays */}
          {mapImages.filter(img => img.visible).map(img => (
            <ImageOverlay
              key={`${img.id}-${img.opacity}-${img.visible}`}
              url={`${BASE}/api/map-images/${img.id}/file`}
              bounds={[[img.southLat, img.westLon], [img.northLat, img.eastLon]]}
              opacity={img.opacity}
              zIndex={200}
            />
          ))}

          {/* Geological markers */}
          {points?.map((point) => (
            <Marker
              key={point.id}
              position={[point.latitude, point.longitude]}
              icon={createIcon(point.type)}
              eventHandlers={{
                click: () => setSelectedPoint(point),
                dblclick: (e) => {
                  e.originalEvent.stopPropagation();
                  (e.target as any)._map?.flyTo([point.latitude, point.longitude], 16, { duration: 1.2 });
                },
              }}
            >
              <Popup>
                <div className="min-w-[160px]">
                  <span
                    className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full text-white mb-1"
                    style={{ backgroundColor: typeColors[point.type] || "#f59e0b" }}
                  >
                    {typeLabels[point.type] || point.type}
                  </span>
                  <p className="font-semibold text-sm mb-0.5">{point.name}</p>
                  {point.formation && <p className="text-xs text-gray-600">Formațiune: {point.formation}</p>}
                  {point.age && <p className="text-xs text-gray-600">Vârstă: {point.age}</p>}
                  <p className="text-xs text-gray-400 mt-1">{point.latitude.toFixed(4)}°, {point.longitude.toFixed(4)}°</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Grid overlay */}
          <MapGridOverlay crs={gridCrs} enabled={gridEnabled} color="#38bdf8" opacity={0.55} />

          {/* Measure tools core (inside MapContainer to access map events) */}
          <MapMeasureInMap mode={measureMode} setMode={setMeasureMode} clearTick={measureClearTick} />

          {/* North arrow + scale bar - rendered as Leaflet control (inside MapContainer context) */}
          <MapOverlayControl />
        </MapContainer>

        {/* Location Search Bar overlay */}
        <div
          ref={searchRef}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-[min(380px,calc(100vw-24px))]"
        >
          <div className={cn(
            "bg-card/95 backdrop-blur-md border shadow-xl shadow-black/20 transition-all duration-200",
            searchOpen && searchResults.length > 0
              ? "rounded-t-2xl rounded-b-none border-b-0"
              : "rounded-2xl"
          )} style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 px-3 py-2.5">
              {isSearching
                ? <Loader2 className="w-4 h-4 text-muted-foreground flex-shrink-0 animate-spin" />
                : <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              }
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                placeholder="Caută locație... (oraș, județ, coordonate)"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Results dropdown */}
          <AnimatePresence>
            {searchOpen && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="bg-card/95 backdrop-blur-md border border-t-0 rounded-b-2xl shadow-xl shadow-black/20 overflow-hidden"
                style={{ borderColor: "var(--border)" }}
              >
                {searchResults.map((result, i) => (
                  <button
                    key={result.place_id}
                    onMouseDown={() => handleSelectResult(result)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-secondary/60 transition-colors",
                      i < searchResults.length - 1 && "border-b border-border/40"
                    )}
                  >
                    <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate leading-tight">
                        {result.display_name.split(",").slice(0, 3).join(", ")}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                        {result.type} · {result.class}
                      </p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* No results state */}
          <AnimatePresence>
            {searchOpen && !isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="bg-card/95 backdrop-blur-md border border-t-0 rounded-b-2xl shadow-xl shadow-black/20 px-4 py-3 text-sm text-muted-foreground text-center"
                style={{ borderColor: "var(--border)" }}
              >
                Niciun rezultat pentru „{searchQuery}"
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Admin panels — visible only for admin */}
        {user?.role === "admin" && (
          <>
            <MapLayerUpload
              layers={uploadedLayers}
              onLayersChange={fetchLayers}
              onLayerToggle={handleLayerToggle}
            />
            <MapImageUpload
              images={mapImages}
              onImagesChange={fetchImages}
              onImageToggle={handleImageToggle}
              onImageOpacity={handleImageOpacity}
            />
            <AdminMapPointPanel onRefresh={() => { if (typeof refetchPoints === "function") refetchPoints(); }} />
          </>
        )}

        {/* Measure toolbar overlay */}
        <div className="absolute bottom-14 right-3 z-[1000]">
          <MapMeasureToolbar
            mode={measureMode}
            setMode={setMeasureMode}
            onClearAll={handleMeasureClearAll}
          />
        </div>

        {/* Legend overlay — bottom-left, collapsible, shows only active items */}
        {(() => {
          const visibleGeoLayers = uploadedLayers.filter(l => l.visible);
          const visibleImages = mapImages.filter(img => img.visible);
          const hasContent = activeMarkerTypes.length > 0 || visibleGeoLayers.length > 0 || visibleImages.length > 0;
          if (!hasContent && legendCollapsed) return null;
          return (
            <div className="absolute z-[999] bottom-3 left-3 max-w-[180px]">
              {/* Header */}
              <button
                onClick={() => setLegendCollapsed(c => !c)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-card/95 backdrop-blur-sm border border-border shadow-xl text-xs font-semibold text-foreground hover:border-primary/30 transition-all"
              >
                <span>Legendă {hasContent ? `(${activeMarkerTypes.length + visibleGeoLayers.length + visibleImages.length})` : ""}</span>
                {legendCollapsed
                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>

              {/* Content */}
              {!legendCollapsed && (
                <div className="mt-1 bg-card/95 backdrop-blur-sm border border-border rounded-xl p-2.5 shadow-xl space-y-1.5">
                  {!hasContent && (
                    <p className="text-[10px] text-muted-foreground italic">Niciun strat activ</p>
                  )}

                  {/* Active geological marker types */}
                  {activeMarkerTypes.map(type => (
                    <div key={type} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 border border-white/20" style={{ backgroundColor: typeColors[type] }} />
                      <span>{typeLabels[type] || type}</span>
                    </div>
                  ))}

                  {/* Visible GeoJSON layers */}
                  {visibleGeoLayers.length > 0 && (activeMarkerTypes.length > 0) && (
                    <div className="border-t border-border/40 my-1" />
                  )}
                  {visibleGeoLayers.map(l => (
                    <div key={l.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0 border border-white/20" style={{ backgroundColor: l.color }} />
                      <span className="truncate">{l.name}</span>
                    </div>
                  ))}

                  {/* Visible georeferenced images */}
                  {visibleImages.length > 0 && (activeMarkerTypes.length + visibleGeoLayers.length > 0) && (
                    <div className="border-t border-border/40 my-1" />
                  )}
                  {visibleImages.map(img => (
                    <div key={img.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ImageIcon className="w-3 h-3 flex-shrink-0 text-violet-400" />
                      <span className="truncate">{img.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Selected Point Detail Panel */}
        <AnimatePresence>
          {selectedPoint && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute top-3 right-3 w-72 z-[1000] bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl shadow-black/30 overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full text-white capitalize"
                    style={{ backgroundColor: typeColors[selectedPoint.type] || "#f59e0b" }}
                  >
                    {typeLabels[selectedPoint.type] || selectedPoint.type}
                  </span>
                  <button
                    onClick={() => setSelectedPoint(null)}
                    className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-serif text-lg font-bold text-foreground mb-2 leading-tight">
                  {selectedPoint.name}
                </h3>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                  <MapPin className="w-3 h-3" />
                  <span>{selectedPoint.latitude.toFixed(4)}°N, {selectedPoint.longitude.toFixed(4)}°E</span>
                </div>

                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {selectedPoint.description || "Punct de date geologice înregistrat la această locație."}
                </p>

                <div className="space-y-2 mb-5 p-3 bg-secondary/50 rounded-xl">
                  {selectedPoint.age && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Vârstă geologică</span>
                      <span className="font-medium text-foreground">{selectedPoint.age}</span>
                    </div>
                  )}
                  {selectedPoint.formation && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Formațiune</span>
                      <span className="font-medium text-foreground">{selectedPoint.formation}</span>
                    </div>
                  )}
                  {selectedPoint.region && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Regiune</span>
                      <span className="font-medium text-foreground">{selectedPoint.region}</span>
                    </div>
                  )}
                </div>

                {selectedPoint.resourceId ? (
                  <Link
                    href={`/resources/${selectedPoint.resourceId}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
                  >
                    <Layers className="w-4 h-4" />
                    Resursă asociată
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary/50 text-muted-foreground text-sm">
                    <Info className="w-4 h-4" />
                    Nicio resursă asociată
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
