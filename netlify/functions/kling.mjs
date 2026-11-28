import { maxImageBytes, maxReferences, models } from "../../kling/catalog.mjs";
import { hasAdminSession } from "./gallery.mjs";

const falQueue = "https://queue.fal.run";
const queueApps = { v4: "kling/v4", v3: "fal-ai/kling-video" };
const maxBodySize = 3 * 1024 * 1024;
const validId = /^[a-z0-9_-]{1,128}$/i;

class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function httpsUrl(value) {
  if (typeof value !== "string" || value.length > 4096) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function list(value, max, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max) throw new RequestError(`Use up to ${max} ${label}.`);
  return value;
}

function buildTask(input) {
  const model = models.find(option => option.id === input?.model);
  if (!model) throw new RequestError("Select a supported Kling model.");
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  if (!prompt || prompt.length > 2500) throw new RequestError("Enter a prompt of 1–2,500 characters.");
  if (!model.resolutions.includes(input.resolution) || !model.ratios.includes(input.ratio)) {
    throw new RequestError("Select a resolution and aspect ratio supported by the model.");
  }

  const references = list(input.references, maxReferences, "reference images");
  const middleFrames = list(input.middleFrames, maxReferences, "middle frames");
  const elementIds = list(input.elementIds, maxReferences, "Kling Elements");
  const baseVideo = input.baseVideo ? httpsUrl(input.baseVideo) : null;
  if ((input.startFrame && !model.frames && !model.startFrame) ||
      ((middleFrames.length || input.endFrame) && !model.frames) ||
      (references.length && !model.references) || (elementIds.length && !model.elements) ||
      (input.baseVideo && (!model.editing || !baseVideo))) {
    throw new RequestError("Check that the selected model supports these inputs. Source video links must use HTTPS.");
  }
  if ((middleFrames.length || input.endFrame) && !input.startFrame) {
    throw new RequestError("Add a first frame before adding middle or last frames.");
  }

  const settings = { resolution: input.resolution, aspect_ratio: input.ratio };
  if (model.kind === "video" && !baseVideo) {
    if (!Number.isInteger(input.duration) || input.duration < 3 || input.duration > model.maxDuration) {
      throw new RequestError(`Choose a duration from 3 to ${model.maxDuration} seconds.`);
    }
    settings.duration = input.duration;
  }
  if (input.hdr) {
    if (!model.hdr || input.resolution === "720p") throw new RequestError("HDR requires Kling 4.0 at 1080p or 4K.");
    settings.dynamic_range = "hdr";
  }
  if (model.storyboard) {
    settings.multi_shot = input.multiShot === true;
    settings.audio = input.audio === true ? "native" : "off";
  }

  let imageBytes = 0;
  function imageUrl(encoded) {
    if (typeof encoded !== "string" || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      throw new RequestError("Use JPEG or PNG files for image inputs.");
    }
    const image = Buffer.from(encoded, "base64");
    imageBytes += image.length;
    if (imageBytes > maxImageBytes) throw new RequestError("Image inputs must total 2 MB or less.", 413);
    const jpeg = image.length >= 3 && image.readUIntBE(0, 3) === 0xffd8ff;
    const png = image.length >= 8 && image.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
    if (!jpeg && !png) throw new RequestError("Use JPEG or PNG files for image inputs.");
    return `data:image/${jpeg ? "jpeg" : "png"};base64,${encoded}`;
  }

  if (elementIds.some(id => typeof id !== "string" || !validId.test(id))) {
    throw new RequestError("Enter valid Kling Element IDs.");
  }
  if (input.live === true && elementIds.length) {
    throw new RequestError("fal.ai does not accept Kling Element IDs. Upload reference images instead.");
  }

  const startImage = input.startFrame ? imageUrl(input.startFrame) : null;
  const middleImages = middleFrames.map(imageUrl);
  const endImage = input.endFrame ? imageUrl(input.endFrame) : null;
  const referenceImages = references.map(imageUrl);
  const inputs = Number(Boolean(startImage)) + middleImages.length + Number(Boolean(endImage)) +
    referenceImages.length + Number(Boolean(baseVideo)) + elementIds.length;
  if (startImage) delete settings.aspect_ratio;
  if (baseVideo) settings.aspect_ratio = "adaptive";
  return {
    model, prompt, settings, startImage, middleImages, endImage, referenceImages, baseVideo,
    preview: { model: model.name, kind: model.kind, settings, inputs },
  };
}

function storyboard(prompt, duration) {
  if (!/^shot\s+\d+\s*,/i.test(prompt)) return { prompt, shot_type: "intelligent" };
  const sections = prompt.replace(/;\s*$/, "").split(/;\s*/);
  const shots = sections.map((section, index) => {
    const shot = /^shot\s+(\d+)\s*,\s*(\d+)\s*,\s*([\s\S]+)$/i.exec(section.trim());
    if (!shot || Number(shot[1]) !== index + 1 || Number(shot[2]) < 1 || shot[3].length > 512) {
      throw new RequestError("Use sequential shot numbers and a duration and description for each shot.");
    }
    return { duration: String(Number(shot[2])), prompt: shot[3] };
  });
  if (shots.length > 6 || shots.reduce((total, shot) => total + Number(shot.duration), 0) !== duration) {
    throw new RequestError("Use up to six shots and match their total duration to the video duration.");
  }
  return { multi_prompt: shots, shot_type: "customize" };
}

function falTask(task) {
  const { model, settings, startImage, middleImages, endImage, referenceImages, baseVideo } = task;
  const { resolution, aspect_ratio, duration } = settings;
  const prompt = task.prompt.replace(/@image(\d+)\b/gi, "@Image$1").replace(/@video\b/gi, "@Video1");
  const referenceInputs = referenceImages.length ? { image_urls: referenceImages } : {};
  const framedPrompt = startImage ? prompt.replace(/@first\b/gi, "the first frame").replace(/@middle(\d+)\b/gi, "middle frame $1").replace(/@last\b/gi, "the last frame") : prompt;

  if (model.kind === "image") {
    return { app: "v4", endpoint: referenceImages.length ? "image-to-image" : "text-to-image",
      payload: { prompt, aspect_ratio, resolution: resolution.toUpperCase(), ...referenceInputs } };
  }
  if (model.id === "kling-4.0") {
    const payload = { prompt: framedPrompt, duration, resolution, hdr: settings.dynamic_range === "hdr" };
    return startImage
      ? { app: "v4", endpoint: "image-to-video", payload: { ...payload, start_image_url: startImage,
        ...(middleImages.length && { middle_image_urls: middleImages }), ...(endImage && { end_image_url: endImage }) } }
      : { app: "v4", endpoint: "text-to-video", payload: { ...payload, aspect_ratio } };
  }
  if (model.editing) {
    return baseVideo
      ? { app: "v4", endpoint: "flash/video-to-video", payload: { prompt, resolution, video_url: baseVideo, ...referenceInputs } }
      : { app: "v4", endpoint: referenceImages.length ? "flash/reference-to-video" : "flash/text-to-video",
        payload: { prompt, duration, resolution, aspect_ratio, ...referenceInputs } };
  }

  const variant = { "720p": "standard", "1080p": "pro", "4k": "4k" }[resolution];
  const path = `${model.elements ? "o3" : "v3"}/${variant}`;
  const payload = {
    ...(settings.multi_shot ? storyboard(framedPrompt, duration) : { prompt: framedPrompt }),
    duration: String(duration), generate_audio: settings.audio === "native", ...referenceInputs,
  };
  return startImage
    ? { app: "v3", endpoint: `${path}/image-to-video`, payload: { ...payload, start_image_url: startImage } }
    : { app: "v3", endpoint: `${path}/${referenceImages.length ? "reference-to-video" : "text-to-video"}`,
      payload: { ...payload, aspect_ratio } };
}

async function falRequest(apiKey, path, payload) {
  const response = await fetch(`${falQueue}/${path}`, {
    method: payload ? "POST" : "GET",
    headers: { Authorization: `Key ${apiKey}`, ...(payload && { "Content-Type": "application/json" }) },
    body: payload ? JSON.stringify(payload) : undefined,
    redirect: "error",
    signal: AbortSignal.timeout(12_000),
  });
  const body = await response.json().catch(() => null);
  if ([401, 402, 403].includes(response.status)) {
    throw new RequestError("fal.ai denied access. Check the account balance and model access.", 502);
  }
  if (response.status === 429) throw new RequestError("fal.ai is at capacity or the account reached a limit. Try again shortly.", 429);
  if (response.status === 404) throw new RequestError("fal.ai did not find that endpoint or task.", 404);
  if ([400, 422].includes(response.status)) throw new RequestError("fal.ai rejected the Kling request. Check the prompt, settings, and input media.", 422);
  if (!response.ok || !body) throw new RequestError("fal.ai could not complete this request. Try again later.", 502);
  return body;
}

async function falStatus(apiKey, taskId) {
  const [app, id, extra] = taskId.split(":");
  if (!Object.hasOwn(queueApps, app) || !id || !validId.test(id) || extra !== undefined) {
    throw new RequestError("Enter a valid live task ID.");
  }
  const path = `${queueApps[app]}/requests/${id}`;
  const task = await falRequest(apiKey, `${path}/status`);
  if (task.status === "IN_QUEUE") return { status: "submitted", outputs: [] };
  if (task.status === "IN_PROGRESS") return { status: "processing", outputs: [] };
  if (task.status !== "COMPLETED") throw new RequestError("fal.ai returned an unknown task status.", 502);
  if (task.error || task.error_type) return { status: "failed", outputs: [] };

  let result;
  try {
    result = await falRequest(apiKey, path);
  } catch (error) {
    if (error instanceof RequestError && error.status === 422) return { status: "failed", outputs: [] };
    throw error;
  }
  const outputs = [];
  const video = httpsUrl(result.video?.url);
  if (video) outputs.push({ type: "video", url: video });
  for (const image of Array.isArray(result.images) ? result.images : []) {
    const url = httpsUrl(image?.url);
    if (url) outputs.push({ type: "image", url });
  }
  return { status: "succeeded", outputs };
}

export default async function kling(request) {
  const apiKey = process.env.FAL_KEY?.trim();
  const demo = !apiKey;
  const authorized = demo || hasAdminSession(request.headers.get("cookie"));
  const taskId = new URL(request.url).searchParams.get("taskId");
  if (request.method === "GET" && taskId === null) return json({ demo, authorized });
  if (request.method !== "GET" && request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!authorized) return json({ error: "Unlock Admin on the homepage to use live Kling generation." }, 401);

  try {
    if (request.method === "GET") {
      if (demo) throw new RequestError("Live Kling generation is not configured.", 409);
      return json(await falStatus(apiKey, taskId));
    }

    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      throw new RequestError("Send a JSON request.", 415);
    }
    if (Number(request.headers.get("content-length")) > maxBodySize) throw new RequestError("Image inputs must total 2 MB or less.", 413);
    const body = await request.text();
    if (Buffer.byteLength(body) > maxBodySize) throw new RequestError("Image inputs must total 2 MB or less.", 413);
    let input;
    try { input = JSON.parse(body); } catch { throw new RequestError("Send a valid JSON request."); }
    if (demo && input?.live === true) throw new RequestError("Live Kling generation is not configured.", 409);
    if (!demo && input?.live !== true) throw new RequestError("Live generation is now available. Refresh to continue.", 409);
    const task = buildTask(input);
    if (demo) return json({ demo: true, preview: task.preview });
    const { app, endpoint, payload } = falTask(task);
    const data = await falRequest(apiKey, `${queueApps[app]}/${endpoint}`, payload);
    if (typeof data.request_id !== "string" || !validId.test(data.request_id)) throw new RequestError("fal.ai did not return a task ID.", 502);
    return json({ taskId: `${app}:${data.request_id}` }, 202);
  } catch (error) {
    if (error instanceof RequestError) return json({ error: error.message }, error.status);
    return json({ error: "fal.ai could not be reached. Try again later." }, 502);
  }
}
