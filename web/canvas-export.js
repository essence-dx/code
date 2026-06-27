(function () {
  if (window.__canvasExport) return;

  function captureElement(el, filename) {
    return new Promise((resolve, reject) => {
      try {
        const serializer = new XMLSerializer();
        const svgText = serializer.serializeToString(el);
        const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const bbox = el.getBBox ? el.getBBox() : null;
        let cropX = 0, cropY = 0, cropW = 1200, cropH = 720;
        if (bbox && (bbox.width > 0 || bbox.height > 0)) {
          const pad = 40;
          cropX = Math.max(0, bbox.x - pad);
          cropY = Math.max(0, bbox.y - pad);
          cropW = bbox.width + pad * 2;
          cropH = bbox.height + pad * 2;
        }

        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = cropW * scale;
        canvas.height = cropH * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("No 2D context")); return; }

        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const img = new Image();
        img.onload = () => {
          ctx.scale(scale, scale);
          ctx.drawImage(img, -cropX, -cropY);
          URL.revokeObjectURL(url);
          canvas.toBlob((pngBlob) => {
            if (!pngBlob) { reject(new Error("toBlob failed")); return; }
            resolve({ blob: pngBlob, filename: filename || `export-${Date.now()}.png` });
          }, "image/png");
        };
        img.onerror = reject;
        img.src = url;
      } catch (e) { reject(e); }
    });
  }

  function exportPage(filename) {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = document.documentElement.scrollWidth;
        canvas.height = document.documentElement.scrollHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("No 2D context")); return; }
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Use html2canvas-like approach: draw each element
        // For a proper page screenshot, we use the SVG element if available
        const svg = document.querySelector("svg[role='img'], svg.whiteboard-svg-preview, canvas[data-whiteboard-canvas]");
        if (svg || canvas.dataset.whiteboardCanvas) {
          const cvs = document.createElement("canvas");
          cvs.width = canvas.width;
          cvs.height = canvas.height;
          const ctx2 = cvs.getContext("2d");
          if (ctx2) {
            ctx2.drawWindow ? ctx2.drawWindow(window, 0, 0, cvs.width, cvs.height) : null;
            cvs.toBlob((blob) => {
              if (blob) resolve({ blob, filename: filename || `page-export-${Date.now()}.png` });
              else reject(new Error("toBlob failed"));
            }, "image/png");
          } else reject(new Error("No 2D context"));
        } else {
          // Fallback: draw SVG if found
          const anySvg = document.querySelector("svg");
          if (anySvg) {
            captureElement(anySvg, filename).then(resolve).catch(reject);
          } else {
            reject(new Error("No SVG or canvas element found"));
          }
        }
      } catch (e) { reject(e); }
    });
  }

  function sendToEditor(blob, filename) {
    const ipc = window.ipc;
    if (ipc && typeof ipc.postMessage === "function") {
      const reader = new FileReader();
      reader.onload = () => {
        ipc.postMessage(JSON.stringify({
          kind: "dx-www-canvas-export",
          data: reader.result.split(",")[1],
          mime: "image/png",
          filename,
          timestamp: Date.now(),
        }));
      };
      reader.readAsDataURL(blob);
      return true;
    }
    return false;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportCanvas(filename) {
    const svg = document.querySelector("svg");
    if (svg) {
      const result = await captureElement(svg, filename);
      if (!sendToEditor(result.blob, result.filename)) {
        downloadBlob(result.blob, result.filename);
      }
      return result;
    }
    const result = await exportPage(filename);
    if (!sendToEditor(result.blob, result.filename)) {
      downloadBlob(result.blob, result.filename);
    }
    return result;
  }

  // Auto-register export button if exists
  function setupExportButton(btnSelector) {
    const btn = document.querySelector(btnSelector || "[data-canvas-export]");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      const origTitle = btn.title || "Export";
      btn.title = "Exporting...";
      try {
        await exportCanvas();
        btn.classList.add("is-success");
        btn.title = "Exported ✓";
        setTimeout(() => { btn.classList.remove("is-success"); btn.title = origTitle; }, 2000);
      } catch (err) {
        console.error("[canvas-export] Failed:", err);
        btn.title = "Export failed";
        setTimeout(() => { btn.title = origTitle; }, 2000);
      } finally {
        btn.disabled = false;
      }
    });
  }

  const api = { exportCanvas, captureElement, exportPage, sendToEditor, downloadBlob, setupExportButton };
  window.__canvasExport = api;
  window.dispatchEvent(new CustomEvent("canvas-export-ready", { detail: api }));

  // Auto-setup on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setupExportButton());
  } else {
    setupExportButton();
  }
})();
