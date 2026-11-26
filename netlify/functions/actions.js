exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  try {
    const body = JSON.parse(event.body || "{}");
    const action = body.action || "";
    const args = body.args || {};
    const crypto = require("crypto");
    if (action.includes("admin")) {
      const hash = process.env.ADMIN_PASSWORD_HASH || "";
      const pw = args.password || args.newPassword || body.password || "";
      if (!hash) return { statusCode: 200, body: JSON.stringify({ data: { ok: false, needsSetup: true } }) };
      if (!pw) return { statusCode: 200, body: JSON.stringify({ data: { ok: false } }) };
      const inputHash = crypto.createHash("sha256").update(String(pw)).digest("hex");
      if (inputHash === hash) return { statusCode: 200, body: JSON.stringify({ data: { ok: true, token: crypto.randomBytes(24).toString("hex") } }) };
      return { statusCode: 200, body: JSON.stringify({ data: { ok: false } }) };
    }
    if (action.startsWith("records.")) {
      if (action === "records.list") return { statusCode: 200, body: JSON.stringify({ data: { records: [] } }) };
      return { statusCode: 200, body: JSON.stringify({ data: { id: "ok", records: [] } }) };
    }
    return { statusCode: 200, body: JSON.stringify({ data: {} }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
