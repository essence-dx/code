const MAX_BASE64_IMAGE_LENGTH = 16 * 1024 * 1024;
const BASE64_IMAGE_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export function normalizeBase64ImageData(value: string) {
  const payload = value.includes(",") ? value.split(",").at(-1) ?? "" : value;
  return payload.replace(/\s/g, "");
}

export function isValidBase64ImagePayload(value: string) {
  const normalized = normalizeBase64ImageData(value);
  return (
    normalized.length > 0 &&
    normalized.length <= MAX_BASE64_IMAGE_LENGTH &&
    normalized.length % 4 === 0 &&
    BASE64_IMAGE_PATTERN.test(normalized)
  );
}

export function decodeBase64ImagePayload(value: string) {
  const normalized = normalizeBase64ImageData(value);
  if (!isValidBase64ImagePayload(normalized)) {
    throw new Error("Generated image data is invalid.");
  }

  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function imageDataUrl(mediaType: string, base64: string) {
  return `data:${mediaType};base64,${normalizeBase64ImageData(base64)}`;
}
