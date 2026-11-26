// Netlify Function: runpod-generate
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: JSON.stringify({ ok: false }) };
  const apiKey = process.env.RUNPOD_API_KEY || "";
  const endpointId = process.env.RUNPOD_ENDPOINT_ID || "";
  if (!apiKey) return { statusCode: 503, body: JSON.stringify({ ok: false, reason: "no-key" }) };
  if (!endpointId) return { statusCode: 503, body: JSON.stringify({ ok: false, reason: "no-endpoint" }) };
  try {
    const { prompt, image, size, seconds, fps } = JSON.parse(event.body || "{}");
    if (!prompt && !image) return { statusCode: 400, body: JSON.stringify({ ok: false }) };
    const res = await fetch(`https://api.runpod.ai/v2/${endpointId}/runsync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ input: { prompt: prompt || "a person smiling, looking at camera", image: image || undefined, size: size || "1280x704", seconds: seconds || 5, fps: fps || 24 } }),
    });
    if (!res.ok) return { statusCode: 502, body: JSON.stringify({ ok: false }) };
    const data = await res.json();
    return { statusCode: 200, body: JSON.stringify({ ok: true, result: data }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false }) };
  }
};
