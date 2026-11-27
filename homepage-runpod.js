// ============================================================
// homepage-runpod.js v5 - 사진 + 프롬프트 같이 보내기
// ============================================================

(function () {

  var RUNPOD_URL = "/actions";
  var POLL_MAX = 60;
  var POLL_MS = 10000;
  var i18n = window.ImaginiaI18n;

  // ------------------------------------------------------------
  // 1. 사진 파일 -> base64로 바꾸기
  // ------------------------------------------------------------
  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  // ------------------------------------------------------------
  // 2. RunPod에 보내기 - 사진 + 프롬프트 같이
  // ------------------------------------------------------------
  async function generateVideo(prompt, imageFile, statusEl, videoEl) {

    // 로그인 확인
    if (window.ImaginiaAuth && !window.ImaginiaAuth.isLoggedIn()) {
      window.ImaginiaAuth.showLoginModal();
      return;
    }

    if (!prompt) {
      alert(i18n.translate("promptRequired"));
      return;
    }

    i18n.setText(statusEl, "preparingImage");

    // 사진이 있으면 base64로 바꾸기
    var imageBase64 = null;
    if (imageFile) {
      try {
        imageBase64 = await fileToBase64(imageFile);
        // "data:image/jpeg;base64,...." 에서 앞부분 떼기
        if (imageBase64.indexOf(",") !== -1) {
          imageBase64 = imageBase64.split(",")[1];
        }
      } catch (e) {
        console.log(i18n.translate("imageReadFailed"), e);
      }
    }

    i18n.setText(statusEl, "generationStarted", { max: POLL_MAX });

    // 얼굴 지키는 프롬프트로 바꾸기
    var safePrompt = "The same person from the input image, keep the exact same face, same hairstyle, same clothes, do not change gender, do not change age, do not change identity. " + prompt + ". Only add gentle natural movement, keep her face exactly the same.";

    try {
      var res = await fetch(RUNPOD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "runpod.generate",
          args: {
            prompt: safePrompt,
            image_b64: imageBase64,
            size: "768x432",
            seconds: 3,
            fps: 24,
            seed: 42
          }
        })
      });

      var data = await res.json();
      var jobId = data.data && data.data.jobId;
      if (!jobId) {
        i18n.setText(statusEl, "generationStartFailed");
        return;
      }

      // 10초마다 확인하기
      for (var i = 1; i <= POLL_MAX; i++) {
        await new Promise(function (r) { setTimeout(r, POLL_MS); });
        i18n.setText(statusEl, "generationProgress", { current: i, max: POLL_MAX });

        var s = await fetch(RUNPOD_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "runpod.status", args: { jobId: jobId } })
        });
        var sd = await s.json();
        var st = sd.data && sd.data.status;
        var out = sd.data && sd.data.output;

        if (st === "COMPLETED" && out) {
          var videoUrl = null;
          if (out.video) videoUrl = out.video;
          if (out.data_b64) videoUrl = "data:video/mp4;base64," + out.data_b64;
          if (out.url) videoUrl = out.url;

          if (videoEl && videoUrl) {
            videoEl.src = videoUrl;
            videoEl.style.display = "block";
            videoEl.play();
          }
          i18n.setText(statusEl, "generationComplete");
          return;
        }

        if (st === "FAILED") {
          i18n.setText(statusEl, "generationFailed");
          return;
        }
      }

      i18n.setText(statusEl, "generationTimedOut");

    } catch (e) {
      console.log(e);
      i18n.setText(statusEl, "generationError");
    }
  }

  // ------------------------------------------------------------
  // 3. 홈페이지 버튼에 연결하기
  // ------------------------------------------------------------
  document.addEventListener("click", async function (e) {
    var btn = e.target.closest?.("button[data-imaginia-runpod]");
    if (!btn || btn.disabled || e.defaultPrevented) return;
    e.preventDefault();
    e.stopPropagation();

    // 프롬프트 입력창 찾기
    var promptInput = document.getElementById("prompt");
    var prompt = promptInput ? promptInput.value : "";
    if (!prompt) {
      prompt = "smiles gently and waves";
    }

    // 사진 입력창 찾기
    var fileInput = document.querySelector('input[type="file"]');
    var file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;

    // 상태, 비디오 찾기
    var statusEl = document.getElementById("imaginia-status") || document.querySelector("[data-status]");
    var videoEl = document.querySelector("video");

    // 상태가 없으면 만들기
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.id = "imaginia-status";
      statusEl.style.cssText = "margin:12px 0;font-size:14px;color:#111;";
      btn.parentNode.insertBefore(statusEl, btn.nextSibling);
    }
    statusEl.setAttribute("data-i18n-live", "");
    if (!videoEl) {
      videoEl = document.createElement("video");
      videoEl.controls = true;
      videoEl.style.cssText = "width:100%;max-width:640px;margin-top:12px;display:none;border-radius:12px;";
      btn.parentNode.insertBefore(videoEl, statusEl.nextSibling);
    }

    await generateVideo(prompt, file, statusEl, videoEl);
  }, true);

})();
