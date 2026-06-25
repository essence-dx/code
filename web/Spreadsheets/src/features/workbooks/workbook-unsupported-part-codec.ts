const PACKAGE_ROOT_PREFIX = "Root Entry/";

export const XML_TEXT_DECODER = new TextDecoder();
export const XML_TEXT_ENCODER = new TextEncoder();

export function bytesToBase64(bytes: Uint8Array) {
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.slice(offset, offset + 0x8000));
  }

  return btoa(binary);
}

export function base64ToBytes(value: string) {
  const binary = atob(value);

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function bytesToText(bytes: Uint8Array) {
  return XML_TEXT_DECODER.decode(bytes);
}

export function textToBytes(value: string) {
  return XML_TEXT_ENCODER.encode(value);
}

export function rawContentToBytes(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }

  if (typeof value === "string") {
    return Uint8Array.from(value, (character) => character.charCodeAt(0));
  }

  return null;
}

export function normalizePackagePath(path: string) {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(new RegExp(`^${PACKAGE_ROOT_PREFIX}`), "")
    .trim();
}

export function toArrayBuffer(value: unknown): ArrayBuffer {
  if (value instanceof ArrayBuffer) {
    return value;
  }

  if (value instanceof Uint8Array) {
    const copy = new Uint8Array(value.byteLength);

    copy.set(value);

    return copy.buffer;
  }

  const bytes = rawContentToBytes(value);

  return bytes ? toArrayBuffer(bytes) : new ArrayBuffer(0);
}
