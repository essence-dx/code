export type ActionRequestHeaders = {
  host?: string | null;
  origin?: string | null;
  referer?: string | null;
  xForwardedHost?: string | null;
  xForwardedProto?: string | null;
};

function normalizeOrigin(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

function originFromReferer(value: string | null | undefined) {
  return normalizeOrigin(value);
}

function normalizeHost(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

function requestOriginFromHeaders(headers: ActionRequestHeaders) {
  const host = normalizeHost(headers.xForwardedHost) ?? normalizeHost(headers.host);

  if (!host) {
    return null;
  }

  const protocol =
    headers.xForwardedProto?.split(",")[0]?.trim().toLowerCase() ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host}`;
}

export function getActionRequestOrigin(headers: ActionRequestHeaders) {
  return normalizeOrigin(headers.origin) ?? originFromReferer(headers.referer);
}

export function getTrustedActionOrigins(
  headers: ActionRequestHeaders,
  configuredOrigins: Array<string | null | undefined> = [],
) {
  return Array.from(
    new Set(
      [
        requestOriginFromHeaders(headers),
        ...configuredOrigins.map((origin) => normalizeOrigin(origin)),
      ].filter((origin): origin is string => Boolean(origin)),
    ),
  );
}

export function isTrustedActionRequest(
  headers: ActionRequestHeaders,
  configuredOrigins: Array<string | null | undefined> = [],
) {
  const actionOrigin = getActionRequestOrigin(headers);

  if (!actionOrigin) {
    return false;
  }

  return getTrustedActionOrigins(headers, configuredOrigins).includes(
    actionOrigin,
  );
}

export function isRecentSessionDate(
  value: Date | string | number | null | undefined,
  maxAgeSeconds: number,
  now = Date.now(),
) {
  const timestamp =
    value instanceof Date ? value.getTime() : new Date(value ?? 0).getTime();

  return (
    Number.isFinite(timestamp) &&
    timestamp > 0 &&
    now - timestamp <= maxAgeSeconds * 1000
  );
}
