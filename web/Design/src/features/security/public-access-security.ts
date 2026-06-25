const routeTokenPattern = /^[A-Za-z0-9_-]{16,80}$/;
const projectAssetIdPattern = /^asset-[a-f0-9]{4,16}$/;
const elementRouteTokenPattern = /^[A-Za-z0-9_-]{1,160}$/;

export function isValidPublicShareId(value: string) {
  return routeTokenPattern.test(value);
}

export function isValidEditShareId(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && routeTokenPattern.test(value);
}

export function isValidProjectRouteId(value: string) {
  return routeTokenPattern.test(value);
}

export function isValidProjectAssetId(value: string) {
  return projectAssetIdPattern.test(value);
}

export function isValidElementRouteToken(value: string) {
  return elementRouteTokenPattern.test(value);
}

export function createPublicAssetHeaders(mimeType: string) {
  return {
    "cache-control": "public, max-age=31536000, immutable",
    "content-type": mimeType,
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-robots-tag": "noindex, nofollow, noarchive",
  };
}

export function createNoStoreJsonHeaders() {
  return {
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  };
}
