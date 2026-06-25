"use client";

import { toCanvas, toJpeg, toPng, toSvg } from "html-to-image";

import {
  createBlobExportArtifact,
  createDataUrlExportArtifact,
  createTextExportArtifact,
  downloadBlob,
  downloadDataUrl,
  type ClientExportArtifact,
} from "@/features/editor/export-artifacts";

export type ExportFormat =
  | "png"
  | "transparent-png"
  | "jpg"
  | "webp"
  | "svg"
  | "pdf"
  | "multipage-pdf"
  | "print-pdf"
  | "docx"
  | "xlsx"
  | "gif"
  | "mp4"
  | "media-sequence"
  | "html";
export type ExportQuality = 0.6 | 0.8 | 0.92 | 1;
export type ExportScale = 0.5 | 1 | 2 | 3 | 4;

export const EXPORT_QUALITY_OPTIONS: readonly {
  label: string;
  value: ExportQuality;
}[] = [
  { label: "60%", value: 0.6 },
  { label: "80%", value: 0.8 },
  { label: "92%", value: 0.92 },
  { label: "100%", value: 1 },
];

export const EXPORT_SCALE_OPTIONS: readonly {
  label: string;
  value: ExportScale;
}[] = [
  { label: "0.5x", value: 0.5 },
  { label: "1x", value: 1 },
  { label: "2x", value: 2 },
  { label: "3x", value: 3 },
  { label: "4x", value: 4 },
];

type ExportOptions = {
  quality?: ExportQuality;
  scale?: ExportScale;
  delayMs?: number;
  frameDurationsMs?: number[];
  timelineFrameStepMs?: number;
  onArtifact?: (artifact: ClientExportArtifact) => Promise<void> | void;
  onBeforeFrame?: (frame: ExportFrameContext) => Promise<void> | void;
  shouldCompositeFrames?: (nodeIndex: number) => boolean;
};

export type ExportFrameContext = {
  node: HTMLElement;
  nodeIndex: number;
  timeSeconds: number;
  durationMs: number;
};

export async function exportNodeAsImage(
  node: HTMLElement,
  fileName: string,
  format: ExportFormat,
  options: ExportOptions = {},
) {
  const pixelRatio = options.scale ?? 2;
  const quality = options.quality ?? 0.92;

  if (format === "pdf") {
    await exportNodeAsPdf(node, fileName, pixelRatio, options.onArtifact);
    return;
  }

  if (format === "multipage-pdf" || format === "print-pdf") {
    await exportNodesAsPdf([node], fileName, {
      onArtifact: options.onArtifact,
      scale: pixelRatio,
    });
    return;
  }

  if (format === "gif") {
    await exportNodesAsGif([node], fileName, {
      delayMs: options.delayMs,
      onArtifact: options.onArtifact,
      scale: pixelRatio,
    });
    return;
  }

  if (format === "mp4") {
    await exportNodesAsMp4([node], fileName, {
      delayMs: options.delayMs,
      onArtifact: options.onArtifact,
      scale: pixelRatio,
    });
    return;
  }

  const artifactName = `${formatFileName(fileName)}.${getFileExtension(format)}`;
  const dataUrl = await renderNode(node, format, pixelRatio, quality);
  const artifact = createDataUrlExportArtifact({
    fileName: artifactName,
    mimeType: getMimeType(format),
    dataUrl,
  });

  await options.onArtifact?.(artifact);
  downloadDataUrl({
    dataUrl,
    fileName: artifactName,
  });
}

export async function createNodeThumbnail(node: HTMLElement) {
  return toPng(node, {
    cacheBust: true,
    pixelRatio: 0.18,
  });
}

export async function exportNodesAsPdf(
  nodes: HTMLElement[],
  fileName: string,
  options: Pick<ExportOptions, "onArtifact" | "scale"> = {},
) {
  if (nodes.length === 0) return;

  const [{ jsPDF }, pages] = await Promise.all([
    import("jspdf"),
    Promise.all(
      nodes.map(async (node) => {
        const bounds = node.getBoundingClientRect();
        const width = Math.max(1, Math.round(bounds.width));
        const height = Math.max(1, Math.round(bounds.height));
        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: options.scale ?? 2,
        });

        return {
          dataUrl,
          width,
          height,
        };
      }),
    ),
  ]);
  const firstPage = pages[0];
  const pdf = new jsPDF({
    orientation: getPdfOrientation(firstPage),
    unit: "px",
    format: [firstPage.width, firstPage.height],
    compress: true,
  });

  pages.forEach((page, index) => {
    if (index > 0) {
      pdf.addPage([page.width, page.height], getPdfOrientation(page));
    }

    pdf.addImage(page.dataUrl, "PNG", 0, 0, page.width, page.height);
  });

  const artifactName = `${formatFileName(fileName)}.pdf`;
  const blob = pdf.output("blob");

  await options.onArtifact?.(
    await createBlobExportArtifact({
      blob,
      fileName: artifactName,
    }),
  );
  downloadBlob({ blob, fileName: artifactName });
}

export async function exportNodesAsWebsite(
  nodes: HTMLElement[],
  fileName: string,
  options: Pick<ExportOptions, "onArtifact" | "scale"> = {},
) {
  if (nodes.length === 0) return;

  const pages = await Promise.all(
    nodes.map(async (node, index) => {
      const bounds = node.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: options.scale ?? 1,
      });

      return {
        dataUrl,
        width,
        height,
        index,
      };
    }),
  );
  const html = createWebsiteHtml({
    title: fileName,
    pages,
  });
  const artifactName = `${formatFileName(fileName)}-website.html`;
  const blob = new Blob([html], {
    type: "text/html;charset=utf-8",
  });

  await options.onArtifact?.(
    createTextExportArtifact({
      fileName: artifactName,
      mimeType: "text/html;charset=utf-8",
      text: html,
    }),
  );
  downloadBlob({
    blob,
    fileName: artifactName,
  });
}

export async function exportNodesAsGif(
  nodes: HTMLElement[],
  fileName: string,
  options: Pick<
    ExportOptions,
    | "delayMs"
    | "frameDurationsMs"
    | "onArtifact"
    | "onBeforeFrame"
    | "scale"
    | "shouldCompositeFrames"
    | "timelineFrameStepMs"
  > = {},
) {
  if (nodes.length === 0) return;

  const { GIFEncoder, applyPalette, quantize } = await import("gifenc");
  const gif = GIFEncoder();

  for (const [index, node] of nodes.entries()) {
    const pixelRatio = getGifPixelRatio(node, options.scale ?? 1);
    const frames = getExportFrameSchedule(options, index);

    for (const frame of frames) {
      await options.onBeforeFrame?.({
        node,
        nodeIndex: index,
        timeSeconds: frame.timeSeconds,
        durationMs: frame.durationMs,
      });

      const canvas = await toCanvas(node, {
        cacheBust: true,
        pixelRatio,
        backgroundColor: "#ffffff",
      });
      const context = canvas.getContext("2d");

      if (!context) continue;

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const palette = quantize(imageData.data, 256, { format: "rgb565" });
      const indexedFrame = applyPalette(imageData.data, palette, "rgb565");

      gif.writeFrame(indexedFrame, canvas.width, canvas.height, {
        delay: frame.durationMs,
        palette,
        repeat: 0,
      });
    }
  }

  gif.finish();
  const bytes = gif.bytes();
  const output = new ArrayBuffer(bytes.byteLength);

  new Uint8Array(output).set(bytes);
  const artifactName = `${formatFileName(fileName)}.gif`;
  const blob = new Blob([output], { type: "image/gif" });

  await options.onArtifact?.(
    await createBlobExportArtifact({
      blob,
      fileName: artifactName,
    }),
  );
  downloadBlob({
    blob,
    fileName: artifactName,
  });
}

export async function exportNodesAsMp4(
  nodes: HTMLElement[],
  fileName: string,
  options: Pick<
    ExportOptions,
    | "delayMs"
    | "frameDurationsMs"
    | "onArtifact"
    | "onBeforeFrame"
    | "scale"
    | "shouldCompositeFrames"
    | "timelineFrameStepMs"
  > = {},
) {
  if (nodes.length === 0) return;

  if (!("VideoEncoder" in globalThis)) {
    window.alert("MP4 export needs a browser with WebCodecs support.");
    return;
  }

  const {
    BufferTarget,
    CanvasSource,
    Mp4OutputFormat,
    Output,
    QUALITY_HIGH,
    canEncodeVideo,
  } = await import("mediabunny");
  const firstNode = nodes[0];
  const pixelRatio = getVideoPixelRatio(firstNode, options.scale ?? 1);
  const bounds = firstNode.getBoundingClientRect();
  const width = makeEven(Math.max(2, Math.round(bounds.width * pixelRatio)));
  const height = makeEven(Math.max(2, Math.round(bounds.height * pixelRatio)));
  const frameSchedules = nodes.map((_, index) =>
    getExportFrameSchedule(options, index),
  );
  const frameDurations = frameSchedules.flatMap((frames) =>
    frames.map((frame) => frame.durationMs / 1_000),
  );
  const shortestFrameDuration = Math.min(...frameDurations);
  const canEncodeAvc = await canEncodeVideo("avc", {
    bitrate: QUALITY_HIGH,
    height,
    width,
  });

  if (!canEncodeAvc) {
    window.alert("This browser cannot encode AVC MP4 video.");
    return;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) return;

  canvas.width = width;
  canvas.height = height;

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat(),
    target,
  });
  const videoSource = new CanvasSource(canvas, {
    bitrate: QUALITY_HIGH,
    codec: "avc",
    keyFrameInterval: 1,
  });
  let timestamp = 0;

  output.addVideoTrack(videoSource, {
    frameRate: 1 / shortestFrameDuration,
  });
  await output.start();

  for (const [index, node] of nodes.entries()) {
    const frames = frameSchedules[index] ?? [];

    for (const frame of frames) {
      const frameDuration = frame.durationMs / 1_000;

      await options.onBeforeFrame?.({
        node,
        nodeIndex: index,
        timeSeconds: frame.timeSeconds,
        durationMs: frame.durationMs,
      });

      const sourceCanvas = await toCanvas(node, {
        cacheBust: true,
        pixelRatio,
        backgroundColor: "#ffffff",
      });

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(sourceCanvas, 0, 0, width, height);
      await videoSource.add(timestamp, frameDuration);
      timestamp += frameDuration;
    }
  }

  await output.finalize();

  if (!target.buffer) return;

  const artifactName = `${formatFileName(fileName)}.mp4`;
  const blob = new Blob([target.buffer], { type: "video/mp4" });

  await options.onArtifact?.(
    await createBlobExportArtifact({
      blob,
      fileName: artifactName,
    }),
  );
  downloadBlob({
    blob,
    fileName: artifactName,
  });
}

async function renderNode(
  node: HTMLElement,
  format: ExportFormat,
  pixelRatio: number,
  quality: ExportQuality,
) {
  if (format === "jpg") {
    return toJpeg(node, {
      cacheBust: true,
      pixelRatio,
      quality,
      backgroundColor: "#ffffff",
    });
  }

  if (format === "svg") {
    return toSvg(node, {
      cacheBust: true,
    });
  }

  if (format === "webp") {
    return toWebp(node, pixelRatio, quality);
  }

  if (format === "transparent-png") {
    return withTransparentBackground(node, () =>
      toPng(node, {
        cacheBust: true,
        pixelRatio,
        backgroundColor: "transparent",
      }),
    );
  }

  return toPng(node, {
    cacheBust: true,
    pixelRatio,
  });
}

async function toWebp(
  node: HTMLElement,
  pixelRatio: number,
  quality: ExportQuality,
) {
  const canvas = await toCanvas(node, {
    cacheBust: true,
    pixelRatio,
    backgroundColor: "#ffffff",
  });

  return canvas.toDataURL("image/webp", quality);
}

async function exportNodeAsPdf(
  node: HTMLElement,
  fileName: string,
  pixelRatio: number,
  onArtifact?: (artifact: ClientExportArtifact) => Promise<void> | void,
) {
  const [{ jsPDF }, dataUrl] = await Promise.all([
    import("jspdf"),
    toPng(node, {
      cacheBust: true,
      pixelRatio,
    }),
  ]);
  const bounds = node.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));
  const pdf = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "px",
    format: [width, height],
    compress: true,
  });

  pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
  const artifactName = `${formatFileName(fileName)}.pdf`;
  const blob = pdf.output("blob");

  await onArtifact?.(
    await createBlobExportArtifact({
      blob,
      fileName: artifactName,
    }),
  );
  downloadBlob({ blob, fileName: artifactName });
}

async function withTransparentBackground<T>(
  node: HTMLElement,
  task: () => Promise<T>,
) {
  const previousBackground = node.style.background;
  const previousBackgroundColor = node.style.backgroundColor;

  node.style.background = "transparent";
  node.style.backgroundColor = "transparent";

  try {
    return await task();
  } finally {
    node.style.background = previousBackground;
    node.style.backgroundColor = previousBackgroundColor;
  }
}

function getFileExtension(format: ExportFormat) {
  if (format === "pdf") return "pdf";
  if (format === "html") return "html";
  if (format === "media-sequence") return "json";
  if (format === "xlsx") return "xlsx";

  return format === "transparent-png" ? "png" : format;
}

function getExportFrameDurationMs(
  options: Pick<ExportOptions, "delayMs" | "frameDurationsMs">,
  index: number,
) {
  const frameDurationMs = options.frameDurationsMs?.[index];

  if (typeof frameDurationMs === "number" && frameDurationMs > 0) {
    return frameDurationMs;
  }

  return options.delayMs ?? 1_200;
}

function getExportFrameSchedule(
  options: Pick<
    ExportOptions,
    | "delayMs"
    | "frameDurationsMs"
    | "onBeforeFrame"
    | "shouldCompositeFrames"
    | "timelineFrameStepMs"
  >,
  index: number,
) {
  const durationMs = getExportFrameDurationMs(options, index);
  const stepMs = getTimelineFrameStepMs(options, durationMs, index);
  const frames: Array<{ timeSeconds: number; durationMs: number }> = [];
  let elapsedMs = 0;

  while (elapsedMs < durationMs) {
    const remainingMs = durationMs - elapsedMs;
    const currentDurationMs = Math.min(stepMs, remainingMs);

    frames.push({
      timeSeconds: elapsedMs / 1_000,
      durationMs: currentDurationMs,
    });
    elapsedMs += currentDurationMs;
  }

  return frames.length ? frames : [{ timeSeconds: 0, durationMs }];
}

function getTimelineFrameStepMs(
  options: Pick<
    ExportOptions,
    "onBeforeFrame" | "shouldCompositeFrames" | "timelineFrameStepMs"
  >,
  durationMs: number,
  index: number,
) {
  if (!options.onBeforeFrame) return durationMs;
  if (options.shouldCompositeFrames && !options.shouldCompositeFrames(index)) {
    return durationMs;
  }

  return Math.max(
    80,
    Math.min(durationMs, Math.round(options.timelineFrameStepMs ?? 200)),
  );
}

export function formatFileName(fileName: string) {
  const safeName = fileName.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();

  return safeName || "design";
}

function getPdfOrientation(page: { width: number; height: number }) {
  return page.width >= page.height ? "landscape" : "portrait";
}

function getGifPixelRatio(node: HTMLElement, requestedScale: number) {
  const bounds = node.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width * requestedScale));
  const height = Math.max(1, Math.round(bounds.height * requestedScale));
  const maxPixels = 900_000;

  if (width * height <= maxPixels) return requestedScale;

  return requestedScale * Math.sqrt(maxPixels / (width * height));
}

function getVideoPixelRatio(node: HTMLElement, requestedScale: number) {
  const bounds = node.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width * requestedScale));
  const height = Math.max(1, Math.round(bounds.height * requestedScale));
  const maxPixels = 1_200_000;

  if (width * height <= maxPixels) return requestedScale;

  return requestedScale * Math.sqrt(maxPixels / (width * height));
}

function makeEven(value: number) {
  return value % 2 === 0 ? value : value - 1;
}

function createWebsiteHtml(input: {
  title: string;
  pages: Array<{
    dataUrl: string;
    width: number;
    height: number;
    index: number;
  }>;
}) {
  const title = escapeHtml(input.title || "Essence design");
  const maxWidth = Math.max(...input.pages.map((page) => page.width));
  const navigation =
    input.pages.length > 1
      ? `<nav class="site-nav" aria-label="Pages">${input.pages
          .map(
            (page) =>
              `<a href="#page-${page.index + 1}">${escapeHtml(
                `Page ${page.index + 1}`,
              )}</a>`,
          )
          .join("")}</nav>`
      : "";
  const sections = input.pages
    .map(
      (page) => `<section id="page-${page.index + 1}" class="page">
  <img src="${page.dataUrl}" width="${page.width}" height="${page.height}" alt="${escapeHtml(
    `${input.title || "Design"} page ${page.index + 1}`,
  )}" />
</section>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root {
      color-scheme: light;
      background: #f4f4f5;
      color: #18181b;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      background: #f4f4f5;
    }
    .site-nav {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 12px max(16px, calc((100vw - ${maxWidth}px) / 2));
      border-bottom: 1px solid #e4e4e7;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(12px);
    }
    .site-nav a {
      flex: 0 0 auto;
      border-radius: 999px;
      border: 1px solid #d4d4d8;
      padding: 8px 12px;
      color: #18181b;
      font-size: 14px;
      font-weight: 650;
      text-decoration: none;
    }
    main {
      display: grid;
      justify-items: center;
      gap: 24px;
      padding: 24px 16px;
    }
    .page {
      width: min(100%, ${maxWidth}px);
      display: grid;
      justify-items: center;
    }
    .page img {
      display: block;
      width: 100%;
      height: auto;
      box-shadow: 0 24px 80px rgba(15, 23, 42, 0.14);
    }
  </style>
</head>
<body>
  ${navigation}
  <main>
${sections}
  </main>
</body>
</html>`;
}

function getMimeType(format: ExportFormat) {
  switch (format) {
    case "jpg":
      return "image/jpeg";
    case "svg":
      return "image/svg+xml";
    case "webp":
      return "image/webp";
    case "transparent-png":
    case "png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character] ?? character;
  });
}
