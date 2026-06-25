import type { MaterialLayer, SceneDocument, SceneObject } from "../types";

export interface TextureOptimizationOptions {
  format: "image/jpeg" | "image/webp";
  maxSize: number;
  quality: number;
}

export interface TextureOptimizationResult {
  optimizedDocument: SceneDocument;
  optimizedTextureCount: number;
  originalBytes: number;
  savedBytes: number;
  skippedTextureCount: number;
}

function dataUrlBytes(sourceDataUrl: string) {
  const payload = sourceDataUrl.slice(sourceDataUrl.indexOf(",") + 1);

  if (sourceDataUrl.includes(";base64,")) {
    const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;

    return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
  }

  return payload.length;
}

function canOptimizeImage(sourceDataUrl?: string | null): sourceDataUrl is string {
  return Boolean(sourceDataUrl?.startsWith("data:image/") && !sourceDataUrl.startsWith("data:image/svg+xml"));
}

function loadImage(sourceDataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Texture could not be decoded."));
    image.src = sourceDataUrl;
  });
}

function fitSize(width: number, height: number, maxSize: number) {
  const scale = Math.min(1, maxSize / Math.max(width, height));

  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale)),
  };
}

async function optimizeDataUrl(sourceDataUrl: string, options: TextureOptimizationOptions) {
  const originalBytes = dataUrlBytes(sourceDataUrl);
  const image = await loadImage(sourceDataUrl);
  const { height, width } = fitSize(image.naturalWidth || image.width || 1, image.naturalHeight || image.height || 1, options.maxSize);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;

  if (!context) {
    return { nextSourceDataUrl: sourceDataUrl, optimized: false, originalBytes, savedBytes: 0 };
  }

  context.drawImage(image, 0, 0, width, height);
  const nextSourceDataUrl = canvas.toDataURL(options.format, options.quality);
  const nextBytes = dataUrlBytes(nextSourceDataUrl);

  if (nextBytes >= originalBytes) {
    return { nextSourceDataUrl: sourceDataUrl, optimized: false, originalBytes, savedBytes: 0 };
  }

  return {
    nextSourceDataUrl,
    optimized: true,
    originalBytes,
    savedBytes: originalBytes - nextBytes,
  };
}

async function optimizeOptionalSource(sourceDataUrl: string | null | undefined, options: TextureOptimizationOptions) {
  if (!canOptimizeImage(sourceDataUrl)) {
    return { nextSourceDataUrl: sourceDataUrl, optimized: false, originalBytes: 0, savedBytes: 0, skipped: Boolean(sourceDataUrl) };
  }

  return { ...(await optimizeDataUrl(sourceDataUrl, options)), skipped: false };
}

async function optimizeLayer(layer: MaterialLayer, options: TextureOptimizationOptions) {
  const result = await optimizeOptionalSource(layer.sourceDataUrl, options);

  return {
    layer: result.nextSourceDataUrl === layer.sourceDataUrl ? layer : { ...layer, sourceDataUrl: result.nextSourceDataUrl ?? undefined },
    result,
  };
}

async function optimizeObject(object: SceneObject, options: TextureOptimizationOptions) {
  let optimizedTextureCount = 0;
  let originalBytes = 0;
  let savedBytes = 0;
  let skippedTextureCount = 0;
  const materialTexture = await optimizeOptionalSource(object.material.textureDataUrl, options);
  const imageTexture = await optimizeOptionalSource(object.image?.sourceDataUrl, options);
  const nextLayers = await Promise.all((object.material.layers ?? []).map((layer) => optimizeLayer(layer, options)));

  for (const result of [materialTexture, imageTexture, ...nextLayers.map((entry) => entry.result)]) {
    originalBytes += result.originalBytes;
    savedBytes += result.savedBytes;
    optimizedTextureCount += result.optimized ? 1 : 0;
    skippedTextureCount += result.skipped ? 1 : 0;
  }

  return {
    object: {
      ...object,
      image: object.image && imageTexture.nextSourceDataUrl ? { ...object.image, sourceDataUrl: imageTexture.nextSourceDataUrl } : object.image,
      material: {
        ...object.material,
        layers: nextLayers.length > 0 ? nextLayers.map((entry) => entry.layer) : object.material.layers,
        textureDataUrl: materialTexture.nextSourceDataUrl ?? object.material.textureDataUrl,
      },
    },
    optimizedTextureCount,
    originalBytes,
    savedBytes,
    skippedTextureCount,
  };
}

export async function optimizeSceneTextureAssets(document: SceneDocument, options: TextureOptimizationOptions): Promise<TextureOptimizationResult> {
  const objects = await Promise.all(document.objects.map((object) => optimizeObject(object, options)));

  return {
    optimizedDocument: {
      ...document,
      objects: objects.map((entry) => entry.object),
      updatedAt: new Date().toISOString(),
    },
    optimizedTextureCount: objects.reduce((total, entry) => total + entry.optimizedTextureCount, 0),
    originalBytes: objects.reduce((total, entry) => total + entry.originalBytes, 0),
    savedBytes: objects.reduce((total, entry) => total + entry.savedBytes, 0),
    skippedTextureCount: objects.reduce((total, entry) => total + entry.skippedTextureCount, 0),
  };
}
