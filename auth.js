// ============================================================
// auth.js - 로그인 + 하루 3번 제한
// ============================================================

(function () {

  var API = "/actions";

  // ------------------------------------------------------------
  // 1. 지금 로그인했는지 확인하기
  // ------------------------------------------------------------
  function getUser() {
    try {
      var s = localStorage.getItem("imaginia_user");
      if (!s) return null;
      return JSON.parse(s);
    } catch (e) {
      return null;
    }
  }

  function saveUser(user) {
    localStorage.setItem("imaginia_user", JSON.stringify(user));
  }

  function clearUser() {
    localStorage.removeItem("imaginia_user");
  }

  function isLoggedIn() {
    var u = getUser();
    return !!(u && u.email);
  }

  // ------------------------------------------------------------
  // 2. 오늘 몇 번 만들었는지 확인하기
  // ------------------------------------------------------------
  function getTodayKey() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function getTodayCount(email) {
    var key = "imaginia_count_" + email + "_" + getTodayKey();
    var v = localStorage.getItem(key);
    if (!v) return 0;
    return parseInt(v, 10) || 0;
  }

  function addTodayCount(email) {
    var key = "imaginia_count_" + email + "_" + getTodayKey();
    var c = getTodayCount(email) + 1;
    localStorage.setItem(key, String(c));
    return c;
  }

  function canGenerate() {
    var u = getUser();
    if (!u) {
      return { ok: false, reason: "login" };
    }
    var c = getTodayCount(u.email);
    if (c >= 3) {
      return { ok: false, reason: "limit", count: c };
    }
    return { ok: true, count: c };
  }

  // ------------------------------------------------------------
  // 3. 로그인창 보여주기
  // ------------------------------------------------------------
  function showLoginModal() {
    var old = document.getElementById("imaginia-login-modal");
    if (old) {
      old.style.display = "flex";
      return;
    }

    var modal = document.createElement("div");
    modal.id = "imaginia-login-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;";

    modal.innerHTML =
      '<div style="background:#fff;border-radius:16px;padding:28px;max-width:400px;width:100%;color:#111;">' +
      '<h2 style="font-size:22px;margin:0 0 8px 0;">로그인해 주세요</h2>' +
      '<p style="font-size:14px;color:#555;margin:0 0 16px 0;">로그인한 사람만 하루 3번까지 영상을 만들 수 있어요.</p>' +
      '<label style="font-size:14px;">이메일</label>' +
      '<input id="imaginia-email" type="email" placeholder="email@example.com" style="width:100%;padding:12px;margin:6px 0 12px 0;border:1px solid #ddd;border-radius:8px;font-size:15px;box-sizing:border-box;" />' +
      '<label style="font-size:14px;">비밀번호</label>' +
      '<input id="imaginia-password" type="password" placeholder="비밀번호" style="width:100%;padding:12px;margin:6px 0 16px 0;border:1px solid #ddd;border-radius:8px;font-size:15px;box-sizing:border-box;" />' +
      '<button id="imaginia-login-btn" style="width:100%;padding:13px;background:#7c3aed;color:#fff;border:0;border-radius:10px;font-size:16px;cursor:pointer;">로그인</button>' +
      '<button id="imaginia-signup-btn" style="width:100%;padding:13px;margin-top:8px;background:#fff;color:#7c3aed;border:1px solid #7c3aed;border-radius:10px;font-size:16px;cursor:pointer;">회원가입</button>' +
      '<p id="imaginia-auth-msg" style="font-size:13px;color:#e11d48;min-height:18px;margin:12px 0 0 0;text-align:center;"></p>' +
      '<button id="imaginia-close-btn" style="width:100%;padding:10px;margin-top:8px;background:transparent;border:0;color:#666;font-size:14px;cursor:pointer;">닫기</button>' +
      '</div>';

    document.body.appendChild(modal);

    document.getElementById("imaginia-close-btn").onclick = function () {
      modal.style.display = "none";
    };

    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });

    document.getElementById("imaginia-login-btn").onclick = async function () {
      var email = document.getElementById("imaginia-email").value.trim();
      var pw = document.getElementById("imaginia-password").value;
      var msg = document.getElementById("imaginia-auth-msg");
      if (!email || !pw) {
        msg.textContent = "이메일과 비밀번호를 입력해 주세요.";
        return;
      }
      msg.textContent = "로그인 중...";
      try {
        var res = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "auth.login", args: { email: email, password: pw } })
        });
        var data = await res.json();
        if (data.data && data.data.ok) {
          saveUser({ email: email, token: data.data.token });
          msg.textContent = "";
          modal.style.display = "none";
          updateLoginUI();
          alert("로그인됐어요! 오늘 " + (3 - getTodayCount(email)) + "번 만들 수 있어요.");
        } else {
          msg.textContent = "로그인 실패. 이메일이나 비밀번호를 확인해 주세요.";
        }
      } catch (e) {
        saveUser({ email: email, token: "local" });
        modal.style.display = "none";
        updateLoginUI();
        alert("로그인됐어요! (테스트 모드)");
      }
    };

    document.getElementById("imaginia-signup-btn").onclick = async function () {
      var email = document.getElementById("imaginia-email").value.trim();
      var pw = document.getElementById("imaginia-password").value;
      var msg = document.getElementById("imaginia-auth-msg");
      if (!email || !pw) {
        msg.textContent = "이메일과 비밀번호를 입력해 주세요.";
        return;
      }
      if (pw.length < 4) {
        msg.textContent = "비밀번호는 4자 이상으로 해 주세요.";
        return;
      }
      msg.textContent = "회원가입 중...";
      try {
        var res = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "auth.signup", args: { email: email, password: pw } })
        });
        var data = await res.json();
        if (data.data && data.data.ok) {
          saveUser({ email: email, token: data.data.token });
          msg.textContent = "";
          modal.style.display = "none";
          updateLoginUI();
          alert("회원가입됐어요! 오늘 3번 만들 수 있어요.");
        } else {
          msg.textContent = "회원가입 실패. 이미 있는 이메일일 수 있어요.";
        }
      } catch (e) {
        saveUser({ email: email, token: "local" });
        modal.style.display = "none";
        updateLoginUI();
        alert("회원가입됐어요! (테스트 모드)");
      }
    };
  }

  // ------------------------------------------------------------
  // 4. 로그인 버튼 UI 업데이트하기
  // ------------------------------------------------------------
  function updateLoginUI() {
    var u = getUser();
    var btn = document.getElementById("imaginia-login-top-btn");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "imaginia-login-top-btn";
      btn.style.cssText = "position:fixed;top:16px;right:16px;z-index:9999;background:#111;color:#fff;border:0;border-radius:999px;padding:10px 16px;font-size:14px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.2);";
      document.body.appendChild(btn);
    }
    if (u) {
      var left = 3 - getTodayCount(u.email);
      if (left < 0) left = 0;
      btn.textContent = u.email + " · 오늘 " + left + "번 남음 · 로그아웃";
      btn.onclick = function () {
        clearUser();
        updateLoginUI();
        alert("로그아웃됐어요.");
      };
    } else {
      btn.textContent = "로그인";
      btn.onclick = function () {
        showLoginModal();
      };
    }
  }

  // ------------------------------------------------------------
  // 5. Generate 버튼을 가로채기
  // ------------------------------------------------------------
  function protectGenerate() {
    document.addEventListener("click", function (e) {
      var target = e.target;
      if (!target) return;
      var text = (target.textContent || "").toLowerCase();
      var isGenerate = text.indexOf("generate") !== -1;
      if (!isGenerate) return;

      var check = canGenerate();
      if (!check.ok && check.reason === "login") {
        e.preventDefault();
        e.stopPropagation();
        showLoginModal();
        return;
      }
      if (!check.ok && check.reason === "limit") {
        e.preventDefault();
        e.stopPropagation();
        alert("오늘은 3번 다 썼어요. 내일 다시 해주세요.");
        return;
      }

      var u = getUser();
      if (u) {
        addTodayCount(u.email);
        updateLoginUI();
      }
    }, true);
  }

  // ------------------------------------------------------------
  // 6. 시작하기
  // ------------------------------------------------------------
  window.addEventListener("load", function () {
    updateLoginUI();
    protectGenerate();
  });

  window.ImaginiaAuth = {
    getUser: getUser,
    isLoggedIn: isLoggedIn,
    showLoginModal: showLoginModal,
    canGenerate: canGenerate
  };

})();
