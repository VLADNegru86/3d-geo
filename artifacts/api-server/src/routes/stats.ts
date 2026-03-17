import { Router, type IRouter } from "express";
import { db, resourcesTable, categoriesTable, mapPointsTable } from "@workspace/db";
import { GetStatsResponse } from "@workspace/api-zod";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats", async (_req, res) => {
  const [
    resourceCount,
    categoryCount,
    mapPointCount,
    downloadCount,
    regionCount,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(resourcesTable),
    db.select({ count: sql<number>`count(*)` }).from(categoriesTable),
    db.select({ count: sql<number>`count(*)` }).from(mapPointsTable),
    db.select({ total: sql<number>`coalesce(sum(download_count), 0)` }).from(resourcesTable),
    db.select({ count: sql<number>`count(distinct region)` }).from(resourcesTable),
  ]);

  const data = GetStatsResponse.parse({
    totalResources: Number(resourceCount[0].count),
    totalCategories: Number(categoryCount[0].count),
    totalMapPoints: Number(mapPointCount[0].count),
    totalDownloads: Number(downloadCount[0].total),
    regions: Number(regionCount[0].count),
  });

  res.json(data);
});

export default router;
