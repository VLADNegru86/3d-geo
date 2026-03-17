import { Router, type IRouter } from "express";
import { db, mapPointsTable } from "@workspace/db";
import { ListMapPointsResponse, ListMapPointsQueryParams } from "@workspace/api-zod";
import { eq, ilike, and, type SQL } from "drizzle-orm";

const router: IRouter = Router();

router.get("/map-points", async (req, res) => {
  const query = ListMapPointsQueryParams.parse(req.query);
  const { type, region } = query;

  const filters: SQL[] = [];
  if (type) filters.push(eq(mapPointsTable.type, type));
  if (region) filters.push(ilike(mapPointsTable.formation, `%${region}%`));

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const points = await db
    .select()
    .from(mapPointsTable)
    .where(whereClause);

  res.json(
    points.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      latitude: p.latitude,
      longitude: p.longitude,
      description: p.description ?? undefined,
      resourceId: p.resourceId ?? undefined,
      age: p.age ?? undefined,
      formation: p.formation ?? undefined,
    }))
  );
});

export default router;
