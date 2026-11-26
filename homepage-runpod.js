// ============================================================
// homepage-runpod.js
// 홈페이지 Generate video 버튼을 RunPod로 연결하는 파일
// 디자인은 안 건드려. 버튼 기능만 연결해.
// 방식: 가짜 영상 먼저 보여주고, 뒤에서 진짜 만들기
// ============================================================

(function () {

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
  //    - id만 받고 바로 돌아와 (1초)
  //    - 10초마다 확인, 10분까지 기다려
  //    - 다 되면, 가짜 영상을 진짜로 바꿔
  // ------------------------------------------------------------
  async function generateWithRunPod(imageBase64, promptText, videoEl, statusEl) {
    try {
      if (statusEl) {
        statusEl.textContent = "진짜 영상 만드는 중...";
      }

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
        if (statusEl) {
          statusEl.textContent = "시작 실패. 가짜 영상은 계속 보여줄게.";
        }
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

        if (statusEl) {
          statusEl.textContent = "진짜 영상 만드는 중... " + (i + 1) + "/60";
        }

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

          if (statusEl) {
            statusEl.textContent = "진짜 영상 완성!";
          }

          return;
        }

        if (status === "FAILED") {
          if (statusEl) {
            statusEl.textContent = "진짜 영상 만들기 실패. 가짜 영상은 계속 보여줄게.";
          }
          return;
        }
      }

      if (statusEl) {
        statusEl.textContent = "10분이 지나도 안 끝났어. 뒤에서 계속 만들고 있어.";
      }

    } catch (e) {
      if (statusEl) {
        statusEl.textContent = "에러: " + e.message;
      }
    }
  }

  // ------------------------------------------------------------
  // 3. 홈페이지 버튼을 찾아서 연결하기
  //    - 버튼 텍스트에 Generate가 들어간 버튼을 찾아
  //    - 사진, 프롬프트, 비디오를 자동으로 찾아
  // ------------------------------------------------------------
  function findGenerateButton() {
    var buttons = document.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      var t = (buttons[i].textContent || "").toLowerCase();
      if (t.indexOf("generate") !== -1 && t.indexOf("video") !== -1) {
        return buttons[i];
      }
    }
    return null;
  }

  function findImageInput() {
    var inputs = document.querySelectorAll('input[type="file"]');
    if (inputs.length > 0) {
      return inputs[0];
    }
    return null;
  }

  function findPromptInput() {
    var ta = document.querySelector("textarea");
    if (ta) {
      return ta;
    }
    var inp = document.querySelector('input[type="text"]');
    return inp;
  }

  function findVideo() {
    var v = document.querySelector("video");
    return v;
  }

  function findStatus() {
    var el = document.getElementById("status");
    if (el) {
      return el;
    }
    return null;
  }

  // ------------------------------------------------------------
  // 4. 페이지가 다 로딩되면, 버튼에 연결하기
  // ------------------------------------------------------------
  window.addEventListener("load", function () {
    var btn = findGenerateButton();
    if (!btn) {
      return;
    }

    btn.addEventListener("click", function () {
      // 홈페이지 원래 가짜 영상 코드는 그대로 둬.
      // 여기서는 RunPod로 진짜 영상을 뒤에서 만들기만 추가해.

      setTimeout(function () {
        var fileInput = findImageInput();
        var promptInput = findPromptInput();
        var videoEl = findVideo();
        var statusEl = findStatus();

        var promptText = "";
        if (promptInput) {
          promptText = promptInput.value || promptInput.placeholder || "a person smiling";
        }
        if (!promptText) {
          promptText = "same person, same face, keep identity, do not change face, smiling and waving gently";
        }

        // 얼굴을 더 잘 지키는 프롬프트로 바꿔
        if (promptText.indexOf("keep identity") === -1) {
          promptText = "same person, same exact face, same clothes, keep identity, do not change face, do not change gender, do not change age, " + promptText;
        }

        // 사진 찾기: 파일 입력에서 읽기
        if (fileInput && fileInput.files && fileInput.files[0]) {
          var reader = new FileReader();
          reader.onload = function () {
            compressImage(reader.result, function (small) {
              generateWithRunPod(small, promptText, videoEl, statusEl);
            });
          };
          reader.readAsDataURL(fileInput.files[0]);
          return;
        }

        // 사진이 파일 입력에 없으면, 페이지에 있는 img에서 찾기
        var imgs = document.querySelectorAll("img");
        for (var i = 0; i < imgs.length; i++) {
          var src = imgs[i].src || "";
          if (src.indexOf("data:") === 0) {
            (function (s) {
              compressImage(s, function (small) {
                generateWithRunPod(small, promptText, videoEl, statusEl);
              });
            })(src);
            return;
          }
        }

      }, 500);
    });
  });

})();
