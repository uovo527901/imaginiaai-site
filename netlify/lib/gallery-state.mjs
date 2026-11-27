import { getDatabase } from "@netlify/database";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/netlify-db";
import { galleryState } from "../../db/schema.ts";

const galleryId = 1;
let database;

function galleryDatabase() {
  return database ??= drizzle({ client: getDatabase() });
}

export async function readGallery() {
  const db = galleryDatabase();
  const [row] = await db.select({ value: galleryState.value }).from(galleryState).where(eq(galleryState.id, galleryId));
  return row?.value ?? { userWorks: [], overrides: {} };
}

export async function saveGallery(value) {
  const db = galleryDatabase();
  await db.insert(galleryState).values({ id: galleryId, value }).onConflictDoUpdate({
    target: galleryState.id,
    set: { value },
  });
}
