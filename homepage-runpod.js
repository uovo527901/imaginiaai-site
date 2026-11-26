// ============================================================
// homepage-runpod.js - v3
// blob: 사진도 찾게 했어. RunPod가 시작되면 화면에 표시해.
// ============================================================

(function () {

  var alreadyStarted = false;
  var lastImage = "";
  var lastPrompt = "";

  function showMsg(msg) {
    var el = document.getElementById("runpod-msg");
    if (!el) {
      el = document.createElement("div");
      el.id = "runpod-msg";
      el.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#7c3aed;color:#fff;padding:12px 20px;border-radius:999px;font-size:15px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3);";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = "block";
  }

  // ------------------------------------------------------------
  // 1. 사진을 512px로 작게 만들기
  // ------------------------------------------------------------
  function compressImage(dataUrl, callback) {
    var img = new Image();
    img.onload = function () {
      var max = 512;
      var w = img.width;
      var h = img.height;
      if (w > max || h > max) {
        var s = Math.min(max / w, max / h);
        w = Math.round(w * s);
        h = Math.round(h * s);
      }
      var c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      var small = c.toDataURL("image/jpeg", 0.7);
      callback(small);
    };
    img.src = dataUrl;
  }

  // ------------------------------------------------------------
  // 2. blob: 주소를 data: 주소로 바꾸기
  // ------------------------------------------------------------
  function blobToDataUrl(blobUrl, callback) {
    fetch(blobUrl).then(function (r) {
      return r.blob();
    }).then(function (blob) {
      var reader = new FileReader();
      reader.onload = function () {
        callback(reader.result);
      };
      reader.readAsDataURL(blob);
    }).catch(function () {
      callback(null);
    });
  }

  // ------------------------------------------------------------
  // 3. RunPod로 진짜 영상 만들기
  // ------------------------------------------------------------
  async function generateWithRunPod(imageBase64, promptText, videoEl) {
    try {
      showMsg("RunPod 시작됨! 뒤에서 진짜 영상 만드는 중...");

      var res = await fetch("/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "runpod.generate",
          args: {
            prompt: promptText,
            image: imageBase64,
            seconds: 5
          }
        })
      });

      var data = await res.json();
      var id = data.data && data.data.id;
      if (!id) {
        showMsg("RunPod 시작 실패. 가짜 영상은 계속 보여줄게.");
        alreadyStarted = false;
        return;
      }

      showMsg("RunPod 시작됨! id: " + id.slice(0, 8) + "... 7-8분 기다려");

      for (var i = 0; i < 60; i++) {
        await new Promise(function (r) {
          setTimeout(r, 10000);
        });

        var s = await fetch("/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "runpod.status",
            args: { id: id }
          })
        });

        var sd = await s.json();
        var status = sd.data && sd.data.status;

        showMsg("진짜 영상 만드는 중... " + (i + 1) + "/60 - " + status);

        if (status === "COMPLETED") {
          var out = sd.data && sd.data.output;
          var url = null;

          if (out && out.data_b64) {
            url = "data:" + (out.content_type || "video/mp4") + ";base64," + out.data_b64;
          } else if (typeof out === "string") {
            url = out;
          } else if (out) {
            url = out.video || out.url || out[0];
          }

          if (url && videoEl) {
            videoEl.src = url;
            videoEl.play();
          }

          showMsg("진짜 영상 완성! .mp4로 바뀌었어!");
          alreadyStarted = false;
          return;
        }

        if (status === "FAILED") {
          showMsg("진짜 영상 만들기 실패. 가짜 영상은 계속 보여줄게.");
          alreadyStarted = false;
          return;
        }
      }

      showMsg("10분이 지나도 안 끝났어. 뒤에서 계속 만들고 있어.");
      alreadyStarted = false;

    } catch (e) {
      showMsg("에러: " + e.message);
      alreadyStarted = false;
    }
  }

  // ------------------------------------------------------------
  // 4. 지금 페이지에서 사진 + 프롬프트 찾기
  // ------------------------------------------------------------
  function findCurrentPrompt() {
    var ta = document.querySelector("textarea");
    if (ta && ta.value) {
      return ta.value;
    }
    var textInputs = document.querySelectorAll('input[type="text"]');
    for (var i = 0; i < textInputs.length; i++) {
      if (textInputs[i].value && textInputs[i].value.length > 5) {
        return textInputs[i].value;
      }
    }
    var all = document.body.innerText || "";
    if (all.indexOf("3D Pixar") !== -1) {
      var idx = all.indexOf("3D Pixar");
      return all.slice(idx, idx + 300);
    }
    return "same person, same exact face, same clothes, keep identity, do not change face, do not change gender, do not change age, smiling and waving gently";
  }

  function makePromptSafe(p) {
    if (!p) {
      p = "smiling and waving gently";
    }
    if (p.indexOf("keep identity") === -1) {
      p = "same person, same exact face, same clothes, keep identity, do not change face, do not change gender, do not change age, " + p;
    }
    return p;
  }

  function findImageSrc() {
    // 1. data: 이미지 먼저 찾기
    var imgs = document.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) {
      var src = imgs[i].src || "";
      if (src.indexOf("data:") === 0 && src.length > 1000) {
        return { type: "data", value: src };
      }
    }
    // 2. blob: 이미지 찾기 (홈페이지 왼쪽 사진이 이거야)
    for (var j = 0; j < imgs.length; j++) {
      var s2 = imgs[j].src || "";
      if (s2.indexOf("blob:") === 0) {
        return { type: "blob", value: s2 };
      }
    }
    // 3. 파일 입력 찾기
    var fileInputs = document.querySelectorAll('input[type="file"]');
    for (var k = 0; k < fileInputs.length; k++) {
      if (fileInputs[k].files && fileInputs[k].files[0]) {
        return { type: "file", value: fileInputs[k].files[0] };
      }
    }
    return null;
  }

  // ------------------------------------------------------------
  // 5. 비디오가 생기면, 자동으로 RunPod 시작하기
  // ------------------------------------------------------------
  function tryStart(videoEl) {
    if (alreadyStarted) {
      return;
    }
    if (!videoEl) {
      return;
    }

    var found = findImageSrc();
    if (!found) {
      return;
    }

    var promptText = makePromptSafe(findCurrentPrompt());

    // 파일이면, 먼저 읽기
    if (found.type === "file") {
      var reader = new FileReader();
      reader.onload = function () {
        var dataUrl = reader.result;
        if (dataUrl === lastImage && promptText === lastPrompt) {
          return;
        }
        lastImage = dataUrl;
        lastPrompt = promptText;
        alreadyStarted = true;
        compressImage(dataUrl, function (small) {
          generateWithRunPod(small, promptText, videoEl);
        });
      };
      reader.readAsDataURL(found.value);
      return;
    }

    // blob이면, data로 바꾸기
    if (found.type === "blob") {
      blobToDataUrl(found.value, function (dataUrl) {
        if (!dataUrl) {
          return;
        }
        if (dataUrl === lastImage && promptText === lastPrompt) {
          return;
        }
        lastImage = dataUrl;
        lastPrompt = promptText;
        alreadyStarted = true;
        compressImage(dataUrl, function (small) {
          generateWithRunPod(small, promptText, videoEl);
        });
      });
      return;
    }

    // data면, 바로 시작
    if (found.value === lastImage && promptText === lastPrompt) {
      return;
    }
    lastImage = found.value;
    lastPrompt = promptText;
    alreadyStarted = true;
    compressImage(found.value, function (small) {
      generateWithRunPod(small, promptText, videoEl);
    });
  }

  // ------------------------------------------------------------
  // 6. 페이지가 다 로딩되면, 비디오를 감시하기
  // ------------------------------------------------------------
  window.addEventListener("load", function () {

    document.addEventListener("click", function () {
      setTimeout(function () {
        var v = document.querySelector("video");
        if (v) {
          tryStart(v);
        }
      }, 1000);
    });

    var observer = new MutationObserver(function () {
      var v = document.querySelector("video");
      if (v) {
        tryStart(v);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    setTimeout(function () {
      var v = document.querySelector("video");
      if (v) {
        tryStart(v);
      }
    }, 2000);

  });

})();
