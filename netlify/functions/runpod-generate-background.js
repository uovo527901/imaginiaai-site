// Netlify Background Function: runpod-generate-background
// 15분까지 기다릴 수 있어. API 키는 Netlify에만 둠.
exports.handler = async (event) => {
  const apiKey = process.env.RUNPOD_API_KEY || "";
  const endpointId = process.env.RUNPOD_ENDPOINT_ID || "";
  if (!apiKey || !endpointId) return { statusCode: 200, body: JSON.stringify({ ok: false, reason: "no-key" }) };
  try {
    const { prompt, image, seconds } = JSON.parse(event.body || "{}");
    if (!prompt && !image) return { statusCode: 200, body: JSON.stringify({ ok: false }) };
    const res = await fetch(`https://api.runpod.ai/v2/${endpointId}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ input: { prompt: prompt || "same person, keep face", image: image || undefined, seconds: seconds || 5 } }),
    });
    const data = await res.json().catch(() => ({}));
    return { statusCode: 200, body: JSON.stringify({ ok: true, id: data.id }) };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: String(e) }) };
  }
};
