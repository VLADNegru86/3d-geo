import { pgTable, text, serial, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";

export const mapImagesTable = pgTable("map_images", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fileName: text("file_name").notNull(),
  northLat: real("north_lat").notNull(),
  southLat: real("south_lat").notNull(),
  eastLon: real("east_lon").notNull(),
  westLon: real("west_lon").notNull(),
  opacity: real("opacity").notNull().default(0.8),
  visible: boolean("visible").notNull().default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MapImage = typeof mapImagesTable.$inferSelect;
