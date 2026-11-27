(function () {
  const storageKey = "imaginia_language";
  const languages = ["en", "ko", "ja", "zh", "fr"];
  const messages = {
    en: {
      languages: { en: "English", ko: "Korean", ja: "Japanese", zh: "Chinese", fr: "French" },
      pageTitle: "ImaginiaAI – AI Video Generator",
      primaryNav: "Primary navigation",
      heroBackground: "Hero background {current} / 4 · {label}",
      aiVideo: "AI Video",
      generator: "Generator",
      adminOn: " · ON",
      modes: { "Image to Video": "Image to Video", "Text to Video": "Text to Video", "Video to Video": "Video to Video", "Character Studio": "Character Studio", "Story Mode": "Story Mode" },
      styles: { Cinematic: "Cinematic", Pixar: "Pixar", Ghibli: "Ghibli", Realistic: "Realistic", Horror: "Horror", Action: "Action", Anime: "Anime" },
      plans: { Starter: "Starter", Creator: "Creator", Studio: "Studio" },
      textBadge: "TEXT",
      videoBadge: "VIDEO",
      character: "Character",
      characterBadge: "CHARACTER",
      storyBadge: "STORY",
      serverManaged: "SERVER-MANAGED",
      oneImage: "1 IMAGE",
      ratio: "Aspect ratio",
      portrait: "Portrait · Shorts / Reels",
      square: "Square · Feed",
      landscape: "Landscape · Cinema 16:9",
      conversionStyle: "Conversion style",
      pose: "Pose",
      consistency: "Consistency",
      consistencyEnabled: "Keep the same face, outfit, and expression in the next scene",
      consistencyDisabled: "Generate a new character for each scene",
      consistencyOn: "Consistency on",
      consistencyOff: "Consistency off",
      characterPreview: "Character preview · ",
      storyTimeline: "Story timeline · Total: ",
      storyPrompts: ["Opening — show the person", "Turn — the place and feeling change", "Climax — the movement explodes", "Ending — settle warmly"],
      exhibition: "MY EXHIBITION",
      genreFilter: "Genre filter",
      styleFilter: "Style filter",
      loginTitle: "Please log in",
      loginDescription: "Log in to create up to 3 videos a day.",
      email: "Email",
      password: "Password",
      login: "Log in",
      signup: "Sign up",
      close: "Close",
      loginRequired: "Please enter your email and password.",
      loggingIn: "Logging in…",
      loginSuccess: "You're logged in! You can create {count} videos today.",
      loginFailed: "Couldn't log in. Check your email and password.",
      loginTest: "You're logged in! (Test mode)",
      passwordLength: "Use at least 4 characters for your password.",
      signingUp: "Signing up…",
      signupSuccess: "You're signed up! You can create 3 videos today.",
      signupFailed: "Couldn't sign up. This email may already be registered.",
      signupTest: "You're signed up! (Test mode)",
      remaining: "{count} left today · Log out",
      logoutSuccess: "You're logged out.",
      dailyLimit: "You've used all 3 generations today. Please try again tomorrow.",
      promptRequired: "Please enter a prompt.",
      preparingImage: "Preparing your image…",
      imageReadFailed: "Couldn't read the image",
      generationStarted: "Generating video… 0/{max} — Started",
      generationProgress: "Generating video… {current}/{max} — Checking status",
      generationStartFailed: "Couldn't start generation. Please try again.",
      generationComplete: "Your video is ready!",
      generationFailed: "Generation failed. Please try again.",
      generationTimedOut: "This is taking longer than expected. Please wait a little longer.",
      generationError: "Something went wrong. Please try again.",
      memberManagement: "Member Management",
      adminLogin: "Admin Login",
      adminPasswordDescription: "Please enter the admin password.",
      adminPassword: "Admin password",
      adminEnter: "Continue",
      userList: "Registered Users",
      loading: "Loading…",
      refresh: "Refresh",
      backToSite: "Back to the site",
      adminPasswordRequired: "Please enter a password.",
      adminPasswordWrong: "Incorrect password.",
      userTotal: "Total registrations: {count}",
      userDate: "Joined: {date}",
      userCounts: "Created today: {today} · All time: {total}",
      noUsers: "Nobody has signed up yet.",
      usersFailed: "Couldn't load users. Please try again.",
      works: {
        "g-war-cinematic": ["Trenches at Dawn", "The front line wakes in the morning mist. Cinematic light captures distant artillery, clouds of dust, and the faces of those who hold on to the end."],
        "g-war-pixar": ["Luca the Brave Soldier", "Luca, a little soldier, overcomes his fear. Warm Pixar-style textures and wide eyes capture his first act of courage."],
        "g-war-ghibli": ["The Girl Looking Up", "A girl looks up at the sky above the noise of war. A clear breeze and gentle light lend the scene a quiet, Ghibli-inspired warmth."],
        "g-concert": ["Golden Concert", "Golden stage lights burst into view as thousands of lights move to one rhythm. The gallery's featured work captures the night's brightest moment."],
        "g-star": ["STAR TOUR", "An idol tour follows the stars, with glittering stage costumes and a cheering crowd in Pixar style."],
        "g-soccer-cinematic": ["Winning Goal 90:02", "Two seconds into the 90th minute, everything stops as the winning goal goes in. Sweat, cheers, and a burst of joy are captured in cinematic detail."],
        "g-soccer-pixar": ["The Little Soccer Team", "Big dreams start on a little pitch. A team that keeps getting back up shines with Pixar-style warmth."],
        "g-fantasy": ["Spirit of the Forest", "Deep in the woods, a glowing spirit wakes at night. Breezes and green light evoke a mysterious, Ghibli-inspired world."],
        "g-neon": ["Neon City", "The future rises above a rain-soaked neon city. Reflections and aircraft weaving between towers give this sci-fi scene its energy."],
        "g-romance": ["Cherry Blossom Station", "A promise begins at a small station surrounded by falling blossoms. Spring light passing the train window captures the excitement between two people."],
        "g-jungle": ["Jungle Explorers", "A team pushes through vines and mist in search of hidden treasure, bringing playful Pixar-style energy to the adventure."],
        "g-baseball": ["Ballpark at Dusk", "The final inning unfolds in a ballpark bathed in twilight. A Ghibli-inspired sunset and breeze lend warmth to this moment of youth."]
      }
    },
    ko: {
      languages: { en: "영어", ko: "한국어", ja: "일본어", zh: "중국어", fr: "프랑스어" },
      pageTitle: "ImaginiaAI – 인공지능 영상 생성기",
      primaryNav: "주 메뉴",
      heroBackground: "메인 배경 {current} / 4 · {label}",
      aiVideo: "인공지능 영상",
      generator: "생성기",
      adminOn: " · 켜짐",
      modes: { "Image to Video": "이미지로 영상 만들기", "Text to Video": "텍스트로 영상 만들기", "Video to Video": "영상 변환", "Character Studio": "캐릭터 스튜디오", "Story Mode": "스토리 모드" },
      styles: { Cinematic: "시네마틱", Pixar: "픽사", Ghibli: "지브리", Realistic: "실사", Horror: "공포", Action: "액션", Anime: "애니메이션" },
      plans: { Starter: "입문", Creator: "크리에이터", Studio: "스튜디오" },
      textBadge: "텍스트",
      videoBadge: "영상",
      character: "캐릭터",
      characterBadge: "캐릭터",
      storyBadge: "스토리",
      serverManaged: "서버에서 관리",
      oneImage: "이미지 1장",
      ratio: "화면 비율",
      portrait: "세로 · 쇼츠 / 릴스",
      square: "정사각 · 피드",
      landscape: "가로 · 시네마 16:9",
      conversionStyle: "변환 스타일",
      pose: "포즈",
      consistency: "일관성 유지",
      consistencyEnabled: "얼굴·의상·표정을 다음 컷에도 유지합니다",
      consistencyDisabled: "일관성 유지를 끄면 매 컷 새로 생성합니다",
      consistencyOn: "일관성 켜짐",
      consistencyOff: "일관성 꺼짐",
      characterPreview: "캐릭터 미리보기 · ",
      storyTimeline: "전체 스토리 타임라인 · 총 ",
      storyPrompts: ["시작 — 인물을 보여준다", "전환 — 장소와 감정이 바뀐다", "절정 — 움직임이 폭발한다", "마무리 — 따뜻하게 가라앉는다"],
      exhibition: "내 전시",
      genreFilter: "장르 필터",
      styleFilter: "스타일 필터",
      loginTitle: "로그인해 주세요",
      loginDescription: "로그인한 사람만 하루 3번까지 영상을 만들 수 있어요.",
      email: "이메일",
      password: "비밀번호",
      login: "로그인",
      signup: "회원가입",
      close: "닫기",
      loginRequired: "이메일과 비밀번호를 입력해 주세요.",
      loggingIn: "로그인 중…",
      loginSuccess: "로그인됐어요! 오늘 {count}번 만들 수 있어요.",
      loginFailed: "로그인 실패. 이메일이나 비밀번호를 확인해 주세요.",
      loginTest: "로그인됐어요! (테스트 모드)",
      passwordLength: "비밀번호는 4자 이상으로 해 주세요.",
      signingUp: "회원가입 중…",
      signupSuccess: "회원가입됐어요! 오늘 3번 만들 수 있어요.",
      signupFailed: "회원가입 실패. 이미 있는 이메일일 수 있어요.",
      signupTest: "회원가입됐어요! (테스트 모드)",
      remaining: "오늘 {count}번 남음 · 로그아웃",
      logoutSuccess: "로그아웃됐어요.",
      dailyLimit: "오늘은 3번 다 썼어요. 내일 다시 해주세요.",
      promptRequired: "프롬프트를 입력해 주세요.",
      preparingImage: "사진 준비 중…",
      imageReadFailed: "사진 읽기 실패",
      generationStarted: "진짜 영상 만드는 중… 0/{max} - 시작함",
      generationProgress: "진짜 영상 만드는 중… {current}/{max} - 확인 중",
      generationStartFailed: "시작 실패. 다시 해주세요.",
      generationComplete: "진짜 완성!",
      generationFailed: "실패했어요. 다시 해주세요.",
      generationTimedOut: "시간이 오래 걸려요. 조금 더 기다려 주세요.",
      generationError: "에러가 났어요. 다시 해주세요.",
      memberManagement: "회원관리",
      adminLogin: "관리자 로그인",
      adminPasswordDescription: "관리자 비밀번호를 입력해 주세요.",
      adminPassword: "관리자 비밀번호",
      adminEnter: "들어가기",
      userList: "가입한 사람 목록",
      loading: "불러오는 중…",
      refresh: "새로고침",
      backToSite: "사이트로 돌아가기",
      adminPasswordRequired: "비밀번호를 입력해 주세요.",
      adminPasswordWrong: "비밀번호가 틀렸어요.",
      userTotal: "총 {count}명 가입했어요",
      userDate: "가입: {date}",
      userCounts: "오늘 만든 횟수: {today}번 · 전체: {total}번",
      noUsers: "아직 가입한 사람이 없어요.",
      usersFailed: "불러오기 실패. 다시 해주세요.",
      works: {
        "g-war-cinematic": ["새벽의 참호", "새벽 안개 속에서 전선이 깨어나는 순간. 먼 포성과 흙먼지, 그리고 끝까지 버티는 사람들의 얼굴을 시네마틱한 빛으로 담았다."],
        "g-war-pixar": ["용감한 병사 루카", "두려움을 이겨낸 작은 병사 루카. 픽사 특유의 따뜻한 질감과 큰 눈망울로 용기의 첫걸음을 전한다."],
        "g-war-ghibli": ["하늘을 보는 소녀", "전쟁의 소음 위로 펼쳐진 하늘을 올려다보는 소녀. 지브리 특유의 맑은 바람과 빛이 아픔을 조용히 어루만진다."],
        "g-concert": ["골든 콘서트", "황금빛 조명이 터지는 무대 위, 수만 개의 빛이 하나의 리듬으로 모이는 밤. 전시장의 대표작으로 가장 화려하게 빛나는 순간."],
        "g-star": ["스타 투어", "별을 따라 떠나는 아이돌 투어. 반짝이는 무대 의상과 환호하는 관객이 픽사 스타일로 반짝인다."],
        "g-soccer-cinematic": ["결승골 90:02", "후반 90분 2초, 모든 것이 멈춘 순간 결승골이 터진다. 땀과 함성, 그리고 터져 나오는 환희를 시네마틱하게 포착했다."],
        "g-soccer-pixar": ["꼬마 축구단", "작은 운동장에서 시작된 큰 꿈. 넘어져도 다시 일어나는 꼬마 축구단의 하루가 픽사의 따뜻함으로 빛난다."],
        "g-fantasy": ["숲의 정령", "깊은 숲속, 빛나는 정령이 깨어나는 밤. 지브리 특유의 바람과 초록빛이 신비로운 세계로 초대한다."],
        "g-neon": ["네온 시티", "비를 맞은 네온 도시 위로 떠오르는 미래. 반사되는 빛과 고층 빌딩 사이를 가르는 비행선이 SF의 심장을 뛰게 한다."],
        "g-romance": ["벚꽃 역", "벚꽃잎이 흩날리는 작은 역에서 시작되는 약속. 기차 창밖으로 스치는 봄빛이 두 사람의 설렘을 전한다."],
        "g-jungle": ["정글 탐험대", "덩굴과 안개 속을 헤치는 정글 탐험대. 숨은 보물을 찾아 떠나는 모험이 픽사의 유쾌한 에너지로 가득하다."],
        "g-baseball": ["황혼의 야구장", "황혼빛이 물든 야구장, 마지막 이닝의 긴장감. 지브리의 노을과 바람이 청춘의 한 페이지를 따뜻하게 물들인다."]
      }
    }
  };
  const fallback = { ...messages.en, languages: { en: "English", ko: "한국어", ja: "日本語", zh: "中文", fr: "Français" } };

  function savedLanguage() {
    try {
      const stored = localStorage.getItem(storageKey);
      return languages.includes(stored) ? stored : null;
    } catch {
      return null;
    }
  }

  let language = savedLanguage() || "ko";
  const activeText = new WeakMap();

  function dictionary(locale = language) {
    return messages[locale] || fallback;
  }

  function translate(key, values, locale) {
    return dictionary(locale)[key].replace(/\{(\w+)\}/g, (match, name) => values?.[name] ?? match);
  }

  function setText(element, key, values) {
    if (!element) return;
    if (key) activeText.set(element, { key, values });
    else activeText.delete(element);
    element.textContent = key ? translate(key, values) : "";
  }

  function apply(root = document) {
    root.querySelectorAll("[data-i18n], [data-i18n-placeholder]").forEach((element) => {
      if (element.dataset.i18n) element.textContent = translate(element.dataset.i18n);
      if (element.dataset.i18nPlaceholder) element.placeholder = translate(element.dataset.i18nPlaceholder);
    });
    root.querySelectorAll("[data-i18n-live]").forEach((element) => {
      const message = activeText.get(element);
      if (message) setText(element, message.key, message.values);
    });
  }

  function setLanguage(next) {
    if (!languages.includes(next)) return;
    language = next;
    document.documentElement.lang = next;
    try {
      localStorage.setItem(storageKey, next);
    } catch {}
    apply();
    window.dispatchEvent(new Event("imaginia-languagechange"));
  }

  document.documentElement.lang = language;
  window.ImaginiaI18n = { dictionary, translate, setText, apply, savedLanguage, setLanguage, getLanguage: () => language };
})();
