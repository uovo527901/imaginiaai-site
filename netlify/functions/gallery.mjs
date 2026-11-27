import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getDatabase } from "@netlify/database";

const deriveKey = promisify(scrypt);
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

async function checkPassword(password, storedHash) {
  if (typeof password !== "string" || !password || password.length > 1024) return false;
  if (!storedHash.startsWith("scrypt:")) {
    return sameValue(createHash("sha256").update(password).digest("hex"), storedHash);
  }
  const [, salt, hash] = storedHash.split(":");
  const key = await deriveKey(password, salt, 32);
  return sameValue(key.toString("hex"), hash);
}

function signSession(expiry, key, passwordHash) {
  return createHmac("sha256", key).update(`imaginia-gallery:${expiry}:${passwordHash}`).digest("hex");
}

function sessionCookie(value, maxAge) {
  return { "Set-Cookie": `${sessionName}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}` };
}

function startSession(key, passwordHash) {
  const expiry = Math.floor(Date.now() / 1000) + sessionAge;
  return json({ ok: true }, 200, sessionCookie(`${expiry}.${signSession(expiry, key, passwordHash)}`, sessionAge));
}

export async function getAdminCredentials() {
  const key = process.env.ADMIN_PASSWORD_HASH;
  if (!key) return null;
  const { sql } = getDatabase();
  const [admin] = await sql`SELECT admin_password_hash FROM imaginia_gallery_state WHERE singleton`;
  return { key, sql, passwordHash: admin?.admin_password_hash || key };
}

export async function hasAdminSession(cookieHeader, credentials) {
  const cookie = cookieHeader?.split(/;\s*/).find(value => value.startsWith(`${sessionName}=`));
  const [expiry, signature] = cookie?.slice(sessionName.length + 1).split(".") ?? [];
  if (!/^\d{10}$/.test(expiry) || Number(expiry) <= Math.floor(Date.now() / 1000) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const admin = credentials ?? await getAdminCredentials();
  return !!admin && sameValue(signature, signSession(expiry, admin.key, admin.passwordHash));
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
    if (!["unlock", "save", "change-password"].includes(action)) return json({ error: "Unknown action" }, 400);

    const credentials = await getAdminCredentials();
    if (!credentials) return json({ error: "Gallery admin is not configured" }, 503);
    const { key, sql, passwordHash } = credentials;

    if (action === "unlock") {
      return await checkPassword(data.password, passwordHash) ? startSession(key, passwordHash) : json({ ok: false }, 401);
    }

    if (!await hasAdminSession(request.headers.get("cookie"), credentials)) return json({ error: "Gallery admin session expired" }, 401);
    if (action === "change-password") {
      if (!await checkPassword(data.password, passwordHash)) return json({ ok: false }, 401);
      if (typeof data.newPassword !== "string" || !data.newPassword || data.newPassword.length > 1024) {
        return json({ error: "Invalid password" }, 400);
      }
      const salt = randomBytes(16).toString("hex");
      const newHash = `scrypt:${salt}:${(await deriveKey(data.newPassword, salt, 32)).toString("hex")}`;
      await sql`INSERT INTO imaginia_gallery_state (admin_password_hash) VALUES (${newHash})
        ON CONFLICT (singleton) DO UPDATE SET admin_password_hash = EXCLUDED.admin_password_hash`;
      return startSession(key, newHash);
    }

    const { userWorks, overrides } = data;
    if (!Array.isArray(userWorks) || !overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
      return json({ error: "Invalid gallery data" }, 400);
    }
    await sql`INSERT INTO imaginia_gallery_state (user_works, overrides)
      VALUES (${JSON.stringify(userWorks)}::jsonb, ${JSON.stringify(overrides)}::jsonb)
      ON CONFLICT (singleton) DO UPDATE SET user_works = EXCLUDED.user_works, overrides = EXCLUDED.overrides`;
    return json({ ok: true });
  } catch {
    return json({ error: "Could not access gallery data" }, 500);
  }
}
