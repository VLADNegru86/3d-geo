import { Router, type IRouter } from "express";
import { db, categoriesTable, resourcesTable } from "@workspace/db";
import { ListCategoriesResponse } from "@workspace/api-zod";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/categories", async (_req, res) => {
  const categories = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      description: categoriesTable.description,
      iconName: categoriesTable.iconName,
      color: categoriesTable.color,
      resourceCount: sql<number>`count(${resourcesTable.id})`,
    })
    .from(categoriesTable)
    .leftJoin(resourcesTable, eq(categoriesTable.id, resourcesTable.categoryId))
    .groupBy(categoriesTable.id);

  res.json(
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description ?? undefined,
      iconName: c.iconName ?? undefined,
      color: c.color ?? undefined,
      resourceCount: Number(c.resourceCount),
    }))
  );
});

export default router;
