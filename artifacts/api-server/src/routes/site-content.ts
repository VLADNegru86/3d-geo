import { Router, type IRouter } from "express";
import { db, siteContentTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getTokenFromRequest, verifyToken } from "../lib/auth";

const router: IRouter = Router();

router.get("/site-content", async (_req, res): Promise<void> => {
  const rows = await db.select().from(siteContentTable);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  res.json(map);
});

router.put("/admin/site-content/:key", async (req, res): Promise<void> => {
  const token = getTokenFromRequest(req);
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const { key } = req.params;
  const { value, description } = req.body;
  if (!value) { res.status(400).json({ error: "value required" }); return; }

  const existing = await db.select().from(siteContentTable).where(eq(siteContentTable.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(siteContentTable).set({ value, updatedAt: new Date() }).where(eq(siteContentTable.key, key));
  } else {
    await db.insert(siteContentTable).values({ key, value, description: description || null });
  }
  res.json({ key, value });
});

export default router;
