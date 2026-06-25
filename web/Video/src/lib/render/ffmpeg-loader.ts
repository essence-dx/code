"use client";

export type FfmpegLoadPhase =
  | "idle"
  | "prefetching-core"
  | "prefetching-wasm"
  | "ready"
  | "error";

export interface FfmpegLoadProgress {
  phase: FfmpegLoadPhase;
  bytesLoaded: number;
  bytesTotal: number;
}

type Subscriber = (progress: FfmpegLoadProgress) => void;

let coreBlobURL: string | null = null;
let wasmBlobURL: string | null = null;
let loadPromise: Promise<void> | null = null;
let phase: FfmpegLoadPhase = "idle";
const subscribers = new Set<Subscriber>();
const FETCH_TIMEOUT_MS = 90_000;

export function getLoadPhase(): FfmpegLoadPhase {
  return phase;
}

export function subscribe(cb: Subscriber): () => void {
  subscribers.add(cb);
  return () => { subscribers.delete(cb); };
}

function notify(p: FfmpegLoadPhase, loaded = 0, total = 0) {
  phase = p;
  const progress: FfmpegLoadProgress = { phase: p, bytesLoaded: loaded, bytesTotal: total };
  for (const cb of subscribers) {
    try { cb(progress); } catch { /* noop */ }
  }
}

async function fetchAsBlobURL(url: string, mimeType: string, onProgress?: (loaded: number, total: number) => void): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const cl = response.headers.get("Content-Length");
  const total = cl ? parseInt(cl, 10) : 0;

  let blob: Blob;
  if (total > 0 && response.body) {
    const reader = response.body.getReader();
    const chunks: BlobPart[] = [];
    let loaded = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      onProgress?.(loaded, total);
    }
    blob = new Blob(chunks, { type: mimeType });
  } else {
    blob = await response.blob();
  }
  return URL.createObjectURL(blob);
}

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`FFmpeg fetch timed out after ${ms}ms`)), ms),
  );
}

export async function preloadFfmpeg(): Promise<void> {
  if (loadPromise) return loadPromise;

  const base = `${window.location.origin}/ffmpeg`;

  loadPromise = (async () => {
    try {
      coreBlobURL = await Promise.race([
        fetchAsBlobURL(
          `${base}/ffmpeg-core.js`,
          "text/javascript",
          (loaded, total) => notify("prefetching-core", loaded, total),
        ),
        timeout(FETCH_TIMEOUT_MS),
      ]);

      wasmBlobURL = await Promise.race([
        fetchAsBlobURL(
          `${base}/ffmpeg-core.wasm`,
          "application/wasm",
          (loaded, total) => notify("prefetching-wasm", loaded, total),
        ),
        timeout(FETCH_TIMEOUT_MS),
      ]);

      notify("ready");
    } catch (err) {
      notify("error");
      loadPromise = null;
      throw err;
    }
  })();

  return loadPromise;
}

export function getCachedBlobURLs(): { coreURL: string | null; wasmURL: string | null } {
  return { coreURL: coreBlobURL, wasmURL: wasmBlobURL };
}
