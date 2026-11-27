const { createHash, timingSafeEqual } = require("node:crypto");

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || "";
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || "";

if (!global.__users) global.__users = [];

function json(statusCode, payload, headers = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      ...headers,
    },
    body: JSON.stringify(payload),
  };
}

function success(data) {
  return json(200, { ok: true, data: { ok: true, ...data } });
}

function failure(statusCode, error, cause) {
  console.log("[actions]", statusCode, error, ...(cause instanceof Error ? [cause.constructor.name] : []));
  return json(statusCode, { ok: false, error });
}

function adminCookie(event) {
  return event.headers?.cookie ?? event.headers?.Cookie ?? "";
}

async function handleAdminLogin(args) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return failure(503, "ADMIN_PASSWORD가 Netlify에 없어요.");

  const digest = (value) => createHash("sha256").update(value, "utf16le").digest();
  if (typeof args.password !== "string" || !timingSafeEqual(digest(args.password), digest(password))) {
    return failure(401, "비밀번호가 틀렸어요.");
  }

  const { getAdminCredentials, startSession } = await import("./gallery.mjs");
  const { key, passwordHash } = await getAdminCredentials();
  const cookie = startSession(key, passwordHash).headers.get("set-cookie");
  return json(200, { ok: true }, { "Set-Cookie": cookie });
}

async function handleAdminPassword(event, args) {
  const { default: gallery } = await import("./gallery.mjs");
  const response = await gallery(new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie(event) },
    body: JSON.stringify({
      action: "change-password",
      password: args.password,
      newPassword: args.newPassword,
    }),
  }));
  if (response.status === 401) return failure(401, "비밀번호가 틀렸거나 관리자 세션이 만료됐어요.");
  if (response.status === 400) return failure(400, "새 비밀번호를 확인해 주세요.");
  if (response.status === 503) return failure(503, "관리자 비밀번호가 설정되지 않았어요.");
  if (!response.ok) return failure(500, "관리자 요청을 처리하지 못했어요.");

  const cookie = response.headers.get("set-cookie");
  return json(200, { ok: true }, cookie ? { "Set-Cookie": cookie } : {});
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return json(200, { ok: true }, { "Access-Control-Allow-Headers": "Content-Type" });
    }
    if (event.httpMethod !== "POST") return failure(405, "POST 요청만 사용할 수 있어요.");

    let body;
    try {
      body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body);
    } catch {
      return failure(400, "올바른 JSON 요청을 보내 주세요.");
    }
    const { action, args = {} } = body ?? {};
    if (typeof action !== "string" || !args || typeof args !== "object" || Array.isArray(args)) {
      return failure(400, "요청 형식을 확인해 주세요.");
    }

    // 회원가입
    if (action === "auth.signup") {
      const email = typeof args.email === "string" ? args.email.trim().toLowerCase() : "";
      const password = args.password || "";
      if (!email || !password) return failure(400, "이메일과 비밀번호를 입력해 주세요.");
      const exists = global.__users.find(u => u.email === email);
      if (exists) return failure(200, "이미 있는 이메일이에요.");
      const user = { email, password, createdAt: new Date().toISOString(), totalCount: 0, todayKey: todayKey(), todayCount: 0 };
      global.__users.push(user);
      return success({ token: "token-" + email });
    }

    // 로그인
    if (action === "auth.login") {
      const email = typeof args.email === "string" ? args.email.trim().toLowerCase() : "";
      const password = args.password || "";
      const user = global.__users.find(u => u.email === email);
      if (!user) return failure(200, "없는 이메일이에요.");
      if (user.password !== password) return failure(200, "비밀번호가 틀렸어요.");
      return success({ token: "token-" + email });
    }

    if (action === "admin.login") return await handleAdminLogin(args);
    if (action === "admin.set_password") {
      return await handleAdminPassword(event, args);
    }

    // 가입한 사람 목록
    if (action === "admin.list_users") {
      const { hasAdminSession } = await import("./gallery.mjs");
      if (!await hasAdminSession(adminCookie(event))) return failure(401, "관리자 로그인이 필요해요.");
      const users = global.__users.map(u => ({
        email: u.email,
        createdAt: u.createdAt,
        todayCount: u.todayKey === todayKey() ? u.todayCount : 0,
        totalCount: u.totalCount || 0,
      }));
      return success({ users });
    }

    // 영상 만들기 - RunPod
    if (action === "generate") {
      if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) return failure(200, "RunPod 키가 설정이 안 됐어요.");
      return success({ message: "RunPod 호출 준비됨" });
    }

    return failure(400, "지원하지 않는 요청이에요.");
  } catch (error) {
    return failure(500, "서버에서 요청을 처리하지 못했어요.", error);
  }
};
