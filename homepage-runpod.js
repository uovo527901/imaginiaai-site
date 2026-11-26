// ============================================================
// homepage-runpod.js - v2
// 버튼을 안 찾아. 비디오가 생기면 자동으로 RunPod 시작해.
// 디자인은 안 건드려.
// ============================================================

(function () {

  var alreadyStarted = false;
  var lastImage = "";
  var lastPrompt = "";

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
  // 2. RunPod로 진짜 영상 만들기
  // ------------------------------------------------------------
  async function generateWithRunPod(imageBase64, promptText, videoEl) {
    try {
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
        return;
      }

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

          alreadyStarted = false;
          return;
        }

        if (status === "FAILED") {
          alreadyStarted = false;
          return;
        }
      }

      alreadyStarted = false;

    } catch (e) {
      alreadyStarted = false;
    }
  }

  // ------------------------------------------------------------
  // 3. 지금 페이지에서 사진 + 프롬프트 찾기
  // ------------------------------------------------------------
  function findCurrentImage() {
    var imgs = document.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) {
      var src = imgs[i].src || "";
      if (src.indexOf("data:") === 0 && src.length > 1000) {
        return src;
      }
    }
    var fileInputs = document.querySelectorAll('input[type="file"]');
    for (var j = 0; j < fileInputs.length; j++) {
      if (fileInputs[j].files && fileInputs[j].files[0]) {
        return fileInputs[j].files[0];
      }
    }
    return null;
  }

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

  // ------------------------------------------------------------
  // 4. 비디오가 생기면, 자동으로 RunPod 시작하기
  //    - 버튼을 안 찾아. 비디오를 봐.
  // ------------------------------------------------------------
  function tryStart(videoEl) {
    if (alreadyStarted) {
      return;
    }
    if (!videoEl) {
      return;
    }

    var imgOrFile = findCurrentImage();
    if (!imgOrFile) {
      return;
    }

    var promptText = makePromptSafe(findCurrentPrompt());

    // 이미지가 파일이면, 먼저 읽기
    if (typeof imgOrFile !== "string") {
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
      reader.readAsDataURL(imgOrFile);
      return;
    }

    // 이미지가 data URL이면, 바로 시작
    if (imgOrFile === lastImage && promptText === lastPrompt) {
      return;
    }
    lastImage = imgOrFile;
    lastPrompt = promptText;
    alreadyStarted = true;
    compressImage(imgOrFile, function (small) {
      generateWithRunPod(small, promptText, videoEl);
    });
  }

  // ------------------------------------------------------------
  // 5. 페이지가 다 로딩되면, 비디오를 감시하기
  // ------------------------------------------------------------
  window.addEventListener("load", function () {

    // 5-1. 페이지 안에 있는 모든 클릭을 듣기
    document.addEventListener("click", function () {
      setTimeout(function () {
        var v = document.querySelector("video");
        if (v) {
          tryStart(v);
        }
      }, 1000);
    });

    // 5-2. 비디오가 새로 생기면, 자동으로 시작하기
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

    // 5-3. 이미 비디오가 있으면, 바로 시작하기
    setTimeout(function () {
      var v = document.querySelector("video");
      if (v) {
        tryStart(v);
      }
    }, 2000);

  });

})();
