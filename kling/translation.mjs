const myMemoryUrl = "https://api.mymemory.translated.net/get";
const encoder = new TextEncoder();
const maxBytes = 500;
const klingReference = /@(?:first|middle\d+|end|image\d+|element\d+|video)\b/gi;

function sourceLanguage(text) {
  if (/\p{Script=Hangul}/u.test(text)) return "ko";
  if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text)) return "ja";
  if (/\p{Script=Han}/u.test(text)) return "zh-CN";
  if (/\p{Script=Latin}/u.test(text)) return "fr";
  throw new Error("한국어, 일본어, 중국어 또는 프랑스어 텍스트를 입력해 주세요.");
}

function splitForMyMemory(text) {
  const chunks = [];
  while (encoder.encode(text).length > maxBytes) {
    let bytes = 0;
    let end = 0;
    let boundary = 0;
    for (const character of text) {
      bytes += encoder.encode(character).length;
      if (bytes > maxBytes) break;
      end += character.length;
      if (/[\s.!?。！？]/u.test(character)) boundary = end;
    }
    end = boundary >= end / 2 ? boundary : end;
    chunks.push(text.slice(0, end));
    text = text.slice(end);
  }
  return [...chunks, text];
}

function validateTranslation(original, translated) {
  if (!translated) throw new Error("번역 서비스가 빈 결과를 반환했습니다.");
  const references = text => (text.match(klingReference) ?? []).sort().join(" ");
  if (references(original) !== references(translated)) {
    throw new Error("번역 중 Kling 참조 태그가 바뀌어 원문을 유지했습니다. 태그 주변 문장을 바꿔 다시 시도해 주세요.");
  }
  if (translated === original.trim()) {
    throw new Error("번역 결과가 원문과 같습니다. 이미 영어이거나 번역할 문장이 없을 수 있습니다.");
  }
  return translated;
}

async function translateWithMyMemory(text, language, signal) {
  const translations = [];
  for (const chunk of splitForMyMemory(text)) {
    if (!chunk.trim()) continue;
    const query = new URLSearchParams({ q: chunk.trim(), langpair: `${language}|en` });
    let response;
    try {
      response = await fetch(`${myMemoryUrl}?${query}`, { cache: "no-store", referrerPolicy: "no-referrer", signal });
    } catch {
      if (signal.aborted) throw new Error("MyMemory 응답 시간이 초과되었습니다. 다시 시도해 주세요.");
      throw new Error("MyMemory에 연결할 수 없습니다. 인터넷 연결이나 브라우저의 차단 설정을 확인해 주세요.");
    }

    const body = await response.json().catch(() => null);
    const status = Number(body?.responseStatus) || response.status;
    if (body?.quotaFinished || status === 429 || response.status === 429) {
      throw new Error("MyMemory 무료 번역 한도에 도달했습니다. 나중에 다시 시도해 주세요.");
    }
    if (signal.aborted) throw new Error("MyMemory 응답 시간이 초과되었습니다. 다시 시도해 주세요.");
    if (!response.ok || status !== 200) {
      const code = response.ok ? status : response.status;
      if (code === 401 || code === 403) throw new Error(`MyMemory가 요청을 차단했습니다 (HTTP ${code}).`);
      if (code >= 500) throw new Error(`MyMemory 서버 오류 (${code})입니다. 나중에 다시 시도해 주세요.`);
      throw new Error(`MyMemory가 번역 요청을 처리하지 못했습니다 (${code}).`);
    }
    if (typeof body?.responseData?.translatedText !== "string" || !body.responseData.translatedText.trim()) {
      throw new Error("MyMemory가 유효한 번역을 반환하지 않았습니다.");
    }
    const decoder = document.createElement("textarea");
    decoder.innerHTML = body.responseData.translatedText.replaceAll("<", "&lt;");
    translations.push(decoder.value.trim());
  }
  return translations.join(" ");
}

async function translateSections(text, translate) {
  const sections = /^\s*shot\s+\d+\s*,/i.test(text)
    ? text.split(/((?:^|;)\s*shot\s+\d+\s*,\s*\d+\s*,\s*|;\s*$)/gi)
    : [text];
  for (let index = 0; index < sections.length; index += 2) {
    if (sections[index].trim()) {
      const translated = (await translate(sections[index].trim())).trim();
      if (!translated) throw new Error("번역 서비스가 빈 결과를 반환했습니다.");
      sections[index] = translated;
    }
  }
  return sections.join("").trim();
}

export async function translatePrompt(text) {
  const language = sourceLanguage(text.replace(klingReference, "").replace(/\bshot\s+\d+\s*,\s*\d+\s*,/gi, ""));
  if (globalThis.Translator) {
    let translator;
    try {
      const signal = AbortSignal.timeout(4000);
      translator = await globalThis.Translator.create({ sourceLanguage: language === "zh-CN" ? "zh" : language, targetLanguage: "en", signal });
      const translated = await translateSections(text, section => translator.translate(section, { signal }));
      return validateTranslation(text, translated);
    } catch {
    } finally {
      translator?.destroy();
    }
  }

  const signal = AbortSignal.timeout(15000);
  const translated = await translateSections(text, section => translateWithMyMemory(section, language, signal));
  return validateTranslation(text, translated);
}
