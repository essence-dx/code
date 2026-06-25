export type HookVideoExportOptions = {
  audioBlob: Blob;
  durationMs: number;
  height?: number;
  overlayText: string;
  startMs: number;
  video: HTMLVideoElement;
  width?: number;
};

const defaultWidth = 720;
const defaultHeight = 1280;

export async function exportHookVideo({
  audioBlob,
  durationMs,
  height = defaultHeight,
  overlayText,
  startMs,
  video,
  width = defaultWidth,
}: HookVideoExportOptions) {
  if (!("MediaRecorder" in window)) {
    throw new Error("This browser cannot export video.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create the video canvas.");
  }
  const renderingContext = context;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextClass();
  const audioBuffer = await audioContext.decodeAudioData(
    await audioBlob.arrayBuffer(),
  );
  const startSeconds = Math.min(
    Math.max(0, startMs / 1000),
    Math.max(0, audioBuffer.duration - 0.1),
  );
  const durationSeconds = Math.min(
    Math.max(1, durationMs / 1000),
    Math.max(1, audioBuffer.duration - startSeconds),
  );
  const source = audioContext.createBufferSource();
  const destination = audioContext.createMediaStreamDestination();
  source.buffer = audioBuffer;
  source.connect(destination);

  const canvasStream = canvas.captureStream(30);
  const stream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...destination.stream.getAudioTracks(),
  ]);
  const mimeType = getSupportedVideoMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size) {
      chunks.push(event.data);
    }
  };

  video.muted = true;
  video.loop = true;
  await waitForVideoReady(video);
  await seekMedia(video, 0);
  await video.play();

  let rafId = 0;
  let stopped = false;
  const startedAt = performance.now();

  function renderFrame() {
    drawHookFrame(renderingContext, video, overlayText, width, height);

    if (!stopped && performance.now() - startedAt < durationSeconds * 1000) {
      rafId = requestAnimationFrame(renderFrame);
    }
  }

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Video recording failed."));
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType || "video/webm" }));
    };
  });

  recorder.start(250);
  renderFrame();
  source.start(audioContext.currentTime + 0.05, startSeconds, durationSeconds);

  await wait(durationSeconds * 1000 + 120);
  stopped = true;
  cancelAnimationFrame(rafId);
  drawHookFrame(renderingContext, video, overlayText, width, height);
  recorder.stop();
  try {
    source.stop();
  } catch {
    // The source may already have ended naturally.
  }
  video.pause();
  stream.getTracks().forEach((track) => track.stop());
  await audioContext.close();

  return finished;
}

export function drawHookFrame(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  overlayText: string,
  width: number,
  height: number,
) {
  context.fillStyle = "#05070d";
  context.fillRect(0, 0, width, height);

  const videoRatio = video.videoWidth && video.videoHeight
    ? video.videoWidth / video.videoHeight
    : 16 / 9;
  const canvasRatio = width / height;
  const drawHeight = videoRatio > canvasRatio ? height : width / videoRatio;
  const drawWidth = videoRatio > canvasRatio ? height * videoRatio : width;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;

  context.drawImage(video, x, y, drawWidth, drawHeight);

  if (!overlayText.trim()) {
    return;
  }

  const padding = Math.round(width * 0.07);
  const lineHeight = 42;
  const lines = wrapText(context, overlayText.trim(), width - padding * 2);
  const boxHeight = lines.length * lineHeight + padding;
  const boxY = height - boxHeight - padding;

  context.fillStyle = "rgba(5, 7, 13, 0.66)";
  context.fillRect(padding / 2, boxY - padding / 2, width - padding, boxHeight);
  context.fillStyle = "#f8fafc";
  context.font = "700 34px sans-serif";
  context.textBaseline = "top";

  lines.forEach((line, index) => {
    context.fillText(line, padding, boxY + index * lineHeight);
  });
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  context.font = "700 34px sans-serif";
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;

    if (context.measureText(nextLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = nextLine;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines.slice(0, 5);
}

function getSupportedVideoMimeType() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
}

function seekMedia(media: HTMLMediaElement, time: number) {
  return new Promise<void>((resolve) => {
    const onSeeked = () => {
      media.removeEventListener("seeked", onSeeked);
      resolve();
    };

    media.addEventListener("seeked", onSeeked);
    media.currentTime = time;

    if (Math.abs(media.currentTime - time) < 0.05) {
      media.removeEventListener("seeked", onSeeked);
      resolve();
    }
  });
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function waitForVideoReady(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("error", onError);
    };
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Could not read the uploaded video."));
    };

    video.addEventListener("loadeddata", onLoaded, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}
