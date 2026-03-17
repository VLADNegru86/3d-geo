import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, mapImagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getTokenFromRequest, verifyToken } from "../lib/auth";

const router: IRouter = Router();

const UPLOADS_DIR = path.resolve("uploads/map-images");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/tiff", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp"].includes(ext)) return cb(null, true);
    cb(new Error("Only image files (PNG, JPG, TIFF, WebP) are allowed"));
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

function formatImage(img: any) {
  return {
    id: img.id,
    name: img.name,
    fileName: img.fileName,
    northLat: img.northLat,
    southLat: img.southLat,
    eastLon: img.eastLon,
    westLon: img.westLon,
    opacity: img.opacity,
    visible: img.visible,
    createdAt: img.createdAt.toISOString(),
  };
}

/* POST /admin/map-images/upload */
router.post("/admin/map-images/upload", upload.single("file"), async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  if (!req.file) { res.status(400).json({ error: "No image uploaded" }); return; }

  const { name, northLat, southLat, eastLon, westLon, opacity = "0.8" } = req.body;
  const n = parseFloat(northLat), s = parseFloat(southLat);
  const e = parseFloat(eastLon), w = parseFloat(westLon);

  if ([n, s, e, w].some(isNaN)) {
    fs.unlinkSync(req.file.path);
    res.status(400).json({ error: "Invalid bounds — northLat, southLat, eastLon, westLon required" });
    return;
  }

  const adminUser = (req as any).adminUser;
  const [img] = await db.insert(mapImagesTable).values({
    name: name || req.file.originalname.replace(/\.[^/.]+$/, ""),
    fileName: req.file.filename,
    northLat: n,
    southLat: s,
    eastLon: e,
    westLon: w,
    opacity: parseFloat(opacity),
    visible: true,
    createdBy: adminUser?.id ?? null,
  }).returning();

  res.status(201).json({ image: formatImage(img) });
});

/* GET /map-images */
router.get("/map-images", async (_req, res): Promise<void> => {
  const images = await db.select().from(mapImagesTable).orderBy(mapImagesTable.createdAt);
  res.json({ images: images.map(formatImage) });
});

/* GET /map-images/:id/file — serves the actual image */
router.get("/map-images/:id/file", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [img] = await db.select().from(mapImagesTable).where(eq(mapImagesTable.id, id));
  if (!img) { res.status(404).json({ error: "Not found" }); return; }
  const filePath = path.join(UPLOADS_DIR, img.fileName);
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: "File not found" }); return; }
  res.sendFile(filePath);
});

/* PATCH /admin/map-images/:id */
router.patch("/admin/map-images/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(req.params.id as string, 10);
  const { name, opacity, visible, northLat, southLat, eastLon, westLon } = req.body;
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (opacity !== undefined) updates.opacity = parseFloat(opacity);
  if (visible !== undefined) updates.visible = visible;
  if (northLat !== undefined) updates.northLat = parseFloat(northLat);
  if (southLat !== undefined) updates.southLat = parseFloat(southLat);
  if (eastLon !== undefined) updates.eastLon = parseFloat(eastLon);
  if (westLon !== undefined) updates.westLon = parseFloat(westLon);

  const [img] = await db.update(mapImagesTable).set(updates).where(eq(mapImagesTable.id, id)).returning();
  if (!img) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ image: formatImage(img) });
});

/* DELETE /admin/map-images/:id */
router.delete("/admin/map-images/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(req.params.id as string, 10);
  const [img] = await db.select().from(mapImagesTable).where(eq(mapImagesTable.id, id));
  if (img) {
    const filePath = path.join(UPLOADS_DIR, img.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await db.delete(mapImagesTable).where(eq(mapImagesTable.id, id));
  }
  res.json({ success: true });
});

export default router;
