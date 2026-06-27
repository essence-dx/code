"use strict";
(function () {
  if (window.__canvasExport) return;

  var EXPORT_TIMEOUT_MS = 30000;
  var MAX_CANVAS_DIM = 4096;
  var exporting = false;

  function cleanup(canvas, url, timer) {
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    if (url) URL.revokeObjectURL(url);
    if (timer) clearTimeout(timer);
  }

  function captureElement(el, filename) {
    return new Promise(function (resolve, reject) {
      if (!el || typeof el.querySelectorAll !== "function") {
        reject(new Error("captureElement: not a DOM element"));
        return;
      }
      var timedOut = false;
      var canvas = null;
      var timer = setTimeout(function () {
        timedOut = true;
        reject(new Error("captureElement timed out after " + EXPORT_TIMEOUT_MS + "ms"));
      }, EXPORT_TIMEOUT_MS);
      try {
        var serializer = new XMLSerializer();
        var svgText = serializer.serializeToString(el);
        var blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var bbox = null;
        if (typeof el.getBBox === "function") {
          try { bbox = el.getBBox(); } catch (_) {}
        }
        var cropX = 0, cropY = 0, cropW = 1200, cropH = 720;
        if (bbox && (bbox.width > 0 || bbox.height > 0) && isFinite(bbox.x)) {
          var pad = 40;
          cropX = Math.max(0, bbox.x - pad);
          cropY = Math.max(0, bbox.y - pad);
          cropW = Math.min(bbox.width + pad * 2, MAX_CANVAS_DIM);
          cropH = Math.min(bbox.height + pad * 2, MAX_CANVAS_DIM);
        }
        var scale = 2;
        canvas = document.createElement("canvas");
        canvas.width = Math.min(cropW * scale, MAX_CANVAS_DIM);
        canvas.height = Math.min(cropH * scale, MAX_CANVAS_DIM);
        var ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup(canvas, url, timer);
          reject(new Error("No 2D context"));
          return;
        }
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        var img = new Image();
        img.onload = function () {
          if (timedOut) { cleanup(canvas, url, null); return; }
          clearTimeout(timer);
          ctx.scale(scale, scale);
          ctx.drawImage(img, -cropX, -cropY);
          URL.revokeObjectURL(url);
          canvas.toBlob(function (pngBlob) {
            if (!pngBlob) { cleanup(canvas, null, null); reject(new Error("toBlob failed")); return; }
            resolve({ blob: pngBlob, filename: filename || "export-" + Date.now() + ".png" });
          }, "image/png");
        };
        img.onerror = function () {
          cleanup(canvas, url, timer);
          reject(new Error("Image load failed from serialized SVG"));
        };
        img.src = url;
      } catch (e) {
        cleanup(canvas, null, timer);
        reject(e);
      }
    });
  }

  function exportPage(filename) {
    return new Promise(function (resolve, reject) {
      var timedOut = false;
      var cvs = null;
      var timer = setTimeout(function () {
        timedOut = true;
        reject(new Error("exportPage timed out after " + EXPORT_TIMEOUT_MS + "ms"));
      }, EXPORT_TIMEOUT_MS);
      try {
        cvs = document.createElement("canvas");
        cvs.width = Math.min(document.documentElement.scrollWidth || window.innerWidth, MAX_CANVAS_DIM);
        cvs.height = Math.min(document.documentElement.scrollHeight || window.innerHeight, MAX_CANVAS_DIM);
        var ctx = cvs.getContext("2d");
        if (!ctx) {
          cleanup(cvs, null, timer);
          reject(new Error("No 2D context"));
          return;
        }
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, cvs.width, cvs.height);
        if (typeof ctx.drawWindow === "function") {
          ctx.drawWindow(window, 0, 0, cvs.width, cvs.height);
          cvs.toBlob(function (blob) {
            if (timedOut) return;
            clearTimeout(timer);
            if (blob) resolve({ blob: blob, filename: filename || "page-export-" + Date.now() + ".png" });
            else { cleanup(cvs, null, null); reject(new Error("toBlob failed after drawWindow")); }
          }, "image/png");
        } else {
          clearTimeout(timer);
          var anySvg = document.querySelector("svg");
          if (anySvg) {
            captureElement(anySvg, filename).then(resolve).catch(reject);
          } else {
            cleanup(cvs, null, null);
            reject(new Error("No SVG element and no drawWindow support"));
          }
        }
      } catch (e) {
        cleanup(cvs, null, timer);
        reject(e);
      }
    });
  }

  function sendToEditor(blob, filename) {
    var ipc = window.ipc;
    if (ipc && typeof ipc.postMessage === "function") {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var result = reader.result;
          if (typeof result !== "string") { console.error("[canvas-export] expected string data URL"); return; }
          var parts = result.split(",");
          if (parts.length < 2) { console.error("[canvas-export] unexpected data URL format"); return; }
          ipc.postMessage(JSON.stringify({
            kind: "dx-www-canvas-export",
            data: parts[1],
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
    if (!document.body) { console.error("[canvas-export] downloadBlob: no document.body"); return; }
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.cssText = "position:fixed;left:-9999px;top:-9999px;";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      if (a.parentNode) a.parentNode.removeChild(a);
      URL.revokeObjectURL(url);
    }, 10000);
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
    if (btn.tagName !== "BUTTON" && btn.tagName !== "INPUT") {
      console.warn("[canvas-export] setupExportButton: element is not a button/input:", btn.tagName);
    }
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

  var api = {
    exportCanvas: exportCanvas,
    captureElement: captureElement,
    exportPage: exportPage,
    sendToEditor: sendToEditor,
    downloadBlob: downloadBlob,
    setupExportButton: setupExportButton,
  };
  window.__canvasExport = api;
  window.dispatchEvent(new CustomEvent("canvas-export-ready", { detail: api }));

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setupExportButton(); });
  } else {
    setupExportButton();
  }
})();
