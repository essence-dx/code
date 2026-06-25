"use client";

import * as THREE from "three";

const objectUrlCache = new Map<string, string>();

export function enableThreeResourceCache() {
  THREE.Cache.enabled = true;
}

export function getCachedObjectUrl(sourceDataUrl: string) {
  const cachedUrl = objectUrlCache.get(sourceDataUrl);

  if (cachedUrl) {
    return cachedUrl;
  }

  const commaIndex = sourceDataUrl.indexOf(",");

  if (commaIndex === -1) {
    throw new Error("Invalid data URL.");
  }

  const metadata = sourceDataUrl.slice(0, commaIndex);
  const payload = sourceDataUrl.slice(commaIndex + 1);
  const mimeType =
    metadata.match(/^data:([^;]+)/)?.[1] || "application/octet-stream";
  const binary = metadata.includes(";base64")
    ? atob(payload)
    : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const objectUrl = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  objectUrlCache.set(sourceDataUrl, objectUrl);

  return objectUrl;
}
