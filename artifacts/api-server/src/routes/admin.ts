import { Router, type IRouter } from "express";
import { db, resourcesTable, categoriesTable, stratigraphicUnitsTable, mapPointsTable, geoModelsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getTokenFromRequest, verifyToken } from "../lib/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "models");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

const router: IRouter = Router();

function requireAdmin(req: any, res: any): boolean {
  const token = getTokenFromRequest(req);
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return false; }
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return false; }
  return true;
}

// ─── RESOURCES ────────────────────────────────────────────────────────────────

router.post("/admin/resources", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { title, description, type, categoryId, region, author, year, thumbnailUrl, downloadUrl, tags } = req.body;
  if (!title || !type) { res.status(400).json({ error: "title and type required" }); return; }
  const [resource] = await db.insert(resourcesTable).values({
    title, description: description || null, type,
    categoryId: categoryId ? Number(categoryId) : null,
    region: region || null, author: author || null,
    year: year ? Number(year) : null,
    thumbnailUrl: thumbnailUrl || null, downloadUrl: downloadUrl || null,
    tags: tags || [],
  }).returning();
  res.status(201).json(resource);
});

router.put("/admin/resources/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const { title, description, type, categoryId, region, author, year, thumbnailUrl, downloadUrl, tags } = req.body;
  const [resource] = await db.update(resourcesTable).set({
    ...(title && { title }),
    ...(description !== undefined && { description: description || null }),
    ...(type && { type }),
    ...(categoryId !== undefined && { categoryId: categoryId ? Number(categoryId) : null }),
    ...(region !== undefined && { region: region || null }),
    ...(author !== undefined && { author: author || null }),
    ...(year !== undefined && { year: year ? Number(year) : null }),
    ...(thumbnailUrl !== undefined && { thumbnailUrl: thumbnailUrl || null }),
    ...(downloadUrl !== undefined && { downloadUrl: downloadUrl || null }),
    ...(tags !== undefined && { tags }),
  }).where(eq(resourcesTable.id, id)).returning();
  if (!resource) { res.status(404).json({ error: "Not found" }); return; }
  res.json(resource);
});

router.delete("/admin/resources/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  await db.delete(resourcesTable).where(eq(resourcesTable.id, id));
  res.json({ success: true });
});

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

router.post("/admin/categories", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { name, slug, description, iconName, color } = req.body;
  if (!name || !slug) { res.status(400).json({ error: "name and slug required" }); return; }
  const [category] = await db.insert(categoriesTable).values({
    name, slug, description: description || null,
    iconName: iconName || null, color: color || null,
  }).returning();
  res.status(201).json(category);
});

router.put("/admin/categories/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const { name, slug, description, iconName, color } = req.body;
  const [category] = await db.update(categoriesTable).set({
    ...(name && { name }), ...(slug && { slug }),
    ...(description !== undefined && { description: description || null }),
    ...(iconName !== undefined && { iconName: iconName || null }),
    ...(color !== undefined && { color: color || null }),
  }).where(eq(categoriesTable.id, id)).returning();
  if (!category) { res.status(404).json({ error: "Not found" }); return; }
  res.json(category);
});

router.delete("/admin/categories/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.json({ success: true });
});

// ─── STRATIGRAPHIC UNITS ──────────────────────────────────────────────────────

router.post("/admin/stratigraphic-units", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { name, era, period, epoch, ageFrom, ageTo, color, description, region } = req.body;
  if (!name || !era || ageFrom === undefined || ageTo === undefined) {
    res.status(400).json({ error: "name, era, ageFrom, ageTo required" }); return;
  }
  const [unit] = await db.insert(stratigraphicUnitsTable).values({
    name, era, period: period || null, epoch: epoch || null,
    ageFrom: Number(ageFrom), ageTo: Number(ageTo),
    color: color || null, description: description || null, region: region || null,
  }).returning();
  res.status(201).json(unit);
});

router.put("/admin/stratigraphic-units/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const { name, era, period, epoch, ageFrom, ageTo, color, description, region } = req.body;
  const [unit] = await db.update(stratigraphicUnitsTable).set({
    ...(name && { name }), ...(era && { era }),
    ...(period !== undefined && { period: period || null }),
    ...(epoch !== undefined && { epoch: epoch || null }),
    ...(ageFrom !== undefined && { ageFrom: Number(ageFrom) }),
    ...(ageTo !== undefined && { ageTo: Number(ageTo) }),
    ...(color !== undefined && { color: color || null }),
    ...(description !== undefined && { description: description || null }),
    ...(region !== undefined && { region: region || null }),
  }).where(eq(stratigraphicUnitsTable.id, id)).returning();
  if (!unit) { res.status(404).json({ error: "Not found" }); return; }
  res.json(unit);
});

router.delete("/admin/stratigraphic-units/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  await db.delete(stratigraphicUnitsTable).where(eq(stratigraphicUnitsTable.id, id));
  res.json({ success: true });
});

// ─── MAP POINTS ───────────────────────────────────────────────────────────────

router.post("/admin/map-points", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { name, type, latitude, longitude, description, resourceId, age, formation } = req.body;
  if (!name || !type || latitude === undefined || longitude === undefined) {
    res.status(400).json({ error: "name, type, latitude, longitude required" }); return;
  }
  const [point] = await db.insert(mapPointsTable).values({
    name, type, latitude: Number(latitude), longitude: Number(longitude),
    description: description || null,
    resourceId: resourceId ? Number(resourceId) : null,
    age: age || null, formation: formation || null,
  }).returning();
  res.status(201).json(point);
});

router.put("/admin/map-points/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const { name, type, latitude, longitude, description, resourceId, age, formation } = req.body;
  const [point] = await db.update(mapPointsTable).set({
    ...(name && { name }), ...(type && { type }),
    ...(latitude !== undefined && { latitude: Number(latitude) }),
    ...(longitude !== undefined && { longitude: Number(longitude) }),
    ...(description !== undefined && { description: description || null }),
    ...(resourceId !== undefined && { resourceId: resourceId ? Number(resourceId) : null }),
    ...(age !== undefined && { age: age || null }),
    ...(formation !== undefined && { formation: formation || null }),
  }).where(eq(mapPointsTable.id, id)).returning();
  if (!point) { res.status(404).json({ error: "Not found" }); return; }
  res.json(point);
});

router.delete("/admin/map-points/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  await db.delete(mapPointsTable).where(eq(mapPointsTable.id, id));
  res.json({ success: true });
});

// ─── GEO MODELS ───────────────────────────────────────────────────────────────

router.post("/admin/geo-models/upload", (req: any, res: any) => {
  if (!requireAdmin(req, res)) return;
  upload.single("file")(req, res, async (err) => {
    if (err) { res.status(400).json({ error: err.message }); return; }
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    const { name, zone, description } = req.body;
    if (!name || !zone) { res.status(400).json({ error: "name and zone required" }); return; }
    const [model] = await db.insert(geoModelsTable).values({
      name, zone, description: description || null,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
    }).returning();
    res.status(201).json(model);
  });
});

router.delete("/admin/geo-models/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const [model] = await db.select().from(geoModelsTable).where(eq(geoModelsTable.id, id)).limit(1);
  if (model?.fileName) {
    const filePath = path.join(UPLOADS_DIR, model.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await db.delete(geoModelsTable).where(eq(geoModelsTable.id, id));
  res.json({ success: true });
});

export default router;
