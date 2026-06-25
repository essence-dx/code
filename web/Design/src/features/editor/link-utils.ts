export function getSafeHttpUrl(value?: string | null) {
  if (!value) return "";

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

export function getUrlHost(value?: string | null) {
  const safeUrl = getSafeHttpUrl(value);

  if (!safeUrl) return "";

  return new URL(safeUrl).host;
}
