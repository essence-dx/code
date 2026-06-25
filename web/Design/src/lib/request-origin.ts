export type RequestOriginHeaders = {
  get(name: string): string | null;
};

export function getRequestOrigin(headers: RequestOriginHeaders) {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) return undefined;

  const protocol = headers.get("x-forwarded-proto") ?? "https";

  return `${protocol}://${host}`;
}
