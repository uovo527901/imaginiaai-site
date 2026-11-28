import { hasAdminSession } from "./gallery.mjs";

const maxPromptLength = 2500;
const maxBodySize = 16 * 1024;

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export default async function translate(request) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!hasAdminSession(request.headers.get("cookie"))) return json({ error: "An admin session is required." }, 401);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Send a JSON request." }, 415);
  if (Number(request.headers.get("content-length")) > maxBodySize) return json({ error: "Request is too large." }, 413);

  let input;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body) > maxBodySize) return json({ error: "Request is too large." }, 413);
    input = JSON.parse(body);
  } catch {
    return json({ error: "Send a valid JSON request." }, 400);
  }
  const prompt = typeof input?.prompt === "string" ? input.prompt.trim() : "";
  if (!prompt || prompt.length > maxPromptLength) return json({ error: "Enter a prompt of 1–2,500 characters." }, 400);

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();
  if (!apiKey) return json({ error: "Translation is unavailable." }, 503);

  try {
    const response = await fetch("https://translation.googleapis.com/language/translate/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey },
      body: JSON.stringify({ q: prompt, source: "ko", target: "en", format: "text" }),
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
    if (!response.ok) return json({ error: "Translation is unavailable." }, 502);
    const result = await response.json();
    const translation = result?.data?.translations?.[0]?.translatedText;
    if (typeof translation !== "string" || !translation.trim() || translation.length > maxPromptLength) {
      return json({ error: "Translation is unavailable." }, 502);
    }
    return json({ translation: translation.trim() });
  } catch {
    return json({ error: "Translation is unavailable." }, 502);
  }
}
