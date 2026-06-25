"use client";

import Dexie, { type EntityTable } from "dexie";
import { createId } from "@/lib/editor/factory";
import type { BrandFontAsset } from "@/lib/editor/types";
import { isDesktopRuntime } from "@/lib/runtime/client-api";

interface StoredBrandFontAsset extends BrandFontAsset {
  blob: Blob;
}

const db = new Dexie("essence-kapwing-brand-fonts") as Dexie & {
  fonts: EntityTable<StoredBrandFontAsset, "id">;
};

db.version(1).stores({
  fonts: "id, family, name, createdAt",
});

const allowedFontExtensions = [".ttf", ".otf", ".woff", ".woff2"];
const desktopFontDirectory = "fonts";
const allowedFontMimeTypes = new Set([
  "font/ttf",
  "font/otf",
  "font/woff",
  "font/woff2",
  "application/font-woff",
  "application/font-woff2",
  "application/x-font-ttf",
  "application/x-font-otf",
]);
const maxFontBytes = 25 * 1024 * 1024;

export async function saveBrowserBrandFont(file: File): Promise<BrandFontAsset> {
  if (!isSupportedFontFile(file)) {
    throw new UnsupportedBrandFontError();
  }

  const id = createId("brand_font");
  const now = new Date().toISOString();
  const family = fontFamilyFromFile(file.name, id);
  const baseAsset = {
    id,
    name: cleanFontDisplayName(file.name),
    family,
    mimeType: file.type || mimeTypeFromFontName(file.name),
    size: file.size,
    createdAt: now,
  };

  if (isDesktopRuntime()) {
    const asset: BrandFontAsset = {
      ...baseAsset,
      storageKey: desktopFontStorageKey(id, file.name),
      source: "tauri-fs",
    };

    await saveTauriBrandFont(asset.storageKey, new Uint8Array(await file.arrayBuffer()));
    await loadFontFace({ ...asset, blob: file });
    return asset;
  }

  const asset: StoredBrandFontAsset = {
    ...baseAsset,
    storageKey: id,
    source: "browser-indexeddb",
    blob: file,
  };

  await loadFontFace(asset);
  await db.fonts.put(asset);
  const { blob, ...publicAsset } = asset;
  void blob;
  return publicAsset;
}

export async function loadBrandFontFaces(fontAssets: BrandFontAsset[]) {
  let loaded = 0;
  let failed = 0;

  for (const asset of fontAssets) {
    try {
      const stored = asset.source === "tauri-fs" ? await loadTauriBrandFont(asset) : await db.fonts.get(asset.storageKey);
      if (!stored) {
        failed += 1;
        continue;
      }

      await loadFontFace({ ...asset, blob: stored.blob });
      loaded += 1;
    } catch {
      failed += 1;
    }
  }

  return { loaded, failed };
}

export function isSupportedFontFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return (
    file.size > 0 &&
    file.size <= maxFontBytes &&
    (allowedFontMimeTypes.has(file.type) || allowedFontExtensions.some((extension) => lowerName.endsWith(extension)))
  );
}

export class UnsupportedBrandFontError extends Error {
  constructor() {
    super("Choose a TTF, OTF, WOFF, or WOFF2 font under 25 MB.");
    this.name = "UnsupportedBrandFontError";
  }
}

async function loadFontFace(asset: StoredBrandFontAsset) {
  if (typeof FontFace === "undefined" || typeof document === "undefined") return;
  if (document.fonts.check(`12px ${asset.family}`)) return;

  const url = URL.createObjectURL(asset.blob);
  try {
    const face = new FontFace(asset.family, `url(${url})`);
    const loadedFace = await face.load();
    document.fonts.add(loadedFace);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function saveTauriBrandFont(storageKey: string, bytes: Uint8Array) {
  const { writeFile, mkdir, exists, BaseDirectory } = await import("@tauri-apps/plugin-fs");
  const hasDirectory = await exists(desktopFontDirectory, { baseDir: BaseDirectory.AppLocalData }).catch(() => false);
  if (!hasDirectory) {
    await mkdir(desktopFontDirectory, { baseDir: BaseDirectory.AppLocalData, recursive: true });
  }

  await writeFile(storageKey, bytes, { baseDir: BaseDirectory.AppLocalData });
}

async function loadTauriBrandFont(asset: BrandFontAsset): Promise<StoredBrandFontAsset | undefined> {
  if (!isDesktopRuntime() || asset.source !== "tauri-fs") return undefined;

  const { readFile, BaseDirectory } = await import("@tauri-apps/plugin-fs");
  const bytes = isAppLocalBrandFontKey(asset.storageKey)
    ? await readFile(asset.storageKey, { baseDir: BaseDirectory.AppLocalData })
    : await readFile(asset.storageKey);

  return {
    ...asset,
    blob: new Blob([bytes], { type: asset.mimeType || mimeTypeFromFontName(asset.name) }),
  };
}

function desktopFontStorageKey(id: string, name: string) {
  const extension = extensionFromName(name) ?? "ttf";
  return `${desktopFontDirectory}/${id}.${extension}`;
}

function isAppLocalBrandFontKey(storageKey: string) {
  return storageKey.startsWith(`${desktopFontDirectory}/`) && !storageKey.includes("..") && !storageKey.includes("\\");
}

function fontFamilyFromFile(name: string, id: string) {
  const basename = cleanFontDisplayName(name)
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return `EssenceFont_${basename || "Custom"}_${id.slice(-8)}`;
}

function cleanFontDisplayName(name: string) {
  return name.trim().replace(/\s+/g, " ").slice(0, 120) || "Custom font";
}

function mimeTypeFromFontName(name: string) {
  const lowerName = name.toLowerCase();
  if (lowerName.endsWith(".woff2")) return "font/woff2";
  if (lowerName.endsWith(".woff")) return "font/woff";
  if (lowerName.endsWith(".otf")) return "font/otf";
  return "font/ttf";
}

function extensionFromName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();
  return extension && allowedFontExtensions.includes(`.${extension}`) ? extension : undefined;
}
