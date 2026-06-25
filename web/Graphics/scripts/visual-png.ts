import { inflateSync } from "node:zlib";

export type PngImageMeta = {
  width: number;
  height: number;
};

export type PngImageData = PngImageMeta & {
  pixels: Uint8Array;
};

export type PixelDiffThresholds = {
  maxChangedPixelRatio: number;
  maxChangedPixels: number;
  channelDelta: number;
};

export type PixelDiffResult = {
  comparedPixels: number;
  changedPixels: number;
  changedRatio: number;
  maxChannelDelta: number;
  averageChannelDelta: number;
  passed: boolean;
  thresholds: PixelDiffThresholds;
};

const pngSignature = "89504e470d0a1a0a";
const defaultThresholds: PixelDiffThresholds = {
  maxChangedPixelRatio: 0.001,
  maxChangedPixels: 300,
  channelDelta: 8,
};

type PngHeader = PngImageMeta & {
  bitDepth: number;
  colorType: number;
  compressionMethod: number;
  filterMethod: number;
  interlaceMethod: number;
};

export function getPixelDiffThresholdsFromEnv(
  env: Record<string, string | undefined> = process.env,
): PixelDiffThresholds {
  return {
    maxChangedPixelRatio: parseThresholdNumber(
      env.ESSENCE_VISUAL_PIXEL_RATIO_THRESHOLD,
      defaultThresholds.maxChangedPixelRatio,
    ),
    maxChangedPixels: parseThresholdNumber(
      env.ESSENCE_VISUAL_PIXEL_COUNT_THRESHOLD,
      defaultThresholds.maxChangedPixels,
    ),
    channelDelta: parseThresholdNumber(
      env.ESSENCE_VISUAL_PIXEL_CHANNEL_THRESHOLD,
      defaultThresholds.channelDelta,
    ),
  };
}

export function readPngDimensions(buffer: Buffer, file: string): PngImageMeta {
  assertPng(buffer, file);

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

export function decodePng(buffer: Buffer, file: string): PngImageData {
  assertPng(buffer, file);

  const header = readHeader(buffer, file);
  const channelCount = getChannelCount(header.colorType, file);

  validateHeader(header, file);

  const imageBytes = header.width * header.height * channelCount;
  const rowBytes = header.width * channelCount;
  const inflated = inflateSync(Buffer.concat(readChunkData(buffer, "IDAT")));
  const filteredRowBytes = rowBytes + 1;
  const expectedBytes = filteredRowBytes * header.height;

  if (inflated.length < expectedBytes) {
    throw new Error(`PNG data is truncated: ${file}`);
  }

  const rawPixels = new Uint8Array(imageBytes);

  for (let y = 0; y < header.height; y += 1) {
    const sourceRowStart = y * filteredRowBytes;
    const targetRowStart = y * rowBytes;
    const filter = inflated[sourceRowStart];

    unfilterRow({
      filter,
      source: inflated,
      sourceStart: sourceRowStart + 1,
      target: rawPixels,
      targetStart: targetRowStart,
      previousStart: y === 0 ? null : targetRowStart - rowBytes,
      rowBytes,
      bytesPerPixel: channelCount,
      file,
    });
  }

  return {
    width: header.width,
    height: header.height,
    pixels: toRgbaPixels(rawPixels, header.colorType),
  };
}

export function diffPngPixels(
  baseline: PngImageData,
  current: PngImageData,
  thresholds: PixelDiffThresholds,
): PixelDiffResult {
  if (baseline.width !== current.width || baseline.height !== current.height) {
    throw new Error("Cannot pixel-diff PNGs with different dimensions.");
  }

  const comparedPixels = baseline.width * baseline.height;
  let changedPixels = 0;
  let maxChannelDelta = 0;
  let totalChannelDelta = 0;

  for (let index = 0; index < baseline.pixels.length; index += 4) {
    const redDelta = Math.abs(baseline.pixels[index] - current.pixels[index]);
    const greenDelta = Math.abs(
      baseline.pixels[index + 1] - current.pixels[index + 1],
    );
    const blueDelta = Math.abs(
      baseline.pixels[index + 2] - current.pixels[index + 2],
    );
    const alphaDelta = Math.abs(
      baseline.pixels[index + 3] - current.pixels[index + 3],
    );
    const pixelDelta = Math.max(redDelta, greenDelta, blueDelta, alphaDelta);

    maxChannelDelta = Math.max(maxChannelDelta, pixelDelta);
    totalChannelDelta += redDelta + greenDelta + blueDelta + alphaDelta;

    if (pixelDelta > thresholds.channelDelta) {
      changedPixels += 1;
    }
  }

  const changedRatio =
    comparedPixels === 0 ? 0 : changedPixels / comparedPixels;

  return {
    comparedPixels,
    changedPixels,
    changedRatio,
    maxChannelDelta,
    averageChannelDelta:
      comparedPixels === 0 ? 0 : totalChannelDelta / (comparedPixels * 4),
    passed:
      changedPixels <= thresholds.maxChangedPixels &&
      changedRatio <= thresholds.maxChangedPixelRatio,
    thresholds,
  };
}

function assertPng(buffer: Buffer, file: string) {
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString("hex") !== pngSignature
  ) {
    throw new Error(`Expected a PNG snapshot file: ${file}`);
  }
}

function readHeader(buffer: Buffer, file: string): PngHeader {
  const ihdr = readChunkData(buffer, "IHDR")[0];

  if (!ihdr || ihdr.length < 13) {
    throw new Error(`PNG is missing a valid IHDR chunk: ${file}`);
  }

  return {
    width: ihdr.readUInt32BE(0),
    height: ihdr.readUInt32BE(4),
    bitDepth: ihdr[8],
    colorType: ihdr[9],
    compressionMethod: ihdr[10],
    filterMethod: ihdr[11],
    interlaceMethod: ihdr[12],
  };
}

function validateHeader(header: PngHeader, file: string) {
  if (header.bitDepth !== 8) {
    throw new Error(`Only 8-bit PNG snapshots are supported: ${file}`);
  }

  if (header.compressionMethod !== 0 || header.filterMethod !== 0) {
    throw new Error(`Unsupported PNG compression or filter method: ${file}`);
  }

  if (header.interlaceMethod !== 0) {
    throw new Error(`Interlaced PNG snapshots are not supported: ${file}`);
  }
}

function readChunkData(buffer: Buffer, chunkType: string) {
  const chunks: Buffer[] = [];
  let offset = 8;

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (dataEnd + 4 > buffer.length) {
      throw new Error(`PNG chunk is truncated: ${chunkType}`);
    }

    if (type === chunkType) {
      chunks.push(buffer.subarray(dataStart, dataEnd));
    }

    offset = dataEnd + 4;
  }

  return chunks;
}

function unfilterRow(input: {
  filter: number;
  source: Buffer;
  sourceStart: number;
  target: Uint8Array;
  targetStart: number;
  previousStart: number | null;
  rowBytes: number;
  bytesPerPixel: number;
  file: string;
}) {
  const {
    filter,
    source,
    sourceStart,
    target,
    targetStart,
    previousStart,
    rowBytes,
    bytesPerPixel,
    file,
  } = input;

  for (let x = 0; x < rowBytes; x += 1) {
    const raw = source[sourceStart + x];
    const left = x >= bytesPerPixel ? target[targetStart + x - bytesPerPixel] : 0;
    const up = previousStart === null ? 0 : target[previousStart + x];
    const upperLeft =
      previousStart !== null && x >= bytesPerPixel
        ? target[previousStart + x - bytesPerPixel]
        : 0;

    target[targetStart + x] =
      (raw + getFilterValue(filter, left, up, upperLeft, file)) & 255;
  }
}

function getFilterValue(
  filter: number,
  left: number,
  up: number,
  upperLeft: number,
  file: string,
) {
  if (filter === 0) {
    return 0;
  }

  if (filter === 1) {
    return left;
  }

  if (filter === 2) {
    return up;
  }

  if (filter === 3) {
    return Math.floor((left + up) / 2);
  }

  if (filter === 4) {
    return paeth(left, up, upperLeft);
  }

  throw new Error(`Unsupported PNG filter ${filter}: ${file}`);
}

function paeth(left: number, up: number, upperLeft: number) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);

  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) {
    return left;
  }

  return upDistance <= upperLeftDistance ? up : upperLeft;
}

function toRgbaPixels(rawPixels: Uint8Array, colorType: number) {
  if (colorType === 6) {
    return rawPixels;
  }

  const channelCount = getChannelCount(colorType, "decoded PNG");
  const pixelCount = rawPixels.length / channelCount;
  const rgbaPixels = new Uint8Array(pixelCount * 4);

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const source = pixel * channelCount;
    const target = pixel * 4;

    if (colorType === 0) {
      const value = rawPixels[source];
      rgbaPixels[target] = value;
      rgbaPixels[target + 1] = value;
      rgbaPixels[target + 2] = value;
      rgbaPixels[target + 3] = 255;
      continue;
    }

    rgbaPixels[target] = rawPixels[source];
    rgbaPixels[target + 1] = rawPixels[source + 1];
    rgbaPixels[target + 2] = rawPixels[source + 2];
    rgbaPixels[target + 3] = 255;
  }

  return rgbaPixels;
}

function getChannelCount(colorType: number, file: string) {
  if (colorType === 6) {
    return 4;
  }

  if (colorType === 2) {
    return 3;
  }

  if (colorType === 0) {
    return 1;
  }

  throw new Error(`Unsupported PNG color type ${colorType}: ${file}`);
}

function parseThresholdNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
