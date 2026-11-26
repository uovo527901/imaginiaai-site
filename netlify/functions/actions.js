exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  try {
    const body = JSON.parse(event.body || "{}");
    const action = body.action || "";
    const args = body.args || {};
    const crypto = require("crypto");
    if (action === "runpod.generate" || action === "runpod-generate" || action === "generate") {
      const apiKey = process.env.RUNPOD_API_KEY || "";
      const endpointId = process.env.RUNPOD_ENDPOINT_ID || "";
      if (!apiKey || !endpointId) return { statusCode: 200, body: JSON.stringify({ data: { ok: false, reason: "no-key" } }) };
      const res = await fetch(`https://api.runpod.ai/v2/${endpointId}/runsync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ input: { prompt: args.prompt || "a person smiling, looking at camera", image: args.image || undefined, size: args.size || "1280x704", seconds: args.seconds || 5, fps: args.fps || 24 } }),
      });
      const data = await res.json().catch(() => ({}));
      return { statusCode: 200, body: JSON.stringify({ data: { ok: true, result: data } }) };
    }
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
