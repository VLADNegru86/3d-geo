import { pgTable, text, serial, integer, timestamp, real } from "drizzle-orm/pg-core";

export const geoModelsTable = pgTable("geo_models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  zone: text("zone").notNull(),
  description: text("description"),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export type GeoModel = typeof geoModelsTable.$inferSelect;
