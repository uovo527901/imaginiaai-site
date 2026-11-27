import { createHmac, timingSafeEqual } from "node:crypto";
import { getDatabase } from "@netlify/database";

const sessionName = "imaginia_admin";
const sessionAge = 60 * 60;

function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function sameValue(left, right) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function signSession(expiry, password) {
  return createHmac("sha256", password).update(`imaginia-gallery:${expiry}`).digest("hex");
}

function sessionCookie(value, maxAge) {
  return { "Set-Cookie": `${sessionName}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}` };
}

export function startSession(password) {
  const expiry = Math.floor(Date.now() / 1000) + sessionAge;
  return json({ ok: true }, 200, sessionCookie(`${expiry}.${signSession(expiry, password)}`, sessionAge));
}

export function hasAdminSession(cookieHeader) {
  const cookie = cookieHeader?.split(/;\s*/).find(value => value.startsWith(`${sessionName}=`));
  const [expiry, signature] = cookie?.slice(sessionName.length + 1).split(".") ?? [];
  if (!/^\d{10}$/.test(expiry) || Number(expiry) <= Math.floor(Date.now() / 1000) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const password = process.env.ADMIN_PASSWORD;
  return !!password && sameValue(signature, signSession(expiry, password));
}

export default async function gallery(request) {
  try {
    if (request.method === "GET") {
      const [state] = await getDatabase().sql`SELECT user_works, overrides FROM imaginia_gallery_state WHERE singleton`;
      return json({ userWorks: state?.user_works ?? [], overrides: state?.overrides ?? {} });
    }
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Expected JSON" }, 415);

    const body = await request.text();
    if (Buffer.byteLength(body) > 256 * 1024) return json({ error: "Gallery data is too large" }, 413);
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const action = data?.action;
    if (action === "lock") return json({ ok: true }, 200, sessionCookie("", 0));
    if (action !== "save") return json({ error: "Unknown action" }, 400);
    if (!hasAdminSession(request.headers.get("cookie"))) return json({ error: "Gallery admin session expired" }, 401);

    const { userWorks, overrides } = data;
    if (!Array.isArray(userWorks) || !overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
      return json({ error: "Invalid gallery data" }, 400);
    }
    await getDatabase().sql`INSERT INTO imaginia_gallery_state (user_works, overrides)
      VALUES (${JSON.stringify(userWorks)}::jsonb, ${JSON.stringify(overrides)}::jsonb)
      ON CONFLICT (singleton) DO UPDATE SET user_works = EXCLUDED.user_works, overrides = EXCLUDED.overrides`;
    return json({ ok: true });
  } catch {
    return json({ error: "Could not access gallery data" }, 500);
  }
}
