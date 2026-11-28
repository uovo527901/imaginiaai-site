import { maxImageBytes, maxReferences, models } from "./catalog.mjs";

const endpoint = "/.netlify/functions/kling";
const byId = id => document.getElementById(id);
const inputs = byId("inputs");
const submit = byId("submit");
const check = byId("check");
const output = byId("output");
const status = byId("status");
const resolution = byId("resolution");
const ratio = byId("ratio");
const duration = byId("duration");
const prompt = byId("prompt");
const translatePrompt = byId("translate-prompt");
const translationStatus = byId("translation-status");
let model = models[0];
let session;
let pendingTask;

function showStatus(message, error = false) {
  status.textContent = message;
  status.toggleAttribute("data-error", error);
}

function setField(field, visible) {
  const wrapper = byId(`${field}-field`);
  wrapper.hidden = !visible;
  wrapper.querySelector("input, select").disabled = !visible;
}

function updateFields() {
  const editsVideo = model.editing && byId("video").value.trim() !== "";
  const hasFirstFrame = (model.frames || model.startFrame) && byId("start").files.length;
  setField("ratio", !editsVideo && !hasFirstFrame);
  setField("duration", model.kind === "video" && !editsVideo);
  const hdrAvailable = model.hdr && resolution.value !== "720p";
  setField("hdr", hdrAvailable);
  byId("toggles").hidden = !hdrAvailable && !model.storyboard;
}

function selectModel(option) {
  model = option;
  byId("model-name").textContent = model.name;
  byId("description").textContent = model.description;
  byId("prompt-help").textContent = model.storyboard
    ? 'For a storyboard, try “shot 1, 2, Wide establishing shot; shot 2, 3, Close-up of the subject;” Match the total to the duration.'
    : "Describe the result you want. For references or edits, name the inputs using the @ labels below.";
  prompt.placeholder = model.kind === "image" ? "A museum poster with the title ‘Night Garden’…" : "A slow tracking shot through a rain-soaked garden…";
  resolution.replaceChildren(...model.resolutions.map(value => new Option(value.toUpperCase(), value)));
  ratio.replaceChildren(...model.ratios.map(value => new Option(value === "auto" ? "Auto" : value, value)));
  duration.max = model.maxDuration ?? 5;
  if (Number(duration.value) > Number(duration.max)) duration.value = duration.max;
  setField("start", model.frames || model.startFrame);
  setField("middle", model.frames);
  setField("end", model.frames);
  setField("references", model.references);
  setField("elements", model.elements);
  setField("video", model.editing);
  setField("multi-shot", model.storyboard);
  setField("audio", model.storyboard);
  updateFields();
}

for (const option of models) {
  const label = document.createElement("label");
  label.className = "model";
  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "model";
  radio.value = option.id;
  radio.checked = option === model;
  radio.addEventListener("change", () => selectModel(option));
  const text = document.createElement("span");
  const title = document.createElement("strong");
  const badge = document.createElement("small");
  title.textContent = option.name;
  badge.textContent = option.badge;
  text.append(title, badge);
  label.append(radio, text);
  byId("models").append(label);
}
selectModel(model);
resolution.addEventListener("change", updateFields);
byId("video").addEventListener("input", updateFields);
byId("start").addEventListener("change", updateFields);

function errorMessage(body, fallback) {
  const message = body?.error || fallback;
  return body?.falStatus ? `fal.ai HTTP ${body.falStatus}: ${message}` : message;
}

async function request(url, options) {
  const response = await fetch(url, { cache: "no-store", ...options });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body) {
    const error = new Error(errorMessage(body, "The studio could not be reached. Try again later."));
    error.status = response.status;
    error.falStatus = body?.falStatus;
    throw error;
  }
  return body;
}

async function translateOnDevice(text, onDownload) {
  const api = globalThis.Translator;
  if (!api) return null;
  const languages = { sourceLanguage: "ko", targetLanguage: "en" };
  const signal = AbortSignal.timeout(90000);
  let translator;
  try {
    if (await api.availability(languages) === "unavailable") return null;
    translator = await api.create({
      ...languages,
      signal,
      monitor(monitor) { monitor.addEventListener("downloadprogress", onDownload); },
    });
    return await translator.translate(text, { signal });
  } catch {
    return null;
  } finally {
    translator?.destroy();
  }
}

prompt.addEventListener("input", () => { translationStatus.textContent = ""; });
translatePrompt.addEventListener("click", async () => {
  const original = prompt.value;
  const text = original.trim();
  if (!text || translatePrompt.disabled) return;

  translatePrompt.disabled = true;
  translationStatus.textContent = "번역 중…";
  try {
    let translation = await translateOnDevice(text, event => {
      if (prompt.value === original) {
        translationStatus.textContent = event.loaded < 1
          ? `번역 언어 팩 다운로드 중… ${Math.round(event.loaded * 100)}%`
          : "번역 중…";
      }
    });
    if (prompt.value !== original) return;
    if (!translation?.trim()) {
      translationStatus.textContent = "번역 중…";
      ({ translation } = await request("/.netlify/functions/kling-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
        signal: AbortSignal.timeout(12000),
      }));
    }
    if (typeof translation !== "string" || !translation.trim() || translation.length > prompt.maxLength) throw new Error();
    if (prompt.value === original) {
      prompt.value = translation;
      translationStatus.textContent = "영어로 번역했어요.";
    }
  } catch {
    if (prompt.value === original) translationStatus.textContent = "번역이 안 됐어요. 영어로 직접 써주세요.";
  } finally {
    translatePrompt.disabled = false;
  }
});

async function connect() {
  try {
    session = await request(endpoint);
    byId("connection").textContent = session.demo
      ? `Demo mode · ${session.demoReason} Preview settings only.`
      : session.authorized ? "Live mode · Generation uses your fal.ai credits."
        : "Live generation requires an ImaginiaAI admin session.";
    byId("admin-link").hidden = session.authorized;
    inputs.disabled = !session.authorized;
    submit.textContent = session.demo ? "Preview request" : "Generate with Kling";
  } catch {
    byId("connection").textContent = "Studio connection unavailable. Refresh to retry.";
    submit.textContent = "Studio unavailable";
  }
}
connect();

function files(id) {
  const field = byId(id);
  return field.disabled ? [] : Array.from(field.files);
}

function encode(file) {
  if (!file) return undefined;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("An image could not be read. Select it again."));
    reader.readAsDataURL(file);
  });
}

async function readForm() {
  const start = files("start");
  const middle = files("middle");
  const end = files("end");
  const references = files("references");
  const value = id => byId(id).disabled ? "" : byId(id).value.trim();
  const checked = id => !byId(id).disabled && byId(id).checked;
  const elementIds = value("elements").split(",").map(id => id.trim()).filter(Boolean);
  const all = [...start, ...middle, ...end, ...references];
  if (all.reduce((bytes, file) => bytes + file.size, 0) > maxImageBytes) throw new Error("Image inputs must total 2 MB or less.");
  if ([middle, references, elementIds].some(group => group.length > maxReferences)) throw new Error(`Use up to ${maxReferences} middle frames, reference images, or Kling Elements per field.`);
  if (!start.length && (middle.length || end.length)) throw new Error("Add a first frame before adding middle or last frames.");
  const requestBody = {
    live: !session.demo, model: model.id, prompt: prompt.value.trim(),
    resolution: resolution.value, ratio: ratio.value, duration: Number(duration.value),
    hdr: checked("hdr"), audio: checked("audio"), multiShot: checked("multi-shot"),
    elementIds, baseVideo: value("video"),
  };
  const [startFrame, middleFrames, endFrame, referenceImages] = await Promise.all([
    encode(start[0]), Promise.all(middle.map(encode)), encode(end[0]), Promise.all(references.map(encode)),
  ]);
  return { ...requestBody, startFrame, middleFrames, endFrame, references: referenceImages };
}

function showPreview(preview) {
  const settings = preview.settings;
  const details = [
    settings.resolution.toUpperCase(), settings.aspect_ratio,
    settings.duration && `${settings.duration} sec`, settings.dynamic_range && "HDR",
    settings.multi_shot && "Multi-shot", settings.audio === "native" && "Native audio",
    preview.inputs > 0 && `${preview.inputs} media ${preview.inputs === 1 ? "input" : "inputs"}`,
  ].filter(Boolean).join(" · ");
  const line = document.createElement("p");
  line.textContent = `${preview.model} · ${details}`;
  output.replaceChildren(line);
  showStatus("Demo request validated. No image or video was generated.");
}

function showMedia(outputs) {
  for (const item of outputs) {
    const figure = document.createElement("figure");
    const media = document.createElement(item.type === "video" ? "video" : "img");
    media.src = item.url;
    if (item.type === "video") {
      media.controls = true;
      media.playsInline = true;
      media.preload = "metadata";
    } else {
      media.alt = "Kling-generated still";
    }
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `Open ${item.type} ↗`;
    figure.append(media, link);
    output.append(figure);
  }
}

async function poll(job, attempts) {
  check.hidden = true;
  try {
    for (let attempt = 0; attempt < attempts; attempt++) {
      if (attempt > 0 || attempts > 1) await new Promise(resolve => setTimeout(resolve, 5000));
      const result = await request(`${endpoint}?${new URLSearchParams({ taskId: job })}`);
      if (result.status === "succeeded") {
        pendingTask = null;
        showMedia(result.outputs);
        showStatus(result.outputs.length ? "Generation complete. Open the result to save a copy." : "Kling completed the job but did not return a media preview.", !result.outputs.length);
        return;
      }
      if (result.status === "failed") {
        pendingTask = null;
        showStatus(errorMessage(result, "Kling could not generate this result. Review the prompt or inputs and try again."), true);
        return;
      }
      showStatus(result.status === "submitted" ? "Queued with Kling…" : "Kling is generating your result…");
    }
    showStatus("Still waiting on Kling. You can check this task again without starting a new one.");
  } catch (error) {
    showStatus(error.message, true);
  } finally {
    check.hidden = !pendingTask;
    submit.disabled = !!pendingTask;
  }
}

byId("studio").addEventListener("submit", async event => {
  event.preventDefault();
  if (!session?.authorized || submit.disabled) return;
  submit.disabled = true;
  output.replaceChildren();
  showStatus(session.demo ? "Validating demo settings…" : "Submitting your request to Kling…");
  try {
    const body = await readForm();
    const result = await request(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (result.demo) showPreview(result.preview);
    else {
      pendingTask = result.taskId;
      showStatus("Queued with Kling. Keep this tab open to see the result.");
      await poll(pendingTask, 36);
    }
  } catch (error) {
    showStatus(error.message, true);
    if (error.status === 401 && !error.falStatus) connect();
  } finally {
    submit.disabled = !!pendingTask;
  }
});

check.addEventListener("click", () => { if (pendingTask) poll(pendingTask, 1); });
