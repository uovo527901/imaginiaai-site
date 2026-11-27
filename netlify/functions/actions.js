// netlify/functions/actions.js
// 비밀번호는 해시 안 쓰고, Netlify에 있는 ADMIN_PASSWORD랑 직접 비교해

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || "";
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

if (!global.__users) global.__users = [];

function json(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ data }),
  };
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" }, body: "" };
  }
  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch (e) { body = {}; }
  const action = body.action || "";
  const args = body.args || {};

  // 회원가입
  if (action === "auth.signup") {
    const email = (args.email || "").trim().toLowerCase();
    const password = args.password || "";
    if (!email || !password) return json(400, { ok: false, message: "이메일과 비밀번호를 입력해 주세요." });
    const exists = global.__users.find(u => u.email === email);
    if (exists) return json(200, { ok: false, message: "이미 있는 이메일이에요." });
    const user = { email, password, createdAt: new Date().toISOString(), totalCount: 0, todayKey: todayKey(), todayCount: 0 };
    global.__users.push(user);
    return json(200, { ok: true, token: "token-" + email });
  }

  // 로그인
  if (action === "auth.login") {
    const email = (args.email || "").trim().toLowerCase();
    const password = args.password || "";
    const user = global.__users.find(u => u.email === email);
    if (!user) return json(200, { ok: false, message: "없는 이메일이에요." });
    if (user.password !== password) return json(200, { ok: false, message: "비밀번호가 틀렸어요." });
    return json(200, { ok: true, token: "token-" + email });
  }

  // 관리자 로그인 - ADMIN_PASSWORD랑 직접 비교, 해시 안 씀
  if (action === "admin.login") {
    const pw = args.password || "";
    if (!ADMIN_PASSWORD) return json(200, { ok: false, message: "관리자 비밀번호가 설정이 안 됐어요. Netlify에 ADMIN_PASSWORD를 넣어주세요." });
    if (pw === ADMIN_PASSWORD) return json(200, { ok: true });
    return json(200, { ok: false, message: "비밀번호가 틀렸어요." });
  }

  // 가입한 사람 목록
  if (action === "admin.list_users") {
    const users = global.__users.map(u => ({
      email: u.email,
      createdAt: u.createdAt,
      todayCount: u.todayKey === todayKey() ? u.todayCount : 0,
      totalCount: u.totalCount || 0,
    }));
    return json(200, { users });
  }

  // 영상 만들기 - RunPod
  if (action === "generate") {
    if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
      return json(200, { ok: false, message: "RunPod 키가 설정이 안 됐어요." });
    }
    return json(200, { ok: true, message: "RunPod 호출 준비됨" });
  }

  return json(200, { ok: false, message: "알 수 없는 action: " + action });
};
