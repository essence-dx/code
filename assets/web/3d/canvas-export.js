(function () {
  if (window.__canvasExport) return;

  var EXPORT_TIMEOUT_MS = 30000;
  var exporting = false;

  function captureElement(el, filename) {
    return new Promise(function (resolve, reject) {
      var timedOut = false;
      var timer = setTimeout(function () { timedOut = true; reject(new Error("captureElement timed out")); }, EXPORT_TIMEOUT_MS);
      try {
        var serializer = new XMLSerializer();
        var svgText = serializer.serializeToString(el);
        var blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
        var url = URL.createObjectURL(blob);

        var bbox = null;
        try { bbox = el.getBBox ? el.getBBox() : null; } catch (e) {}
        var cropX = 0, cropY = 0, cropW = 1200, cropH = 720;
        if (bbox && (bbox.width > 0 || bbox.height > 0)) {
          var pad = 40;
          cropX = Math.max(0, bbox.x - pad);
          cropY = Math.max(0, bbox.y - pad);
          cropW = bbox.width + pad * 2;
          cropH = bbox.height + pad * 2;
        }

        var scale = 2;
        var canvas = document.createElement("canvas");
        canvas.width = cropW * scale;
        canvas.height = cropH * scale;
        var ctx = canvas.getContext("2d");
        if (!ctx) { clearTimeout(timer); reject(new Error("No 2D context")); return; }

        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        var img = new Image();
        img.onload = function () {
          if (timedOut) return;
          clearTimeout(timer);
          ctx.scale(scale, scale);
          ctx.drawImage(img, -cropX, -cropY);
          URL.revokeObjectURL(url);
          canvas.toBlob(function (pngBlob) {
            if (!pngBlob) { reject(new Error("toBlob failed")); return; }
            resolve({ blob: pngBlob, filename: filename || "export-" + Date.now() + ".png" });
          }, "image/png");
        };
        img.onerror = function () { clearTimeout(timer); reject(new Error("Image load failed")); };
        img.src = url;
      } catch (e) { clearTimeout(timer); reject(e); }
    });
  }

  function exportPage(filename) {
    return new Promise(function (resolve, reject) {
      var timedOut = false;
      var timer = setTimeout(function () { timedOut = true; reject(new Error("exportPage timed out")); }, EXPORT_TIMEOUT_MS);
      try {
        var cvs = document.createElement("canvas");
        cvs.width = Math.min(document.documentElement.scrollWidth, 4096);
        cvs.height = Math.min(document.documentElement.scrollHeight, 4096);
        var ctx = cvs.getContext("2d");
        if (!ctx) { clearTimeout(timer); reject(new Error("No 2D context")); return; }
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        if (typeof ctx.drawWindow === "function") {
          ctx.drawWindow(window, 0, 0, cvs.width, cvs.height);
          cvs.toBlob(function (blob) {
            if (timedOut) return;
            clearTimeout(timer);
            if (blob) resolve({ blob: blob, filename: filename || "page-export-" + Date.now() + ".png" });
            else reject(new Error("toBlob failed"));
          }, "image/png");
        } else {
          var anySvg = document.querySelector("svg");
          if (anySvg) {
            clearTimeout(timer);
            captureElement(anySvg, filename).then(resolve).catch(reject);
          } else {
            clearTimeout(timer);
            reject(new Error("No SVG element and no drawWindow support"));
          }
        }
      } catch (e) { clearTimeout(timer); reject(e); }
    });
  }

  function sendToEditor(blob, filename) {
    var ipc = window.ipc;
    if (ipc && typeof ipc.postMessage === "function") {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          ipc.postMessage(JSON.stringify({
            kind: "dx-www-canvas-export",
            data: reader.result.split(",")[1],
            mime: "image/png",
            filename: filename,
            timestamp: Date.now(),
          }));
        } catch (e) { console.error("[canvas-export] ipc.postMessage failed:", e); }
      };
      reader.onerror = function () { console.error("[canvas-export] FileReader error"); };
      reader.readAsDataURL(blob);
      return true;
    }
    return false;
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportCanvas(filename) {
    if (exporting) { console.warn("[canvas-export] already exporting"); return; }
    exporting = true;
    try {
      var svg = document.querySelector("svg");
      if (svg) {
        var result = await captureElement(svg, filename);
        if (!sendToEditor(result.blob, result.filename)) downloadBlob(result.blob, result.filename);
        return result;
      }
      var result = await exportPage(filename);
      if (!sendToEditor(result.blob, result.filename)) downloadBlob(result.blob, result.filename);
      return result;
    } finally {
      exporting = false;
    }
  }

  function setupExportButton(btnSelector) {
    var btn = document.querySelector(btnSelector || "[data-canvas-export]");
    if (!btn) return;
    btn.addEventListener("click", async function () {
      btn.disabled = true;
      var origTitle = btn.title || "Export";
      btn.title = "Exporting...";
      try {
        await exportCanvas();
        btn.classList.add("is-success");
        btn.title = "Exported \u2713";
        setTimeout(function () { btn.classList.remove("is-success"); btn.title = origTitle; }, 2000);
      } catch (err) {
        console.error("[canvas-export] Failed:", err);
        btn.title = "Export failed";
        setTimeout(function () { btn.title = origTitle; }, 2000);
      } finally {
        btn.disabled = false;
      }
    });
  }

  var api = { exportCanvas: exportCanvas, captureElement: captureElement, exportPage: exportPage, sendToEditor: sendToEditor, downloadBlob: downloadBlob, setupExportButton: setupExportButton };
  window.__canvasExport = api;
  window.dispatchEvent(new CustomEvent("canvas-export-ready", { detail: api }));

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setupExportButton(); });
  } else {
    setupExportButton();
  }
})();
