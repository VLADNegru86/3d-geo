import { Router, type IRouter } from "express";
import { db, geoModelsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";

const router: IRouter = Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "models");

router.get("/geo-models", async (_req, res): Promise<void> => {
  const models = await db.select().from(geoModelsTable).orderBy(geoModelsTable.zone, geoModelsTable.name);
  const grouped: Record<string, typeof models> = {};
  for (const m of models) {
    if (!grouped[m.zone]) grouped[m.zone] = [];
    grouped[m.zone].push(m);
  }
  res.json({ models, grouped, zones: Object.keys(grouped) });
});

router.get("/geo-models/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [model] = await db.select().from(geoModelsTable).where(eq(geoModelsTable.id, id)).limit(1);
  if (!model) { res.status(404).json({ error: "Not found" }); return; }
  res.json(model);
});

router.get("/geo-models/:id/file", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [model] = await db.select().from(geoModelsTable).where(eq(geoModelsTable.id, id)).limit(1);
  if (!model) { res.status(404).json({ error: "Not found" }); return; }
  const filePath = path.join(UPLOADS_DIR, model.fileName);
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: "File not found" }); return; }
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", `inline; filename="${model.fileName}"`);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.sendFile(filePath);
});

export default router;
