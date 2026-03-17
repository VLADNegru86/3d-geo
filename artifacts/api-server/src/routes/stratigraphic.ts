import { Router, type IRouter } from "express";
import { db, stratigraphicUnitsTable } from "@workspace/db";
import {
  ListStratigraphicUnitsResponse,
  ListStratigraphicUnitsQueryParams,
} from "@workspace/api-zod";
import { eq, ilike, and, type SQL } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stratigraphic-units", async (req, res) => {
  const query = ListStratigraphicUnitsQueryParams.parse(req.query);
  const { era, region } = query;

  const filters: SQL[] = [];
  if (era) filters.push(ilike(stratigraphicUnitsTable.era, `%${era}%`));
  if (region) filters.push(ilike(stratigraphicUnitsTable.region, `%${region}%`));

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const units = await db
    .select()
    .from(stratigraphicUnitsTable)
    .where(whereClause)
    .orderBy(stratigraphicUnitsTable.ageFrom);

  res.json(
    units.map((u) => ({
      id: u.id,
      name: u.name,
      era: u.era,
      period: u.period ?? undefined,
      epoch: u.epoch ?? undefined,
      ageFrom: u.ageFrom,
      ageTo: u.ageTo,
      color: u.color ?? undefined,
      description: u.description ?? undefined,
      region: u.region ?? undefined,
    }))
  );
});

export default router;
