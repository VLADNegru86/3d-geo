import { useState, useEffect, Suspense, useRef, useCallback, useMemo } from "react";
import { Canvas, useLoader, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Html, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import * as THREE from "three";
import {
  Eye, EyeOff, Upload, Trash2, ChevronDown, ChevronRight,
  Loader2, X, Layers, Info, Crosshair, Scissors, Drill,
  RefreshCw, Box, RotateCcw, ZoomIn, Grid3X3, Palette, Camera,
  Maximize2, ArrowUpToLine, Columns2, PencilLine, Check,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ─── Types ─── */
interface GeoModel {
  id: number;
  name: string;
  zone: string;
  description: string | null;
  fileSize: number;
  uploadedAt: string;
}

type ColorMode = "layer" | "elevation" | "wireframe";
type ActiveTool = "navigate" | "pick" | "section" | "draw-section" | "borehole";

interface PickInfo {
  x: number; y: number; z: number;
  layerName: string;
  screenX: number; screenY: number;
}

interface BoreholeInfo {
  x: number; z: number;
  layers: { name: string; color: string; depth: number }[];
}

/* ─── Geological colour palette (chronostratigraphic) ─── */
const GEO_COLORS = [
  "#4a9fd4", "#6cbf8a", "#d4a94a", "#d46a4a", "#9b6cd4",
  "#d4c44a", "#4ad4c4", "#d44a9b", "#7a9bd4", "#a8d44a",
  "#d47a4a", "#4ad47a", "#c44ad4", "#d4d44a", "#4a6cd4",
];

/* ─── Elevation colour gradient: blue → cyan → green → yellow → red ─── */
function elevationColor(t: number): THREE.Color {
  const stops = [
    { t: 0.0, r: 0.0,  g: 0.0,  b: 0.7 },
    { t: 0.25, r: 0.0, g: 0.6,  b: 0.9 },
    { t: 0.5,  r: 0.0, g: 0.8,  b: 0.2 },
    { t: 0.75, r: 1.0, g: 0.9,  b: 0.0 },
    { t: 1.0,  r: 0.9, g: 0.1,  b: 0.1 },
  ];
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) { lo = stops[i]; hi = stops[i + 1]; break; }
  }
  const tt = (t - lo.t) / (hi.t - lo.t);
  return new THREE.Color(
    lo.r + (hi.r - lo.r) * tt,
    lo.g + (hi.g - lo.g) * tt,
    lo.b + (hi.b - lo.b) * tt,
  );
}

/* ─── Apply elevation colours to geometry ─── */
function applyElevationColors(obj: THREE.Object3D) {
  let yMin = Infinity, yMax = -Infinity;
  obj.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const pos = child.geometry.attributes.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
  });
  if (!isFinite(yMin)) yMin = 0;
  if (!isFinite(yMax)) yMax = 1;
  const range = yMax - yMin || 1;
  obj.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const geo = child.geometry;
    const pos = geo.attributes.position;
    if (!pos) return;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getY(i) - yMin) / range;
      const c = elevationColor(t);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  });
}

/* ─── Single OBJ layer in the scene ─── */
function OBJLayer({
  url, colorMode, layerColor, clippingPlanes, visible, onPick, pickMode,
}: {
  url: string;
  colorMode: ColorMode;
  layerColor: string;
  clippingPlanes: THREE.Plane[];
  visible: boolean;
  onPick: (info: { point: THREE.Vector3; normal: THREE.Vector3; name: string }) => void;
  pickMode: boolean;
}) {
  const obj = useLoader(OBJLoader, url);
  const cloneRef = useRef<THREE.Object3D | null>(null);

  const clone = useMemo(() => {
    const c = obj.clone(true);
    // Center the model
    const box = new THREE.Box3().setFromObject(c);
    const center = box.getCenter(new THREE.Vector3());
    c.position.sub(center);
    return c;
  }, [obj]);

  useEffect(() => {
    cloneRef.current = clone;
    if (colorMode === "elevation") applyElevationColors(clone);
    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const useVertexColors = colorMode === "elevation" && child.geometry.attributes.color;
      child.material = new THREE.MeshStandardMaterial({
        color: colorMode === "layer" ? layerColor : "#ffffff",
        wireframe: colorMode === "wireframe",
        vertexColors: !!useVertexColors,
        roughness: 0.55,
        metalness: 0.15,
        clippingPlanes,
        clipShadows: true,
        side: THREE.DoubleSide,
      });
      child.castShadow = true;
      child.receiveShadow = true;
    });
  }, [clone, colorMode, layerColor, clippingPlanes]);

  if (!visible) return null;

  return (
    <primitive
      object={clone}
      onClick={(e: any) => {
        if (!pickMode) return;
        e.stopPropagation();
        onPick({ point: e.point, normal: e.face?.normal ?? new THREE.Vector3(0, 1, 0), name: (e.object as THREE.Mesh).parent?.name || "Model" });
      }}
    />
  );
}

/* ─── Clipping plane visual indicator ─── */
function ClipPlaneHelper({ plane, size = 12 }: { plane: THREE.Plane; size?: number }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size);
    return g;
  }, [size]);
  const q = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal);
    return q;
  }, [plane.normal]);
  const pos = useMemo(() => {
    return new THREE.Vector3().copy(plane.normal).multiplyScalar(-plane.constant);
  }, [plane]);

  return (
    <mesh position={pos} quaternion={q} renderOrder={1}>
      <primitive object={geo} />
      <meshBasicMaterial color="#22d3ee" opacity={0.15} transparent side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/* ─── Virtual borehole cylinder ─── */
function Borehole({ x, z, depth = 8 }: { x: number; z: number; depth?: number }) {
  return (
    <group position={[x, depth / 2 - depth, z]}>
      <mesh>
        <cylinderGeometry args={[0.08, 0.08, depth, 16]} />
        <meshStandardMaterial color="#f59e0b" opacity={0.85} transparent />
      </mesh>
      <mesh position={[0, depth / 2 + 0.15, 0]}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
    </group>
  );
}

/* ─── Ground plane — handles borehole & draw-section clicks ─── */
function GroundPlane({
  onBoreholeClick, boreholeActive,
  onDrawClick, drawActive,
}: {
  onBoreholeClick: (x: number, z: number) => void;
  boreholeActive: boolean;
  onDrawClick: (x: number, z: number) => void;
  drawActive: boolean;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} visible={false}
      onClick={(e: any) => {
        if (boreholeActive) { e.stopPropagation(); onBoreholeClick(e.point.x, e.point.z); }
        else if (drawActive) { e.stopPropagation(); onDrawClick(e.point.x, e.point.z); }
      }}
    >
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial />
    </mesh>
  );
}

/* ─── Section line visualization (draw-section tool) ─── */
function SectionLine({ points }: { points: { x: number; z: number }[] }) {
  const lineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    if (points.length >= 2) {
      const verts = new Float32Array([
        points[0].x, -2.9, points[0].z,
        points[1].x, -2.9, points[1].z,
      ]);
      geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    }
    return geo;
  }, [points]);

  if (points.length === 0) return null;
  return (
    <>
      {points.map((p, i) => (
        <mesh key={i} position={[p.x, -2.9, p.z]}>
          <sphereGeometry args={[0.28, 12, 12]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      ))}
      {points.length >= 2 && (
        <lineSegments geometry={lineGeo}>
          <lineBasicMaterial color="#f59e0b" />
        </lineSegments>
      )}
    </>
  );
}

/* ─── Camera Controller: zoom-extend, top-view, ortho/perspective ─── */
function CameraController({
  commandRef, isOrtho, orbitRef,
}: {
  commandRef: React.MutableRefObject<string | null>;
  isOrtho: boolean;
  orbitRef: React.RefObject<any>;
}) {
  const { camera, set, scene, size } = useThree();
  const perspCamRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoCamRef = useRef<THREE.OrthographicCamera | null>(null);

  /* Capture original perspective camera once on mount */
  useEffect(() => {
    if (!perspCamRef.current && camera instanceof THREE.PerspectiveCamera) {
      perspCamRef.current = camera;
    }
  }, [camera]);

  /* Switch between ortho and perspective */
  useEffect(() => {
    if (isOrtho) {
      if (!orthoCamRef.current) {
        const aspect = size.width / size.height;
        const frustumSize = 20;
        const ortho = new THREE.OrthographicCamera(
          -frustumSize * aspect / 2, frustumSize * aspect / 2,
          frustumSize / 2, -frustumSize / 2,
          0.01, 2000,
        );
        ortho.position.copy(camera.position);
        ortho.quaternion.copy(camera.quaternion);
        ortho.zoom = 1;
        ortho.updateProjectionMatrix();
        orthoCamRef.current = ortho;
      }
      set({ camera: orthoCamRef.current as any });
      if (orbitRef.current) { orbitRef.current.object = orthoCamRef.current; orbitRef.current.update(); }
    } else {
      if (perspCamRef.current) {
        if (orthoCamRef.current) perspCamRef.current.position.copy(orthoCamRef.current.position);
        set({ camera: perspCamRef.current as any });
        if (orbitRef.current) { orbitRef.current.object = perspCamRef.current; orbitRef.current.update(); }
      }
    }
  }, [isOrtho]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    if (!commandRef) return;
    const cmd = commandRef.current;
    if (!cmd) return;
    commandRef.current = null;

    const cam = camera;
    const box = new THREE.Box3();
    scene.traverse((obj) => { if (obj instanceof THREE.Mesh) box.expandByObject(obj); });

    if (cmd === "zoom-extend") {
      if (!box.isEmpty()) {
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        const { center, radius } = sphere;
        if (cam instanceof THREE.PerspectiveCamera) {
          const fovRad = (cam.fov * Math.PI) / 180;
          const dist = (radius / Math.sin(fovRad / 2)) * 1.15;
          const dir = cam.position.clone().sub(center).normalize();
          if (dir.length() < 0.001) dir.set(1, 0.6, 1).normalize();
          cam.position.copy(center).addScaledVector(dir, dist);
        } else if (cam instanceof THREE.OrthographicCamera) {
          const aspect = size.width / size.height;
          cam.left = -radius * aspect * 1.3; cam.right = radius * aspect * 1.3;
          cam.top = radius * 1.3; cam.bottom = -radius * 1.3;
          cam.updateProjectionMatrix();
        }
        if (orbitRef.current) { orbitRef.current.target.copy(center); orbitRef.current.update(); }
        cam.lookAt(center);
      }
    }

    if (cmd === "top-view") {
      const center = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
      const radius = box.isEmpty() ? 10 : box.getBoundingSphere(new THREE.Sphere()).radius;
      cam.position.set(center.x, center.y + radius * 2.8, center.z);
      cam.up.set(0, 0, -1);
      cam.lookAt(center);
      if (orbitRef.current) { orbitRef.current.target.copy(center); orbitRef.current.update(); }
      if (cam instanceof THREE.PerspectiveCamera || cam instanceof THREE.OrthographicCamera) {
        cam.updateProjectionMatrix();
      }
    }
  });

  return null;
}

/* ─── Scene: orchestrates all layers + tools ─── */
function Geo3DScene({
  layers, colorMode, visibleIds, clippingPlane, showClipHelper,
  pickMode, boreholeMode, onPick, onBoreholeClick,
  drawSectionMode, drawSectionPoints, onDrawSectionClick,
  showGrid, orbitRef, commandRef, isOrtho,
}: {
  layers: { model: GeoModel; color: string }[];
  colorMode: ColorMode;
  visibleIds: Set<number>;
  clippingPlane: THREE.Plane | null;
  showClipHelper: boolean;
  pickMode: boolean;
  boreholeMode: boolean;
  onPick: (info: { point: THREE.Vector3; name: string; screenPos: { x: number; y: number } }) => void;
  onBoreholeClick: (x: number, z: number) => void;
  drawSectionMode: boolean;
  drawSectionPoints: { x: number; z: number }[];
  onDrawSectionClick: (x: number, z: number) => void;
  showGrid: boolean;
  orbitRef: React.RefObject<any>;
  commandRef: React.MutableRefObject<string | null>;
  isOrtho: boolean;
}) {
  const { gl, camera, size } = useThree();

  useEffect(() => {
    gl.clippingPlanes = clippingPlane ? [clippingPlane] : [];
    gl.localClippingEnabled = !!clippingPlane;
  }, [clippingPlane, gl]);

  const handlePick = useCallback((info: { point: THREE.Vector3; name: string }) => {
    const projected = info.point.clone().project(camera);
    const sx = (projected.x * 0.5 + 0.5) * size.width;
    const sy = (1 - (projected.y * 0.5 + 0.5)) * size.height;
    onPick({ ...info, screenPos: { x: sx, y: sy } });
  }, [camera, size, onPick]);

  return (
    <>
      <color attach="background" args={["#0b0d1a"]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[15, 15, 8]} intensity={1.3} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-8, 8, -8]} intensity={0.4} />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#4a9fd4" />

      {showGrid && (
        <Grid
          args={[40, 40]}
          cellSize={1} cellThickness={0.4} cellColor="#1a1e3a"
          sectionSize={5} sectionThickness={0.8} sectionColor="#252a50"
          fadeDistance={50}
          position={[0, -3.1, 0]}
        />
      )}

      <GroundPlane
        boreholeActive={boreholeMode}
        onBoreholeClick={onBoreholeClick}
        drawActive={drawSectionMode}
        onDrawClick={onDrawSectionClick}
      />
      <SectionLine points={drawSectionPoints} />

      {layers.map(({ model, color }) => (
        <Suspense key={model.id} fallback={null}>
          <OBJLayer
            url={`${BASE}/api/geo-models/${model.id}/file`}
            colorMode={colorMode}
            layerColor={color}
            clippingPlanes={clippingPlane ? [clippingPlane] : []}
            visible={visibleIds.has(model.id)}
            onPick={handlePick}
            pickMode={pickMode}
          />
        </Suspense>
      ))}

      {clippingPlane && showClipHelper && <ClipPlaneHelper plane={clippingPlane} />}

      <OrbitControls
        ref={orbitRef}
        enabled={!pickMode && !boreholeMode && !drawSectionMode}
        makeDefault
        enablePan
        enableZoom
        enableRotate
        minDistance={0.5}
        maxDistance={200}
      />

      <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
        <GizmoViewport axisColors={["#f43f5e", "#4ade80", "#60a5fa"]} labelColor="white" />
      </GizmoHelper>

      <CameraController commandRef={commandRef} isOrtho={isOrtho} orbitRef={orbitRef} />
    </>
  );
}

/* ─── Loading spinner inside Canvas ─── */
function CanvasLoader() {
  return (
    <Html center>
      <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
        <Loader2 className="w-4 h-4 text-primary animate-spin" />
        <span className="text-xs text-white/70">Se încarcă modelul...</span>
      </div>
    </Html>
  );
}

/* ─── Elevation legend ─── */
function ElevationLegend() {
  const stops = ["#1a1ab3", "#00aadd", "#00bb33", "#ffdd00", "#dd1a1a"];
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-white/40">Înalt</span>
      <div className="w-3 h-24 rounded-full overflow-hidden" style={{
        background: `linear-gradient(to bottom, ${stops.slice().reverse().join(", ")})`,
      }} />
      <span className="text-[10px] text-white/40">Jos</span>
    </div>
  );
}

/* ─── Admin upload panel — supports multiple OBJ files ─── */
function AdminUploadPanel({ onUploaded }: { onUploaded: () => void }) {
  const [open, setOpen] = useState(false);
  const [zone, setZone] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const [error, setError] = useState("");

  const uploadOne = async (file: File, token: string | null) => {
    const form = new FormData();
    form.append("file", file);
    form.append("name", file.name.replace(/\.obj$/i, "").replace(/[-_]/g, " "));
    form.append("zone", zone);
    form.append("description", description);
    const r = await fetch(`${BASE}/api/admin/geo-models/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
      credentials: "include",
    });
    if (!r.ok) { const d = await r.json(); throw new Error(d.error || "Upload eșuat"); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length || !zone) { setError("Selectează cel puțin un fișier și zona geologică"); return; }
    setUploading(true); setError("");
    const token = localStorage.getItem("geo3d_token");
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress({ done: i, total: files.length, current: files[i].name });
        await uploadOne(files[i], token);
      }
      setZone(""); setDescription(""); setFiles([]); setOpen(false); setProgress(null);
      onUploaded();
    } catch (ex: any) { setError(ex.message); setProgress(null); }
    setUploading(false);
  };

  return (
    <div className="border-t border-white/10 pt-3 mt-2">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full px-3 py-2 bg-primary/20 rounded-lg text-primary text-xs font-medium hover:bg-primary/30 transition-colors">
        <Upload className="w-3.5 h-3.5" />
        {open ? "Ascunde" : "Încarcă modele OBJ"}
      </button>
      {open && (
        <form onSubmit={submit} className="mt-2 space-y-2">
          {error && <p className="text-[10px] text-red-400 bg-red-400/10 rounded px-2 py-1">{error}</p>}
          <input value={zone} onChange={e => setZone(e.target.value)} placeholder="Zona geologică *" className="w-full bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/40 outline-none focus:border-primary/60" />
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descriere (opțional)" className="w-full bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/40 outline-none focus:border-primary/60" />
          <label className="block w-full cursor-pointer">
            <div className="border border-dashed border-white/30 rounded-lg px-2 py-2 hover:border-primary/50 transition-colors">
              {files.length === 0 ? (
                <p className="text-[10px] text-white/50 text-center">Selectează unul sau mai multe fișiere .obj</p>
              ) : (
                <div className="space-y-0.5 max-h-20 overflow-y-auto">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Check className="w-2.5 h-2.5 text-primary flex-shrink-0" />
                      <span className="text-[10px] text-white/70 truncate">{f.name}</span>
                      <span className="text-[10px] text-white/30 flex-shrink-0">({(f.size / 1024).toFixed(0)}KB)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input
              type="file"
              accept=".obj"
              multiple
              onChange={e => setFiles(Array.from(e.target.files || []))}
              className="sr-only"
            />
          </label>
          {progress && (
            <div className="bg-white/5 rounded-lg px-2 py-1.5">
              <div className="flex justify-between text-[10px] text-white/50 mb-1">
                <span className="truncate max-w-[130px]">{progress.current}</span>
                <span>{progress.done + 1}/{progress.total}</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1">
                <div className="bg-primary h-1 rounded-full transition-all" style={{ width: `${((progress.done + 1) / progress.total) * 100}%` }} />
              </div>
            </div>
          )}
          <button type="submit" disabled={uploading} className="w-full py-1.5 bg-primary rounded-lg text-xs font-medium text-white hover:bg-primary/80 disabled:opacity-50 flex items-center justify-center gap-2">
            {uploading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Se încarcă...</>
              : <><Upload className="w-3.5 h-3.5" />Încarcă {files.length > 1 ? `${files.length} modele` : "model"}</>
            }
          </button>
        </form>
      )}
    </div>
  );
}

/* ─── CLIP AXIS options ─── */
type ClipAxis = "X" | "Y" | "Z";

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function Viewer3DPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const orbitRef = useRef<any>(null);
  const cameraCommandRef = useRef<string | null>(null);
  const glRef = useRef<{ domElement: HTMLCanvasElement } | null>(null);
  const [isOrtho, setIsOrtho] = useState(false);

  const handleScreenshot3D = useCallback(() => {
    if (!glRef.current) return;
    const link = document.createElement("a");
    link.download = `geo3d-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = glRef.current.domElement.toDataURL("image/png");
    link.click();
  }, []);

  /* models */
  const [models, setModels] = useState<GeoModel[]>([]);
  const [grouped, setGrouped] = useState<Record<string, GeoModel[]>>({});
  const [loadingModels, setLoadingModels] = useState(true);
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
  const [visibleIds, setVisibleIds] = useState<Set<number>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  /* colour */
  const [colorMode, setColorMode] = useState<ColorMode>("layer");
  const [layerColors, setLayerColors] = useState<Record<number, string>>({});
  /* when models load, assign colours only to NEW models (preserve user choices) */
  useEffect(() => {
    setLayerColors(prev => {
      const next = { ...prev };
      models.forEach((m, i) => { if (!next[m.id]) next[m.id] = GEO_COLORS[i % GEO_COLORS.length]; });
      return next;
    });
  }, [models]);
  const updateLayerColor = (id: number, color: string) =>
    setLayerColors(prev => ({ ...prev, [id]: color }));

  /* tool */
  const [activeTool, setActiveTool] = useState<ActiveTool>("navigate");

  /* pick */
  const [pickInfo, setPickInfo] = useState<PickInfo | null>(null);

  /* section (slider) */
  const [sectionActive, setSectionActive] = useState(false);
  const [clipAxis, setClipAxis] = useState<ClipAxis>("Y");
  const [clipValue, setClipValue] = useState(0);

  /* draw-section (line draw) */
  const [sectionLinePoints, setSectionLinePoints] = useState<{ x: number; z: number }[]>([]);

  const clippingPlane = useMemo<THREE.Plane | null>(() => {
    /* slider section */
    if (activeTool === "section" && sectionActive) {
      const n = clipAxis === "X" ? new THREE.Vector3(1, 0, 0)
        : clipAxis === "Y" ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 0, 1);
      return new THREE.Plane(n, -clipValue);
    }
    /* draw-section — needs 2 points to define the vertical plane */
    if (activeTool === "draw-section" && sectionLinePoints.length >= 2) {
      const p1 = new THREE.Vector3(sectionLinePoints[0].x, 0, sectionLinePoints[0].z);
      const p2 = new THREE.Vector3(sectionLinePoints[1].x, 0, sectionLinePoints[1].z);
      const dir = p2.clone().sub(p1);
      /* normal is horizontal and perpendicular to the drawn line */
      const normal = new THREE.Vector3(dir.z, 0, -dir.x).normalize();
      return new THREE.Plane(normal, -normal.dot(p1));
    }
    return null;
  }, [activeTool, sectionActive, clipAxis, clipValue, sectionLinePoints]);

  /* borehole */
  const [boreholes, setBoreholes] = useState<{ x: number; z: number }[]>([]);

  /* misc */
  const [showGrid, setShowGrid] = useState(true);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);

  /* ─── Fetch models ─── */
  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const r = await fetch(`${BASE}/api/geo-models`);
      const d = await r.json();
      const ms: GeoModel[] = d.models || [];
      setModels(ms);
      setGrouped(d.grouped || {});
      setVisibleIds(new Set(ms.map((m: GeoModel) => m.id)));
      if (d.zones?.length > 0) setExpandedZones(new Set([d.zones[0]]));
    } catch {}
    setLoadingModels(false);
  };

  useEffect(() => { fetchModels(); }, []);

  /* ─── Helpers ─── */
  const toggleVisible = (id: number) => {
    setVisibleIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleZone = (z: string) => {
    setExpandedZones(prev => {
      const next = new Set(prev);
      next.has(z) ? next.delete(z) : next.add(z);
      return next;
    });
  };

  const deleteModel = async (id: number) => {
    const token = localStorage.getItem("geo3d_token");
    await fetch(`${BASE}/api/admin/geo-models/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
    setDeleteConfirm(null);
    fetchModels();
  };

  const handlePickResult = useCallback((info: { point: THREE.Vector3; name: string; screenPos: { x: number; y: number } }) => {
    setPickInfo({
      x: +info.point.x.toFixed(2), y: +info.point.y.toFixed(2), z: +info.point.z.toFixed(2),
      layerName: info.name,
      screenX: info.screenPos.x, screenY: info.screenPos.y,
    });
  }, []);

  const handleBoreholeClick = useCallback((x: number, z: number) => {
    setBoreholes(prev => [...prev, { x, z }]);
  }, []);

  const handleDrawSectionClick = useCallback((x: number, z: number) => {
    setSectionLinePoints(prev => {
      if (prev.length >= 2) return [{ x, z }]; /* reset and start new line */
      return [...prev, { x, z }];
    });
  }, []);

  const layers = useMemo(() => models.map(m => ({ model: m, color: layerColors[m.id] ?? "#6366f1" })), [models, layerColors]);
  const zones = Object.keys(grouped);

  const TOOLS: { id: ActiveTool; icon: React.ReactNode; label: string }[] = [
    { id: "navigate", icon: <RotateCcw className="w-4 h-4" />, label: "Navigare" },
    { id: "pick", icon: <Crosshair className="w-4 h-4" />, label: "Atribute" },
    { id: "section", icon: <Scissors className="w-4 h-4" />, label: "Secțiune" },
    { id: "draw-section", icon: <PencilLine className="w-4 h-4" />, label: "Sec. linie" },
    { id: "borehole", icon: <Drill className="w-4 h-4" />, label: "Foraj" },
  ];

  const handleToolSwitch = (tool: ActiveTool) => {
    setActiveTool(tool);
    if (tool === "section") setSectionActive(true);
    if (tool !== "section") setSectionActive(false);
    if (tool !== "pick") setPickInfo(null);
    if (tool !== "draw-section") setSectionLinePoints([]);
  };

  return (
    <div className="flex flex-col bg-[#0b0d1a] overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>

      {/* ══ TOP TOOLBAR ══ */}
      <div className="flex items-center gap-1 px-3 py-2 bg-[#111328] border-b border-white/10 flex-shrink-0">
        <button onClick={() => setLeftOpen(!leftOpen)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors" title="Panou straturi">
          <Layers className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-white/10 mx-1" />

        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => handleToolSwitch(t.id)}
            title={t.label}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              activeTool === t.id
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-white/50 hover:bg-white/10 hover:text-white",
            )}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Color mode */}
        <div className="flex items-center gap-1">
          {(["layer", "elevation", "wireframe"] as ColorMode[]).map(m => (
            <button
              key={m}
              onClick={() => setColorMode(m)}
              title={m === "layer" ? "Culori straturi" : m === "elevation" ? "Gradient elevație" : "Wireframe"}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs transition-all",
                colorMode === m ? "bg-primary/20 text-primary border border-primary/30" : "text-white/40 hover:bg-white/10 hover:text-white",
              )}
            >
              {m === "layer" ? <><Palette className="w-3.5 h-3.5 inline mr-1" />Straturi</> : m === "elevation" ? "Elevație" : "Wireframe"}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-white/10 mx-1" />
        <button onClick={() => setShowGrid(!showGrid)} title="Grilă" className={cn("p-1.5 rounded-lg text-xs transition-all", showGrid ? "text-primary" : "text-white/40 hover:text-white hover:bg-white/10")}>
          <Grid3X3 className="w-4 h-4" />
        </button>
        <button onClick={() => setBoreholes([])} title="Șterge foraje" className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors ml-0.5">
          <RefreshCw className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* ── Camera view buttons ── */}
        <button
          onClick={() => { cameraCommandRef.current = "zoom-extend"; }}
          title="Zoom Extindere — încadrează tot modelul în vedere"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white/50 hover:bg-white/10 hover:text-white transition-all"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Extindere</span>
        </button>

        <button
          onClick={() => { cameraCommandRef.current = "top-view"; }}
          title="Vedere de sus (plan)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white/50 hover:bg-white/10 hover:text-white transition-all"
        >
          <ArrowUpToLine className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Sus</span>
        </button>

        <button
          onClick={() => setIsOrtho(v => !v)}
          title={isOrtho ? "Comută la perspectivă" : "Comută la ortografic"}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all",
            isOrtho
              ? "bg-primary/20 text-primary border border-primary/30"
              : "text-white/50 hover:bg-white/10 hover:text-white",
          )}
        >
          <Columns2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{isOrtho ? "Ortografic" : "Perspectivă"}</span>
        </button>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Screenshot 3D */}
        <button
          onClick={handleScreenshot3D}
          title="Salvează imaginea 3D ca PNG"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white/50 hover:bg-white/10 hover:text-white transition-all"
        >
          <Camera className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Screenshot</span>
        </button>

        <div className="flex-1" />
        <button onClick={() => setShowInfoPanel(!showInfoPanel)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all", showInfoPanel ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/10 hover:text-white")}>
          <Info className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Info model</span>
        </button>
      </div>

      {/* ══ MAIN BODY ══ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL: Layers ── */}
        {leftOpen && (
          <div className="w-64 flex-shrink-0 border-r border-white/10 bg-[#0e1020] flex flex-col overflow-hidden">
            <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Straturi geologice
              </h3>
              <span className="text-[10px] text-white/30 bg-white/5 rounded-full px-2">{models.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto py-1.5 px-2 space-y-0.5">
              {loadingModels ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
              ) : zones.length === 0 ? (
                <div className="text-center py-8">
                  <Box className="w-8 h-8 text-white/15 mx-auto mb-2" />
                  <p className="text-xs text-white/30">Niciun model disponibil</p>
                  {isAdmin && <p className="text-[10px] text-white/20 mt-1">Încarcă un model OBJ</p>}
                </div>
              ) : (
                zones.map(zone => (
                  <div key={zone}>
                    <button onClick={() => toggleZone(zone)} className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                      <span className="text-xs font-medium text-white/60 hover:text-white">{zone}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-white/25 bg-white/5 rounded-full px-1.5">{grouped[zone].length}</span>
                        {expandedZones.has(zone) ? <ChevronDown className="w-3 h-3 text-white/30" /> : <ChevronRight className="w-3 h-3 text-white/30" />}
                      </div>
                    </button>

                    {expandedZones.has(zone) && (
                      <div className="ml-2 mt-0.5 space-y-0.5">
                        {grouped[zone].map(m => {
                          const isVis = visibleIds.has(m.id);
                          const col = layerColors[m.id] ?? "#6366f1";
                          return (
                            <div key={m.id} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 group hover:bg-white/5 transition-colors">
                              {/* Colour swatch with picker */}
                              <div className="relative w-3.5 h-3.5 flex-shrink-0 cursor-pointer" title="Schimbă culoarea">
                                <div className="absolute inset-0 rounded-sm border border-white/20 hover:border-white/50 transition-colors" style={{ background: col }} />
                                <input
                                  type="color"
                                  value={col}
                                  onChange={e => updateLayerColor(m.id, e.target.value)}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                              </div>
                              {/* Name */}
                              <span className={cn("flex-1 text-xs truncate", isVis ? "text-white/80" : "text-white/30")}>{m.name}</span>
                              {/* Eye toggle */}
                              <button onClick={() => toggleVisible(m.id)} className="opacity-60 hover:opacity-100 transition-opacity">
                                {isVis ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5 text-white/30" />}
                              </button>
                              {/* Delete */}
                              {isAdmin && (
                                deleteConfirm === m.id ? (
                                  <div className="flex gap-1">
                                    <button onClick={() => deleteModel(m.id)} className="text-[10px] text-red-400 bg-red-400/10 rounded px-1 py-0.5 hover:bg-red-400/20">Da</button>
                                    <button onClick={() => setDeleteConfirm(null)} className="text-[10px] text-white/40 bg-white/10 rounded px-1 py-0.5">Nu</button>
                                  </div>
                                ) : (
                                  <button onClick={() => setDeleteConfirm(m.id)} className="opacity-0 group-hover:opacity-60 hover:!opacity-100">
                                    <Trash2 className="w-3 h-3 text-red-400" />
                                  </button>
                                )
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Legend */}
            <div className="px-3 py-2.5 border-t border-white/10">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Legendă</p>
              {colorMode === "elevation" ? (
                <div className="flex items-center gap-3">
                  <ElevationLegend />
                  <div className="text-[10px] text-white/40 leading-relaxed">
                    <div>Elevație</div>
                    <div>gradient</div>
                  </div>
                </div>
              ) : colorMode === "wireframe" ? (
                <p className="text-[10px] text-white/40">Mod wireframe activ</p>
              ) : (
                <div className="space-y-1">
                  {models.slice(0, 6).map(m => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: layerColors[m.id] }} />
                      <span className="text-[10px] text-white/50 truncate">{m.name}</span>
                    </div>
                  ))}
                  {models.length > 6 && <p className="text-[10px] text-white/30">+{models.length - 6} straturi...</p>}
                </div>
              )}
            </div>

            {isAdmin && <div className="px-3 pb-3"><AdminUploadPanel onUploaded={fetchModels} /></div>}
          </div>
        )}

        {/* ── CENTER: 3D Canvas ── */}
        <div className="flex-1 relative overflow-hidden">

          {/* Tool hint */}
          {activeTool !== "navigate" && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="bg-black/70 backdrop-blur-sm border border-primary/30 rounded-xl px-4 py-2">
                <p className="text-xs text-primary text-center">
                  {activeTool === "pick" && "Mod Atribute: Dă clic pe model pentru a afișa coordonatele și informațiile stratului"}
                  {activeTool === "section" && "Mod Secțiune: Folosește slider-ul din stânga-jos pentru a tăia modelul"}
                  {activeTool === "draw-section" && (sectionLinePoints.length === 0
                    ? "Sec. Linie: Dă clic pe scenă pentru primul punct al liniei de secțiune"
                    : sectionLinePoints.length === 1
                      ? "Sec. Linie: Dă clic pentru al doilea punct — secțiunea se va aplica automat"
                      : "Sec. Linie activă — dă clic din nou pentru a redesena linia")}
                  {activeTool === "borehole" && "Mod Foraj: Dă clic în scenă pentru a plasa un foraj virtual"}
                </p>
              </div>
            </div>
          )}

          {/* Click-pick popup */}
          {pickInfo && (
            <div
              className="absolute z-30 bg-[#0e1020]/95 backdrop-blur-sm border border-primary/40 rounded-xl p-3 shadow-xl max-w-[220px]"
              style={{ left: Math.min(pickInfo.screenX + 12, window.innerWidth - 240), top: Math.min(pickInfo.screenY - 10, window.innerHeight - 160) }}
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-semibold text-primary">Atribute punct</p>
                <button onClick={() => setPickInfo(null)} className="text-white/30 hover:text-white ml-2">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between gap-4">
                  <span className="text-white/40">X</span><span className="text-white font-mono">{pickInfo.x}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-white/40">Y</span><span className="text-white font-mono">{pickInfo.y}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-white/40">Z</span><span className="text-white font-mono">{pickInfo.z}</span>
                </div>
                <div className="border-t border-white/10 pt-1 mt-1">
                  <span className="text-white/40">Strat: </span><span className="text-primary">{pickInfo.layerName}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section controls (bottom-left when section tool active) */}
          {activeTool === "section" && (
            <div className="absolute bottom-12 left-4 z-20 bg-[#0e1020]/90 backdrop-blur-sm border border-white/10 rounded-xl p-3 min-w-[220px]">
              <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Scissors className="w-3 h-3 text-primary" />Secțiune transversală
              </p>
              <div className="flex gap-1 mb-3">
                {(["X", "Y", "Z"] as ClipAxis[]).map(a => (
                  <button key={a} onClick={() => setClipAxis(a)} className={cn("flex-1 py-1 text-xs rounded-lg transition-all", clipAxis === a ? "bg-primary/30 text-primary border border-primary/40" : "bg-white/5 text-white/40 hover:bg-white/10")}>
                    {a}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 w-12">-10</span>
                <input
                  type="range" min={-10} max={10} step={0.1}
                  value={clipValue}
                  onChange={e => setClipValue(+e.target.value)}
                  className="flex-1 accent-primary"
                />
                <span className="text-[10px] text-white/40 w-12 text-right">+10</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-white/30">Valoare: <span className="text-primary font-mono">{clipValue.toFixed(1)}</span></span>
                <button onClick={() => { setClipValue(0); setSectionActive(false); setActiveTool("navigate"); }} className="text-[10px] text-white/30 hover:text-white">Resetare</button>
              </div>
            </div>
          )}

          {/* Draw-section controls (bottom-left when draw-section active) */}
          {activeTool === "draw-section" && (
            <div className="absolute bottom-12 left-4 z-20 bg-[#0e1020]/90 backdrop-blur-sm border border-white/10 rounded-xl p-3 min-w-[200px]">
              <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <PencilLine className="w-3 h-3 text-primary" />Secțiune prin linie
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[10px] font-bold",
                    sectionLinePoints.length >= 1 ? "border-primary bg-primary/20 text-primary" : "border-white/20 text-white/30"
                  )}>1</div>
                  <span className="text-[10px] text-white/50">
                    {sectionLinePoints.length >= 1
                      ? <span className="text-primary font-mono">({sectionLinePoints[0].x.toFixed(1)}, {sectionLinePoints[0].z.toFixed(1)})</span>
                      : "Clic pentru primul punct"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[10px] font-bold",
                    sectionLinePoints.length >= 2 ? "border-primary bg-primary/20 text-primary" : "border-white/20 text-white/30"
                  )}>2</div>
                  <span className="text-[10px] text-white/50">
                    {sectionLinePoints.length >= 2
                      ? <span className="text-primary font-mono">({sectionLinePoints[1].x.toFixed(1)}, {sectionLinePoints[1].z.toFixed(1)})</span>
                      : "Clic pentru al doilea punct"}
                  </span>
                </div>
              </div>
              {sectionLinePoints.length >= 2 && (
                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-green-400">✓ Secțiune aplicată</span>
                  <button onClick={() => setSectionLinePoints([])} className="text-[10px] text-white/30 hover:text-white">Resetare</button>
                </div>
              )}
            </div>
          )}

          {/* Borehole count badge */}
          {boreholes.length > 0 && (
            <div className="absolute bottom-12 right-4 z-20 bg-amber-500/20 border border-amber-500/30 rounded-xl px-3 py-2">
              <p className="text-xs text-amber-400"><Drill className="w-3 h-3 inline mr-1" />{boreholes.length} foraj{boreholes.length > 1 ? "e" : ""} activ{boreholes.length > 1 ? "e" : ""}</p>
            </div>
          )}

          {/* Empty state */}
          {!loadingModels && models.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="text-center">
                <Box className="w-16 h-16 text-white/10 mx-auto mb-4" />
                <p className="text-white/30 text-sm">Niciun model 3D disponibil</p>
                {isAdmin && <p className="text-white/20 text-xs mt-1">Folosește panoul de upload pentru a adăuga modele OBJ</p>}
              </div>
            </div>
          )}

          {/* Instruction */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <p className="text-[10px] text-white/20 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/5">
              Drag — rotire · Scroll — zoom · Click dreapta — pan
            </p>
          </div>

          <Canvas
            camera={{ position: [8, 6, 10], fov: 55 }}
            shadows
            gl={{ antialias: true, localClippingEnabled: true, preserveDrawingBuffer: true }}
            dpr={Math.min(window.devicePixelRatio, 2)}
            onCreated={({ gl }) => { glRef.current = gl; }}
          >
            <Suspense fallback={<CanvasLoader />}>
              <Geo3DScene
                layers={layers}
                colorMode={colorMode}
                visibleIds={visibleIds}
                clippingPlane={clippingPlane}
                showClipHelper={activeTool === "section" || activeTool === "draw-section"}
                pickMode={activeTool === "pick"}
                boreholeMode={activeTool === "borehole"}
                onPick={handlePickResult}
                onBoreholeClick={handleBoreholeClick}
                drawSectionMode={activeTool === "draw-section"}
                drawSectionPoints={sectionLinePoints}
                onDrawSectionClick={handleDrawSectionClick}
                showGrid={showGrid}
                orbitRef={orbitRef}
                commandRef={cameraCommandRef}
                isOrtho={isOrtho}
              />
              {boreholes.map((b, i) => (
                <Borehole key={i} x={b.x} z={b.z} />
              ))}
            </Suspense>
          </Canvas>
        </div>

        {/* ── RIGHT PANEL: Model Info ── */}
        {showInfoPanel && (
          <div className="w-60 flex-shrink-0 border-l border-white/10 bg-[#0e1020] flex flex-col overflow-hidden">
            <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-primary" />
                Info model
              </h3>
              <button onClick={() => setShowInfoPanel(false)} className="text-white/30 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div className="bg-white/5 rounded-lg p-2.5">
                <p className="text-[10px] text-white/40 mb-1">Modele încărcate</p>
                <p className="text-lg font-bold text-white">{models.length}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5">
                <p className="text-[10px] text-white/40 mb-1">Modele vizibile</p>
                <p className="text-lg font-bold text-primary">{visibleIds.size}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5">
                <p className="text-[10px] text-white/40 mb-1">Mod culoare</p>
                <p className="text-xs text-white capitalize">{colorMode}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5">
                <p className="text-[10px] text-white/40 mb-1">Foraje virtuale</p>
                <p className="text-lg font-bold text-amber-400">{boreholes.length}</p>
              </div>
              {models.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Detalii straturi</p>
                  {models.map(m => (
                    <div key={m.id} className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0 mt-0.5" style={{ background: layerColors[m.id] }} />
                      <div>
                        <p className="text-xs text-white/70 leading-tight">{m.name}</p>
                        <p className="text-[10px] text-white/30">{m.zone} · {(m.fileSize / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
