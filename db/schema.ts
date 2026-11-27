import { integer, jsonb, pgTable } from "drizzle-orm/pg-core";

export const galleryState = pgTable("gallery_state", {
  id: integer("id").primaryKey(),
  value: jsonb("value").notNull(),
});
