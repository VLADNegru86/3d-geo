import { pgTable, text, serial, integer, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resourceTypeEnum = pgEnum("resource_type", [
  "publication",
  "dataset",
  "map",
  "model3d",
  "report",
  "image",
]);

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  iconName: text("icon_name"),
  color: text("color"),
});

export const resourcesTable = pgTable("resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: resourceTypeEnum("type").notNull(),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  region: text("region"),
  author: text("author"),
  year: integer("year"),
  thumbnailUrl: text("thumbnail_url"),
  downloadUrl: text("download_url"),
  tags: text("tags").array(),
  downloadCount: integer("download_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mapPointsTable = pgTable("map_points", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  description: text("description"),
  resourceId: integer("resource_id").references(() => resourcesTable.id),
  age: text("age"),
  formation: text("formation"),
});

export const stratigraphicUnitsTable = pgTable("stratigraphic_units", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  era: text("era").notNull(),
  period: text("period"),
  epoch: text("epoch"),
  ageFrom: real("age_from").notNull(),
  ageTo: real("age_to").notNull(),
  color: text("color"),
  description: text("description"),
  region: text("region"),
});

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;

export const insertResourceSchema = createInsertSchema(resourcesTable).omit({ id: true, createdAt: true });
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resourcesTable.$inferSelect;

export const insertMapPointSchema = createInsertSchema(mapPointsTable).omit({ id: true });
export type InsertMapPoint = z.infer<typeof insertMapPointSchema>;
export type MapPoint = typeof mapPointsTable.$inferSelect;

export const insertStratigraphicUnitSchema = createInsertSchema(stratigraphicUnitsTable).omit({ id: true });
export type InsertStratigraphicUnit = z.infer<typeof insertStratigraphicUnitSchema>;
export type StratigraphicUnit = typeof stratigraphicUnitsTable.$inferSelect;
