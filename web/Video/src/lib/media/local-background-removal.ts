export interface LocalBackgroundRemovalOptions {
  filename: string;
  subjectHint?: string;
  tolerance?: number;
}

const maxCanvasPixels = 8_000_000;
const cornerSampleSize = 18;

export async function removeImageBackgroundLocally(source: Blob, options: LocalBackgroundRemovalOptions): Promise<File> {
  const image = await loadImageBitmap(source);
  const scale = canvasScaleFor(image.width, image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Local background removal could not start.");

  context.drawImage(image, 0, 0, width, height);
  closeImageBitmap(image);

  const frame = context.getImageData(0, 0, width, height);
  const background = sampleBackground(frame.data, width, height);
  const tolerance = Math.max(18, Math.min(120, options.tolerance ?? adaptiveTolerance(background)));
  const alphaMask = edgeConnectedBackgroundMask(frame.data, width, height, background, tolerance);
  applyTransparentMask(frame.data, alphaMask);
  context.putImageData(frame, 0, 0);

  const blob = await canvasToPng(canvas);
  return new File([blob], transparentFilename(options.filename), { type: "image/png" });
}

function edgeConnectedBackgroundMask(data: Uint8ClampedArray, width: number, height: number, background: ColorSample, tolerance: number) {
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  function enqueue(index: number) {
    if (visited[index]) return;
    if (!isBackgroundPixel(data, index, background, tolerance)) return;
    visited[index] = 1;
    queue[tail] = index;
    tail += 1;
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head];
    head += 1;
    const x = index % width;
    const y = Math.floor(index / width);

    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }

  return visited;
}

function applyTransparentMask(data: Uint8ClampedArray, mask: Uint8Array) {
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) continue;
    const offset = index * 4;
    data[offset + 3] = 0;
  }
}

function isBackgroundPixel(data: Uint8ClampedArray, index: number, background: ColorSample, tolerance: number) {
  const offset = index * 4;
  const alpha = data[offset + 3] ?? 255;
  if (alpha <= 8) return true;

  const red = data[offset] ?? 0;
  const green = data[offset + 1] ?? 0;
  const blue = data[offset + 2] ?? 0;
  const distance = Math.hypot(red - background.red, green - background.green, blue - background.blue);
  return distance <= tolerance;
}

interface ColorSample {
  red: number;
  green: number;
  blue: number;
  deviation: number;
}

function sampleBackground(data: Uint8ClampedArray, width: number, height: number): ColorSample {
  const samples: Array<[number, number, number]> = [];
  const sampleWidth = Math.min(cornerSampleSize, width);
  const sampleHeight = Math.min(cornerSampleSize, height);
  const corners = [
    [0, 0],
    [width - sampleWidth, 0],
    [0, height - sampleHeight],
    [width - sampleWidth, height - sampleHeight],
  ] as const;

  for (const [startX, startY] of corners) {
    for (let y = startY; y < startY + sampleHeight; y += 1) {
      for (let x = startX; x < startX + sampleWidth; x += 1) {
        const offset = (y * width + x) * 4;
        if ((data[offset + 3] ?? 255) > 8) {
          samples.push([data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0]);
        }
      }
    }
  }

  const average = samples.reduce(
    (total, sample) => {
      total.red += sample[0];
      total.green += sample[1];
      total.blue += sample[2];
      return total;
    },
    { red: 0, green: 0, blue: 0 },
  );
  const count = Math.max(1, samples.length);
  const red = average.red / count;
  const green = average.green / count;
  const blue = average.blue / count;
  const deviation =
    samples.reduce((total, sample) => total + Math.hypot(sample[0] - red, sample[1] - green, sample[2] - blue), 0) / count;

  return { red, green, blue, deviation };
}

function adaptiveTolerance(background: ColorSample) {
  return 34 + Math.min(44, background.deviation * 1.4);
}

function canvasScaleFor(width: number, height: number) {
  const pixels = width * height;
  if (pixels <= maxCanvasPixels) return 1;
  return Math.sqrt(maxCanvasPixels / pixels);
}

async function loadImageBitmap(source: Blob) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(source);
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const element = new Image();
    element.onload = () => {
      URL.revokeObjectURL(url);
      resolve(element);
    };
    element.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be decoded."));
    };
    element.src = url;
  });

  return image;
}

function closeImageBitmap(image: ImageBitmap | HTMLImageElement) {
  if ("close" in image) image.close();
}

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("Transparent image could not be created."));
    }, "image/png");
  });
}

function transparentFilename(filename: string) {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "-").trim() || "image";
  return `${base}-transparent.png`;
}
