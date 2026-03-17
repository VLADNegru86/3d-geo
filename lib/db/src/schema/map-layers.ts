import { pgTable, text, serial, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";

export const mapLayersTable = pgTable("map_layers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fileType: text("file_type").notNull(),
  geojson: jsonb("geojson").notNull(),
  color: text("color").notNull().default("#f59e0b"),
  visible: boolean("visible").notNull().default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MapLayer = typeof mapLayersTable.$inferSelect;
