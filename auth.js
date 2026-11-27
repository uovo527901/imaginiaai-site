// ============================================================
// auth.js - 로그인 + 하루 3번 제한
// 메뉴바에 있는 로그인 버튼만 사용하기 - 까만 버튼 안 만듦
// ============================================================

(function () {

  var API = "/.netlify/functions/actions";
  var i18n = window.ImaginiaI18n;

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
    window.dispatchEvent(new Event("imaginia-authchange"));
  }

  function clearUser() {
    localStorage.removeItem("imaginia_user");
    window.dispatchEvent(new Event("imaginia-authchange"));
  }

  function isLoggedIn() {
    var u = getUser();
    return !!(u && u.email);
  }

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
      '<h2 data-i18n="loginTitle" style="font-size:22px;margin:0 0 8px 0;"></h2>' +
      '<p data-i18n="loginDescription" style="font-size:14px;color:#555;margin:0 0 16px 0;"></p>' +
      '<label data-i18n="email" style="font-size:14px;"></label>' +
      '<input id="imaginia-email" type="email" placeholder="email@example.com" style="width:100%;padding:12px;margin:6px 0 12px 0;border:1px solid #ddd;border-radius:8px;font-size:15px;box-sizing:border-box;" />' +
      '<label data-i18n="password" style="font-size:14px;"></label>' +
      '<input id="imaginia-password" type="password" data-i18n-placeholder="password" style="width:100%;padding:12px;margin:6px 0 16px 0;border:1px solid #ddd;border-radius:8px;font-size:15px;box-sizing:border-box;" />' +
      '<button id="imaginia-login-btn" data-i18n="login" style="width:100%;padding:13px;background:#7c3aed;color:#fff;border:0;border-radius:10px;font-size:16px;cursor:pointer;"></button>' +
      '<button id="imaginia-signup-btn" data-i18n="signup" style="width:100%;padding:13px;margin-top:8px;background:#fff;color:#7c3aed;border:1px solid #7c3aed;border-radius:10px;font-size:16px;cursor:pointer;"></button>' +
      '<p id="imaginia-auth-msg" data-i18n-live style="font-size:13px;color:#e11d48;min-height:18px;margin:12px 0 0 0;text-align:center;"></p>' +
      '<button id="imaginia-close-btn" data-i18n="close" style="width:100%;padding:10px;margin-top:8px;background:transparent;border:0;color:#666;font-size:14px;cursor:pointer;"></button>' +
      '</div>';

    document.body.appendChild(modal);
    i18n.apply(modal);

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
        i18n.setText(msg, "loginRequired");
        return;
      }
      i18n.setText(msg, "loggingIn");
      try {
        var res = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "auth.login", args: { email: email, password: pw } })
        });
        var data = await res.json();
        if (data.data && data.data.ok) {
          saveUser({ email: email, token: data.data.token });
          i18n.setText(msg);
          modal.style.display = "none";
          alert(i18n.translate("loginSuccess", { count: getRemainingCount() }));
        } else {
          i18n.setText(msg, "loginFailed");
        }
      } catch (e) {
        saveUser({ email: email, token: "local" });
        modal.style.display = "none";
        alert(i18n.translate("loginTest"));
      }
    };

    document.getElementById("imaginia-signup-btn").onclick = async function () {
      var email = document.getElementById("imaginia-email").value.trim();
      var pw = document.getElementById("imaginia-password").value;
      var msg = document.getElementById("imaginia-auth-msg");
      if (!email || !pw) {
        i18n.setText(msg, "loginRequired");
        return;
      }
      if (pw.length < 4) {
        i18n.setText(msg, "passwordLength");
        return;
      }
      i18n.setText(msg, "signingUp");
      try {
        var res = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "auth.signup", args: { email: email, password: pw } })
        });
        var data = await res.json();
        if (data.data && data.data.ok) {
          saveUser({ email: email, token: data.data.token });
          i18n.setText(msg);
          modal.style.display = "none";
          alert(i18n.translate("signupSuccess"));
        } else {
          i18n.setText(msg, "signupFailed");
        }
      } catch (e) {
        saveUser({ email: email, token: "local" });
        modal.style.display = "none";
        alert(i18n.translate("signupTest"));
      }
    };
  }

  function getRemainingCount() {
    var user = getUser();
    return user ? Math.max(0, 3 - getTodayCount(user.email)) : null;
  }

  function logout() {
    clearUser();
    alert(i18n.translate("logoutSuccess"));
  }

  function protectGenerate() {
    document.addEventListener("click", function (e) {
      var button = e.target.closest?.("button[data-imaginia-generate]");
      if (!button || button.disabled) return;

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
        alert(i18n.translate("dailyLimit"));
        return;
      }

      var u = getUser();
      if (u) {
        addTodayCount(u.email);
        window.dispatchEvent(new Event("imaginia-authchange"));
      }
    }, true);
  }

  protectGenerate();

  window.ImaginiaAuth = {
    getUser: getUser,
    getRemainingCount: getRemainingCount,
    isLoggedIn: isLoggedIn,
    showLoginModal: showLoginModal,
    logout: logout,
    canGenerate: canGenerate
  };

})();
