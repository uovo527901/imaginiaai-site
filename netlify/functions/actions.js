// ============================================================
// netlify/functions/actions.js
// 로그인 + 회원가입 + 관리자 목록 + RunPod
// blobs 없이 - 메모리 저장
// ============================================================

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || "";
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || "";
const RUNPOD_BASE = "https://api.runpod.ai/v2/" + RUNPOD_ENDPOINT_ID;
const { hasGallerySession } = require("../lib/gallery-session.js");

let USERS = {};
let ALL_EMAILS = [];

function json(status, data) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ data: data })
  };
}

function todayKey() {
  var d = new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function hashPassword(pw) {
  var h = 0;
  for (var i = 0; i < pw.length; i++) {
    h = (h * 31 + pw.charCodeAt(i)) >>> 0;
  }
  return "h" + h + "_" + pw.length;
}

exports.handler = async function (event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return json(200, { ok: true });
    }

    var body = {};
    try { body = JSON.parse(event.body || "{}"); } catch (e) { body = {}; }
    var action = body.action || "";
    var args = body.args || {};

    if (action === "gallery.list" || action === "gallery.save") {
      if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
      if (action === "gallery.save" && !hasGallerySession(event.headers)) {
        return json(401, { error: "Administrator login required" });
      }
      const value = args.value;
      if (action === "gallery.save" && (!Array.isArray(value?.userWorks) || !value.overrides || typeof value.overrides !== "object" || Array.isArray(value.overrides))) {
        return json(400, { error: "Invalid gallery state" });
      }
      try {
        const { readGallery, saveGallery } = await import("../lib/gallery-state.mjs");
        if (action === "gallery.list") return json(200, await readGallery());

        await saveGallery({ userWorks: value.userWorks, overrides: value.overrides });
        return json(200, { ok: true });
      } catch {
        return json(500, { error: "Gallery storage unavailable" });
      }
    }

    if (action === "auth.signup") {
      var email = (args.email || "").trim().toLowerCase();
      var password = args.password || "";
      if (!email || !password) return json(200, { ok: false, error: "empty" });
      if (USERS[email]) return json(200, { ok: false, error: "exists" });
      var user = {
        email: email,
        password: hashPassword(password),
        createdAt: new Date().toISOString(),
        totalCount: 0,
        today: todayKey(),
        todayCount: 0
      };
      USERS[email] = user;
      if (ALL_EMAILS.indexOf(email) === -1) ALL_EMAILS.push(email);
      return json(200, { ok: true, token: "tok_" + email, email: email });
    }

    if (action === "auth.login") {
      var email2 = (args.email || "").trim().toLowerCase();
      var pw2 = args.password || "";
      var u = USERS;
      if (!u) return json(200, { ok: false, error: "notfound" });
      if (u.password !== hashPassword(pw2)) return json(200, { ok: false, error: "wrong" });
      return json(200, { ok: true, token: "tok_" + email2, email: email2 });
    }

    if (action === "admin.list_users") {
      var users = [];
      for (var i = 0; i < ALL_EMAILS.length; i++) {
        var one = USERS[ALL_EMAILS[i]];
        if (one) {
          users.push({
            email: one.email,
            createdAt: one.createdAt,
            totalCount: one.totalCount || 0,
            today: one.today,
            todayCount: one.todayCount || 0
          });
        }
      }
      users.sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
      return json(200, { ok: true, users: users, total: users.length });
    }

    if (action === "runpod.generate") {
      if (!RUNPOD_API_KEY) return json(200, { ok: false, error: "no_key" });
      var prompt = args.prompt || "";
      var image_b64 = args.image_b64 || null;
      var input = {
        prompt: prompt,
        size: args.size || "768x432",
        seconds: args.seconds || 3,
        fps: args.fps || 24,
        seed: args.seed || 42
      };
      if (image_b64) {
        input.image = image_b64;
        input.image_b64 = image_b64;
      }
      var r = await fetch(RUNPOD_BASE + "/run", {
        method: "POST",
        headers: { "Authorization": "Bearer " + RUNPOD_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ input: input })
      });
      var d = await r.json();
      return json(200, { jobId: d.id || d.jobId, status: d.status });
    }

    if (action === "runpod.status") {
      var jobId = args.jobId || "";
      if (!jobId) return json(200, { ok: false });
      var r2 = await fetch(RUNPOD_BASE + "/status/" + jobId, {
        headers: { "Authorization": "Bearer " + RUNPOD_API_KEY }
      });
      var d2 = await r2.json();
      return json(200, { status: d2.status, output: d2.output });
    }

    return json(200, { ok: false, error: "unknown_action" });

  } catch (e) {
    console.log(e);
    return json(500, { ok: false, error: String(e) });
  }
};
