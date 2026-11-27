const titleLabels = { title_ko: "제목 (한국어)", title_en: "Title (English)" };
const descriptionLabels = { description_ko: "설명 (한국어)", description_en: "Description (English)" };

export function galleryDraft(work = {}) {
  const legacyDescription = work.isUser ? work.desc || work.title : work.desc;
  return {
    title_ko: work.title_ko ?? work.title ?? "",
    title_en: work.title_en ?? "",
    description_ko: work.description_ko ?? legacyDescription ?? "",
    description_en: work.description_en ?? "",
  };
}

export function galleryDisplay(work, language) {
  const copy = galleryDraft(work);
  const english = language === "en";
  return {
    ...work,
    ...copy,
    title: english ? copy.title_en || copy.title_ko : copy.title_ko || copy.title_en,
    desc: english ? copy.description_en || copy.description_ko : copy.description_ko || copy.description_en,
  };
}

export function trimGalleryDraft(draft) {
  return Object.fromEntries(Object.entries(galleryDraft(draft)).map(([field, value]) => [field, value.trim()]));
}

export function galleryCopyInputs(jsx, jsxs, kind, prefix, draft, update, className) {
  const isTitle = kind === "title";
  return Object.entries(isTitle ? titleLabels : descriptionLabels).map(([field, label]) => {
    const id = `${prefix}-${field}`;
    return jsxs("div", {
      children: [
        jsx("label", { className: "text-xs text-[#9AAFC8]", htmlFor: id, children: label }),
        jsx(isTitle ? "input" : "textarea", {
          id,
          lang: field.endsWith("_ko") ? "ko" : "en",
          ...(!isTitle && { rows: 3 }),
          value: draft[field],
          onChange: (event) => update((previous) => ({ ...previous, [field]: event.target.value })),
          className,
        }),
      ],
    }, field);
  });
}

export function serializeGalleryWork(work) {
  const { id, genre, style, imageKey, likes, views, destination } = work;
  return { id, ...galleryDraft(work), genre, style, imageKey: imageKey || id, likes, views, destination: destination || "main" };
}
