const crypto = require('crypto');
const { gallerySessionCookie } = require('../lib/gallery-session.js');

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (event.httpMethod === 'GET') {
    return { statusCode: 200, headers, body: JSON.stringify({ configured: Boolean(process.env.ADMIN_PASSWORD_HASH) }) };
  }
  if (event.httpMethod === 'DELETE') {
    return { statusCode: 204, headers: { ...headers, 'Set-Cookie': gallerySessionCookie(false) } };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers };

  let input;
  try { input = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers }; }
  const { password, gallery } = input || {};
  const expected = process.env.ADMIN_PASSWORD_HASH;
  const hash = crypto.createHash('sha256').update(typeof password === 'string' ? password : '').digest('hex');
  const ok = /^[a-f\d]{64}$/.test(expected || '') && crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expected, 'hex'));
  if (ok && gallery === true) headers['Set-Cookie'] = gallerySessionCookie(true);
  return { statusCode: 200, headers, body: JSON.stringify({ ok }) };
};
