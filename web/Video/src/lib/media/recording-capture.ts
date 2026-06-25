import type { RecordingMode, RecordingTimelinePreset } from "@/lib/editor/recording-layouts";

export type RecordingCapture = {
  stream: MediaStream;
  cleanup: () => void;
};

export async function createRecordingCapture(mode: RecordingMode, timelinePreset: RecordingTimelinePreset): Promise<RecordingCapture> {
  if (mode === "screen") {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    return { stream, cleanup: () => stopStream(stream) };
  }

  if (mode === "camera") {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    return { stream, cleanup: () => stopStream(stream) };
  }

  if (mode === "voiceover") {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return { stream, cleanup: () => stopStream(stream) };
  }

  return createScreenCameraCapture(timelinePreset);
}

async function createScreenCameraCapture(timelinePreset: RecordingTimelinePreset): Promise<RecordingCapture> {
  const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  let cameraStream: MediaStream | null = null;

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    return await createCompositeCapture(screenStream, cameraStream, timelinePreset);
  } catch (error) {
    stopStream(screenStream);
    stopStream(cameraStream);
    throw error;
  }
}

async function createCompositeCapture(screenStream: MediaStream, cameraStream: MediaStream, timelinePreset: RecordingTimelinePreset) {
  const screenVideo = await preparePreviewVideo(screenStream);
  const cameraVideo = await preparePreviewVideo(cameraStream);
  const canvas = document.createElement("canvas");
  const screenSettings = screenStream.getVideoTracks()[0]?.getSettings();
  canvas.width = Math.max(640, Math.round(Number(screenSettings?.width) || 1280));
  canvas.height = Math.max(360, Math.round(Number(screenSettings?.height) || 720));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Recording canvas could not be created.");
  }

  const frameRate = Math.max(10, Math.min(60, Math.round(Number(screenSettings?.frameRate) || 30)));
  const canvasStream = canvas.captureStream(frameRate);
  const audioCleanup = attachMixedAudio(canvasStream, [screenStream, cameraStream]);
  let animationFrame = 0;
  let stopped = false;

  const drawFrame = () => {
    if (stopped) return;

    drawStudioFrame(context, canvas, screenVideo, cameraVideo, timelinePreset);
    animationFrame = window.requestAnimationFrame(drawFrame);
  };
  drawFrame();

  const cleanup = () => {
    stopped = true;
    window.cancelAnimationFrame(animationFrame);
    stopStream(canvasStream);
    stopStream(screenStream);
    stopStream(cameraStream);
    audioCleanup();
  };

  return { stream: canvasStream, cleanup };
}

function drawStudioFrame(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  screenVideo: HTMLVideoElement,
  cameraVideo: HTMLVideoElement,
  timelinePreset: RecordingTimelinePreset,
) {
  context.fillStyle = "#050505";
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (timelinePreset === "split-left" || timelinePreset === "split-right") {
    const screenX = timelinePreset === "split-left" ? 0 : canvas.width / 2;
    const cameraX = timelinePreset === "split-left" ? canvas.width / 2 : 0;
    drawCover(context, screenVideo, screenX, 0, canvas.width / 2, canvas.height);
    drawCover(context, cameraVideo, cameraX, 0, canvas.width / 2, canvas.height);
    return;
  }

  drawCover(context, screenVideo, 0, 0, canvas.width, canvas.height);

  const pipWidth = Math.round(canvas.width * (timelinePreset === "full-frame" ? 0.24 : 0.3));
  const pipHeight = Math.round(pipWidth * (9 / 16));
  const margin = Math.round(canvas.width * 0.025);
  const x = canvas.width - pipWidth - margin;
  const y = canvas.height - pipHeight - margin;
  drawCover(context, cameraVideo, x, y, pipWidth, pipHeight);
}

function drawCover(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  targetX: number,
  targetY: number,
  targetWidth: number,
  targetHeight: number,
) {
  const sourceWidth = video.videoWidth || targetWidth;
  const sourceHeight = video.videoHeight || targetHeight;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;

  if (sourceRatio > targetRatio) {
    sw = sourceHeight * targetRatio;
    sx = (sourceWidth - sw) / 2;
  } else {
    sh = sourceWidth / targetRatio;
    sy = (sourceHeight - sh) / 2;
  }

  context.drawImage(video, sx, sy, sw, sh, targetX, targetY, targetWidth, targetHeight);
}

async function preparePreviewVideo(stream: MediaStream) {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  await video.play();
  return video;
}

function attachMixedAudio(output: MediaStream, sources: MediaStream[]) {
  if (typeof AudioContext === "undefined") {
    for (const source of sources) {
      source.getAudioTracks().forEach((track) => output.addTrack(track));
    }
    return () => undefined;
  }

  const audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();
  for (const source of sources) {
    if (source.getAudioTracks().length === 0) continue;
    audioContext.createMediaStreamSource(source).connect(destination);
  }

  destination.stream.getAudioTracks().forEach((track) => output.addTrack(track));
  return () => {
    void audioContext.close();
  };
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}
