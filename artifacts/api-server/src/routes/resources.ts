import { Router, type IRouter } from "express";
import { db, resourcesTable, categoriesTable } from "@workspace/db";
import {
  CreateResourceBody,
  ListResourcesQueryParams,
  GetResourceParams,
} from "@workspace/api-zod";
import { eq, ilike, and, sql, type SQL } from "drizzle-orm";

const router: IRouter = Router();

function formatResource(r: any) {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    type: r.type,
    categoryId: r.categoryId ?? undefined,
    categoryName: r.categoryName ?? undefined,
    region: r.region ?? undefined,
    author: r.author ?? undefined,
    year: r.year ?? undefined,
    thumbnailUrl: r.thumbnailUrl ?? undefined,
    downloadUrl: r.downloadUrl ?? undefined,
    tags: r.tags ?? [],
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

router.get("/resources", async (req, res) => {
  const query = ListResourcesQueryParams.parse(req.query);
  const { category, type, search, region, page = 1, limit = 20 } = query;

  const offset = (page - 1) * limit;
  const filters: SQL[] = [];

  if (type) filters.push(eq(resourcesTable.type, type as any));
  if (region) filters.push(ilike(resourcesTable.region, `%${region}%`));
  if (search) filters.push(ilike(resourcesTable.title, `%${search}%`));

  if (category) {
    const categoryId = parseInt(category, 10);
    if (!isNaN(categoryId)) {
      filters.push(eq(resourcesTable.categoryId, categoryId));
    } else {
      const cat = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.slug, category))
        .limit(1);
      if (cat.length > 0) {
        filters.push(eq(resourcesTable.categoryId, cat[0].id));
      }
    }
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const [resources, totalResult] = await Promise.all([
    db
      .select({
        id: resourcesTable.id,
        title: resourcesTable.title,
        description: resourcesTable.description,
        type: resourcesTable.type,
        categoryId: resourcesTable.categoryId,
        categoryName: categoriesTable.name,
        region: resourcesTable.region,
        author: resourcesTable.author,
        year: resourcesTable.year,
        thumbnailUrl: resourcesTable.thumbnailUrl,
        downloadUrl: resourcesTable.downloadUrl,
        tags: resourcesTable.tags,
        createdAt: resourcesTable.createdAt,
      })
      .from(resourcesTable)
      .leftJoin(categoriesTable, eq(resourcesTable.categoryId, categoriesTable.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(resourcesTable)
      .where(whereClause),
  ]);

  const total = Number(totalResult[0].count);
  const totalPages = Math.ceil(total / limit);

  res.json({
    resources: resources.map(formatResource),
    total,
    page,
    limit,
    totalPages,
  });
});

router.get("/resources/:id", async (req, res) => {
  const params = GetResourceParams.parse({ id: req.params.id });

  const [resource] = await db
    .select({
      id: resourcesTable.id,
      title: resourcesTable.title,
      description: resourcesTable.description,
      type: resourcesTable.type,
      categoryId: resourcesTable.categoryId,
      categoryName: categoriesTable.name,
      region: resourcesTable.region,
      author: resourcesTable.author,
      year: resourcesTable.year,
      thumbnailUrl: resourcesTable.thumbnailUrl,
      downloadUrl: resourcesTable.downloadUrl,
      tags: resourcesTable.tags,
      createdAt: resourcesTable.createdAt,
    })
    .from(resourcesTable)
    .leftJoin(categoriesTable, eq(resourcesTable.categoryId, categoriesTable.id))
    .where(eq(resourcesTable.id, params.id))
    .limit(1);

  if (!resource) {
    res.status(404).json({ message: "Resource not found" });
    return;
  }

  res.json(formatResource(resource));
});

router.post("/resources", async (req, res) => {
  const body = CreateResourceBody.parse(req.body);

  const [resource] = await db
    .insert(resourcesTable)
    .values(body as any)
    .returning();

  res.status(201).json(formatResource(resource));
});

export default router;
