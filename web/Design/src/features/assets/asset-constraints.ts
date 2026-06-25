export const acceptedImageMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
] as const;

export const acceptedVideoMimeTypes = [
  "video/mp4",
  "video/webm",
  "video/ogg",
] as const;

export const acceptedAudioMimeTypes = [
  "audio/aac",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
] as const;

export const acceptedDocumentMimeTypes = ["application/pdf"] as const;

export const acceptedAssetMimeTypes = [
  ...acceptedImageMimeTypes,
  ...acceptedVideoMimeTypes,
  ...acceptedAudioMimeTypes,
  ...acceptedDocumentMimeTypes,
] as const;

export const maxAssetBytes = 2_500_000;
export const maxMediaAssetBytes = 8_000_000;
export const maxAssetDataUrlLength = 11_000_000;

export type AcceptedImageMimeType = (typeof acceptedImageMimeTypes)[number];
export type AcceptedVideoMimeType = (typeof acceptedVideoMimeTypes)[number];
export type AcceptedAudioMimeType = (typeof acceptedAudioMimeTypes)[number];
export type AcceptedDocumentMimeType =
  (typeof acceptedDocumentMimeTypes)[number];
export type AcceptedAssetMimeType = (typeof acceptedAssetMimeTypes)[number];

export function isAcceptedImageMimeType(
  mimeType: string,
): mimeType is AcceptedImageMimeType {
  return acceptedImageMimeTypes.some((accepted) => accepted === mimeType);
}

export function isAcceptedVideoMimeType(
  mimeType: string,
): mimeType is AcceptedVideoMimeType {
  return acceptedVideoMimeTypes.some((accepted) => accepted === mimeType);
}

export function isAcceptedAudioMimeType(
  mimeType: string,
): mimeType is AcceptedAudioMimeType {
  return acceptedAudioMimeTypes.some((accepted) => accepted === mimeType);
}

export function isAcceptedDocumentMimeType(
  mimeType: string,
): mimeType is AcceptedDocumentMimeType {
  return acceptedDocumentMimeTypes.some((accepted) => accepted === mimeType);
}

export function isAcceptedAssetMimeType(
  mimeType: string,
): mimeType is AcceptedAssetMimeType {
  return acceptedAssetMimeTypes.some((accepted) => accepted === mimeType);
}

export function getMaxAssetBytes(mimeType: string) {
  return isAcceptedVideoMimeType(mimeType) ||
    isAcceptedAudioMimeType(mimeType) ||
    isAcceptedDocumentMimeType(mimeType)
    ? maxMediaAssetBytes
    : maxAssetBytes;
}
