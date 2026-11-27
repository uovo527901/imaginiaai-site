const seedTranslations = {
  'g-war-cinematic': ['Trenches at Dawn', 'The front line wakes in the dawn mist. Distant gunfire, clouds of dust, and the faces of those who hold on to the end are captured in cinematic light.'],
  'g-war-pixar': ['Luca the Brave Soldier', 'Little soldier Luca overcomes his fears. Pixar’s warm textures and wide, expressive eyes capture his first step toward courage.'],
  'g-war-ghibli': ['The Girl Who Looks to the Sky', 'A girl looks up at the sky above the noise of war. A clear breeze and soft light in the style of Studio Ghibli quietly soothe her pain.'],
  'g-concert': ['Golden Concert', 'On a stage bathed in gold, tens of thousands of lights pulse to a single rhythm. This is the gallery’s featured work at its brightest.'],
  'g-star': ['STAR TOUR', 'An idol tour that follows the stars. Sparkling stage costumes and a cheering crowd light up the scene in Pixar style.'],
  'g-soccer-cinematic': ['Winning Goal at 90:02', 'Two seconds into stoppage time, everything stands still as the winning goal goes in. A cinematic moment of sweat, cheering, and unbridled joy.'],
  'g-soccer-pixar': ['Little Soccer Team', 'A big dream starts on a small field. The young players pick themselves up every time they fall, and their day shines with Pixar-style warmth.'],
  'g-fantasy': ['Forest Spirit', 'Deep in the woods, a glowing spirit awakens at night. A Ghibli-style breeze and green glow invite you into a mysterious world.'],
  'g-neon': ['Neon City', 'The future rises above a rain-soaked neon city. Reflected lights and airships weaving between skyscrapers bring this sci-fi world to life.'],
  'g-romance': ['Cherry Blossom Station', 'A promise begins at a small station where cherry blossoms drift. Spring light flickering past the train window captures the excitement between two people.'],
  'g-jungle': ['Jungle Explorers', 'A team pushes through vines and mist to find hidden treasure in an adventure full of Pixar’s playful energy.'],
  'g-baseball': ['Ballpark at Dusk', 'Tension builds in the final inning at a ballpark washed in twilight. A Ghibli-style sunset and breeze cast a warm glow on a moment of youth.'],
};

export function workText(work = {}) {
  return {
    title_ko: work.title_ko ?? work.title ?? '',
    title_en: work.title_en ?? '',
    description_ko: work.description_ko ?? (work.desc || work.title || ''),
    description_en: work.description_en ?? '',
  };
}

export function mergeWorkText(work, override) {
  const original = workText(work);
  const title = override?.title_ko ?? override?.title ?? original.title_ko;
  const description = override?.description_ko ?? override?.desc ?? original.description_ko;
  return {
    title_ko: title,
    title_en: override?.title_en ?? (title === original.title_ko ? original.title_en : ''),
    description_ko: description,
    description_en: override?.description_en ?? (description === original.description_ko ? original.description_en : ''),
  };
}

export function translateSeed(work) {
  const [title_en, description_en] = seedTranslations[work.id] ?? [];
  return { ...work, ...workText({ ...work, title_en, description_en }) };
}

export function galleryText(work, language) {
  const text = workText(work);
  return {
    title: (language === 'en' && text.title_en.trim()) || text.title_ko,
    desc: (language === 'en' && text.description_en.trim()) || text.description_ko,
  };
}

export function cleanWorkText(work) {
  const text = workText(work);
  return {
    title_ko: text.title_ko.trim(),
    title_en: text.title_en.trim(),
    description_ko: text.description_ko.trim(),
    description_en: text.description_en.trim(),
  };
}

export async function galleryRequest(action, fields) {
  const response = await fetch('/api/gallery', action ? {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...fields }),
  } : undefined);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return result;
}
