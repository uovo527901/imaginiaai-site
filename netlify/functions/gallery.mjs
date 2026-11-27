import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { getDatabase } from '@netlify/database';

function matches(actual, expected) {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function validPassword(password) {
  return typeof password === 'string' && password.length > 0 && password.length <= 1024;
}

async function verifyPassword(password, verifier, configuredHash) {
  if (!validPassword(password)) return false;
  if (!verifier) return matches(createHash('sha256').update(password).digest('hex'), configuredHash);
  const [salt, expected] = verifier.split(':');
  const derived = await promisify(scrypt)(password, salt, 64);
  return matches(derived.toString('hex'), expected);
}

function sign(expires, configuredHash, verifier) {
  return createHmac('sha256', configuredHash).update(`gallery:${expires}:${verifier || ''}`).digest('hex');
}

function authorized(request, configuredHash, verifier) {
  const cookie = request.headers.get('cookie')?.match(/(?:^|;\s*)imaginia_gallery_admin=(\d+)\.([a-f0-9]{64})(?:;|$)/);
  return cookie && Number(cookie[1]) > Date.now() && matches(cookie[2], sign(cookie[1], configuredHash, verifier));
}

function reply(data, status = 200, session) {
  const headers = { 'Cache-Control': 'no-store' };
  if (session !== undefined) {
    headers['Set-Cookie'] = `imaginia_gallery_admin=${session}; Path=/api/gallery; Max-Age=${session ? 3600 : 0}; HttpOnly; Secure; SameSite=Strict`;
  }
  return Response.json(data, { status, headers });
}

function grantSession(configuredHash, verifier) {
  const expires = Date.now() + 3600_000;
  return reply({ ok: true }, 200, `${expires}.${sign(expires, configuredHash, verifier)}`);
}

export default async function gallery(request) {
  try {
    if (request.method === 'GET') {
      const [record] = await getDatabase().sql`SELECT state, revision FROM imaginia_gallery_state WHERE singleton`;
      return reply(record);
    }

    if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
      return reply({ error: 'Expected JSON.' }, 415);
    }
    const body = await request.json().catch(() => null);
    if (!body || typeof body.action !== 'string') return reply({ error: 'Invalid request.' }, 400);
    if (body.action === 'logout') return reply({ ok: true }, 200, '');

    const configuredHash = process.env.ADMIN_PASSWORD_HASH;
    if (!configuredHash) return reply({ error: 'Gallery administration is unavailable.' }, 503);
    const db = getDatabase();
    const [record] = await db.sql`SELECT admin_verifier FROM imaginia_gallery_state WHERE singleton`;
    const verifier = record.admin_verifier;

    if (body.action === 'login') {
      if (!await verifyPassword(body.password, verifier, configuredHash)) {
        return reply({ error: 'Invalid password.' }, 401);
      }
      return grantSession(configuredHash, verifier);
    }

    if (!authorized(request, configuredHash, verifier)) return reply({ error: 'Open admin mode again.' }, 401);

    if (body.action === 'change-password') {
      if (!await verifyPassword(body.password, verifier, configuredHash)) {
        return reply({ error: 'Invalid password.' }, 401);
      }
      if (!validPassword(body.newPassword)) return reply({ error: 'Invalid new password.' }, 400);
      const salt = randomBytes(16).toString('hex');
      const derived = await promisify(scrypt)(body.newPassword, salt, 64);
      const nextVerifier = `${salt}:${derived.toString('hex')}`;
      await db.sql`UPDATE imaginia_gallery_state SET admin_verifier = ${nextVerifier} WHERE singleton`;
      return grantSession(configuredHash, nextVerifier);
    }

    if (body.action !== 'save') return reply({ error: 'Unknown action.' }, 400);
    const { state, revision } = body;
    if (!Number.isInteger(revision) || !Array.isArray(state?.userWorks) || !state.overrides ||
        typeof state.overrides !== 'object' || Array.isArray(state.overrides)) {
      return reply({ error: 'Invalid gallery data.' }, 400);
    }
    const serialized = JSON.stringify({ userWorks: state.userWorks, overrides: state.overrides });
    if (Buffer.byteLength(serialized) > 512 * 1024) return reply({ error: 'Gallery data is too large.' }, 413);
    const [updated] = await db.sql`
      UPDATE imaginia_gallery_state SET state = ${serialized}::jsonb, revision = revision + 1
      WHERE singleton AND revision = ${revision} RETURNING revision
    `;
    if (!updated) return reply({ error: 'The gallery changed. Reload before saving again.' }, 409);
    return reply(updated);
  } catch {
    return reply({ error: 'Could not access the gallery.' }, 503);
  }
}

export const config = {
  path: '/api/gallery',
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: 'ip' },
};
