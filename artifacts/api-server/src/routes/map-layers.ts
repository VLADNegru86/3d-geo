import { Router, type IRouter } from "express";
import multer from "multer";
import AdmZip from "adm-zip";
import * as shapefile from "shapefile";
import { kml as toGeoJSONkml, gpx as toGeoJSONgpx } from "@tmcw/togeojson";
import { DOMParser } from "@xmldom/xmldom";
import { db, mapLayersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getTokenFromRequest, verifyToken } from "../lib/auth";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/zip", "application/x-zip-compressed",
      "application/json", "application/geo+json",
      "application/vnd.google-earth.kml+xml", "text/xml", "application/xml",
      "application/gpx+xml",
      "application/octet-stream", // fallback
    ];
    const ext = file.originalname.toLowerCase().split(".").pop();
    const allowedExts = ["zip", "json", "geojson", "kml", "gpx", "shp"];
    if (allowedExts.includes(ext || "")) return cb(null, true);
    cb(null, true); // accept all, validate content later
  },
});

function requireAdmin(req: any, res: any): boolean {
  const token = getTokenFromRequest(req);
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return false; }
  try {
    const user = verifyToken(token);
    if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return false; }
    req.adminUser = user;
    return true;
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return false;
  }
}

// Parse SHP from zip buffer
async function parseShpZip(buffer: Buffer): Promise<GeoJSON.FeatureCollection> {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  const shpEntry = entries.find(e => e.name.toLowerCase().endsWith(".shp"));
  const dbfEntry = entries.find(e => e.name.toLowerCase().endsWith(".dbf"));

  if (!shpEntry) throw new Error("No .shp file found in ZIP archive");

  const shpBuffer = shpEntry.getData();
  const dbfBuffer = dbfEntry?.getData();

  const features: GeoJSON.Feature[] = [];
  const source = await shapefile.open(
    shpBuffer.buffer.slice(shpBuffer.byteOffset, shpBuffer.byteOffset + shpBuffer.byteLength) as ArrayBuffer,
    dbfBuffer ? dbfBuffer.buffer.slice(dbfBuffer.byteOffset, dbfBuffer.byteOffset + dbfBuffer.byteLength) as ArrayBuffer : undefined
  );

  let result = await source.read();
  while (!result.done) {
    if (result.value) features.push(result.value as GeoJSON.Feature);
    result = await source.read();
  }

  return { type: "FeatureCollection", features };
}

// Parse KML buffer
function parseKml(buffer: Buffer): GeoJSON.FeatureCollection {
  const xmlStr = buffer.toString("utf-8");
  const dom = new DOMParser().parseFromString(xmlStr, "text/xml");
  return toGeoJSONkml(dom) as unknown as GeoJSON.FeatureCollection;
}

// Parse GPX buffer
function parseGpx(buffer: Buffer): GeoJSON.FeatureCollection {
  const xmlStr = buffer.toString("utf-8");
  const dom = new DOMParser().parseFromString(xmlStr, "text/xml");
  return toGeoJSONgpx(dom) as unknown as GeoJSON.FeatureCollection;
}

// POST /admin/map-layers/upload
router.post("/admin/map-layers/upload", upload.single("file"), async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const { name, color = "#f59e0b" } = req.body;
  const ext = req.file.originalname.toLowerCase().split(".").pop();
  const layerName = name || req.file.originalname.replace(/\.[^/.]+$/, "");

  let geojson: GeoJSON.FeatureCollection;
  let fileType: string;

  try {
    if (ext === "zip") {
      // Shapefile ZIP
      geojson = await parseShpZip(req.file.buffer);
      fileType = "shp";
    } else if (ext === "geojson" || ext === "json") {
      geojson = JSON.parse(req.file.buffer.toString("utf-8"));
      fileType = "geojson";
    } else if (ext === "kml") {
      geojson = parseKml(req.file.buffer);
      fileType = "kml";
    } else if (ext === "gpx") {
      geojson = parseGpx(req.file.buffer);
      fileType = "gpx";
    } else if (ext === "shp") {
      // Raw .shp without ZIP — parse directly
      const shpBuffer = req.file.buffer;
      const features: GeoJSON.Feature[] = [];
      const source = await shapefile.open(
        shpBuffer.buffer.slice(shpBuffer.byteOffset, shpBuffer.byteOffset + shpBuffer.byteLength) as ArrayBuffer
      );
      let result = await source.read();
      while (!result.done) {
        if (result.value) features.push(result.value as GeoJSON.Feature);
        result = await source.read();
      }
      geojson = { type: "FeatureCollection", features };
      fileType = "shp";
    } else {
      // Try GeoJSON as fallback
      try {
        geojson = JSON.parse(req.file.buffer.toString("utf-8"));
        fileType = "geojson";
      } catch {
        res.status(400).json({ error: `Unsupported file type: .${ext}. Supported: .zip (SHP), .geojson, .kml, .gpx` });
        return;
      }
    }

    const adminUser = (req as any).adminUser;
    const [layer] = await db.insert(mapLayersTable).values({
      name: layerName,
      fileType,
      geojson: geojson as any,
      color,
      visible: true,
      createdBy: adminUser?.id ?? null,
    }).returning();

    res.status(201).json({
      layer: {
        ...layer,
        createdAt: layer.createdAt.toISOString(),
        featureCount: geojson.features?.length ?? 0,
      }
    });
  } catch (err: any) {
    console.error("Parse error:", err);
    res.status(422).json({ error: err.message || "Failed to parse file" });
  }
});

// GET /map-layers
router.get("/map-layers", async (_req, res): Promise<void> => {
  const layers = await db.select().from(mapLayersTable).orderBy(mapLayersTable.createdAt);
  res.json({
    layers: layers.map(l => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
      featureCount: (l.geojson as any)?.features?.length ?? 0,
    }))
  });
});

// PATCH /admin/map-layers/:id
router.patch("/admin/map-layers/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(req.params.id as string, 10);
  const { name, color, visible } = req.body;
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (color !== undefined) updates.color = color;
  if (visible !== undefined) updates.visible = visible;

  const [layer] = await db.update(mapLayersTable).set(updates).where(eq(mapLayersTable.id, id)).returning();
  if (!layer) { res.status(404).json({ error: "Layer not found" }); return; }
  res.json({ layer: { ...layer, createdAt: layer.createdAt.toISOString() } });
});

// DELETE /admin/map-layers/:id
router.delete("/admin/map-layers/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(req.params.id as string, 10);
  await db.delete(mapLayersTable).where(eq(mapLayersTable.id, id));
  res.json({ success: true });
});

export default router;
