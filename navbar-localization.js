export const navbarTranslations = {
  ko: {
    navStudio: "스튜디오", navModes: "모드", navGallery: "갤러리", navPricing: "요금제",
    navHow: "사용법", navAdmin: "관리자", navAdminOn: "켜짐", navLogin: "로그인",
    navTry: "ImaginiaAI 체험하기", navGoStudio: "스튜디오로 이동", navLogout: "로그아웃",
    navLoggedIn: "로그인됨", navRemaining: (count) => `오늘 ${count}번 남음`,
    navPrimary: "주 메뉴", languageLabel: "언어"
  },
  en: {
    navStudio: "Studio", navModes: "Modes", navGallery: "Gallery", navPricing: "Pricing",
    navHow: "How it works", navAdmin: "Admin", navAdminOn: "ON", navLogin: "Login",
    navTry: "Try ImaginiaAI", navGoStudio: "Go to Studio", navLogout: "Log out",
    navLoggedIn: "Signed in", navRemaining: (count) => `${count} left today`,
    navPrimary: "Primary", languageLabel: "Language"
  },
  ja: {
    navStudio: "スタジオ", navModes: "モード", navGallery: "ギャラリー", navPricing: "料金",
    navHow: "使い方", navAdmin: "管理者", navAdminOn: "オン", navLogin: "ログイン",
    navTry: "ImaginiaAIを試す", navGoStudio: "スタジオへ移動", navLogout: "ログアウト",
    navLoggedIn: "ログイン中", navRemaining: (count) => `本日あと${count}回`,
    navPrimary: "メインメニュー", languageLabel: "言語"
  },
  zh: {
    navStudio: "工作室", navModes: "模式", navGallery: "画廊", navPricing: "定价",
    navHow: "使用方法", navAdmin: "管理员", navAdminOn: "已开启", navLogin: "登录",
    navTry: "体验 ImaginiaAI", navGoStudio: "前往工作室", navLogout: "退出登录",
    navLoggedIn: "已登录", navRemaining: (count) => `今日剩余${count}次`,
    navPrimary: "主菜单", languageLabel: "语言"
  },
  fr: {
    navStudio: "Studio", navModes: "Modes", navGallery: "Galerie", navPricing: "Tarifs",
    navHow: "Comment ça marche", navAdmin: "Admin", navAdminOn: "ACTIF", navLogin: "Connexion",
    navTry: "Essayer ImaginiaAI", navGoStudio: "Aller au Studio", navLogout: "Déconnexion",
    navLoggedIn: "Connecté", navRemaining: (count) => `Aujourd’hui : ${count}`,
    navPrimary: "Menu principal", languageLabel: "Langue"
  }
};

const cacheKey = "imaginia_navbar_language";
const browserCookie = "imaginia_language_browser";
const preferenceUrl = "/.netlify/functions/navbar-language";

export function cachedNavbarLanguage() {
  try {
    const language = sessionStorage.getItem(cacheKey);
    if (Object.hasOwn(navbarTranslations, language)) return language;
  } catch {}
  return null;
}

function cacheNavbarLanguage(language) {
  try {
    sessionStorage.setItem(cacheKey, language);
  } catch {}
}

function hasLanguageBrowser() {
  return document.cookie.split(";").some((cookie) => cookie.trim().startsWith(`${browserCookie}=`));
}

export async function loadNavbarLanguage() {
  if (!hasLanguageBrowser()) return null;
  const response = await fetch(preferenceUrl);
  if (!response.ok) return null;
  const { language } = await response.json();
  if (!Object.hasOwn(navbarTranslations, language)) return null;
  if (!cachedNavbarLanguage()) cacheNavbarLanguage(language);
  return language;
}

export async function rememberNavbarLanguage(language) {
  cacheNavbarLanguage(language);
  if (!hasLanguageBrowser()) {
    document.cookie = `${browserCookie}=${crypto.randomUUID()}; Max-Age=31536000; Path=/; Secure; SameSite=Lax`;
  }
  return fetch(preferenceUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language }),
    keepalive: true
  });
}
