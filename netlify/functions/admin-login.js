const crypto = require('crypto');
exports.handler = async (event) => {
  const { password } = JSON.parse(event.body || '{}');
  const hash = crypto.createHash('sha256').update(password || '').digest('hex');
  const ok = hash === process.env.ADMIN_PASSWORD_HASH;
  return { statusCode: 200, body: JSON.stringify({ ok }) };
};