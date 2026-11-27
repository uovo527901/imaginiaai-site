import { getDatabase } from "@netlify/database";

const supportedLanguages = new Set(["ko", "en", "ja", "zh", "fr"]);

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export default async function navbarLanguage(request) {
  if (request.method !== "GET" && request.method !== "PUT") {
    return json({ error: "Method not allowed" }, 405);
  }

  const browserId = request.headers.get("cookie")?.match(/(?:^|;\s*)imaginia_language_browser=([a-f0-9-]{36})(?:;|$)/)?.[1];
  if (!browserId || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(browserId)) {
    return request.method === "GET" ? json({ language: null }) : json({ error: "Missing browser ID" }, 400);
  }

  if (request.method === "GET") {
    const [preference] = await getDatabase().sql`SELECT language FROM imaginia_navbar_preferences WHERE browser_id = ${browserId}`;
    return json({ language: preference?.language ?? null });
  }

  const data = await request.json().catch(() => null);
  if (!supportedLanguages.has(data?.language)) return json({ error: "Unsupported language" }, 400);

  await getDatabase().sql`INSERT INTO imaginia_navbar_preferences (browser_id, language)
    VALUES (${browserId}, ${data.language})
    ON CONFLICT (browser_id) DO UPDATE SET language = EXCLUDED.language`;
  return json({ language: data.language });
}
