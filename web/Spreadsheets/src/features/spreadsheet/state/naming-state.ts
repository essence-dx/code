export function normalizeNamedRangeName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_.]/g, "")
    .replace(/^[^A-Za-z_]+/, "")
    .slice(0, 80);
}

export function normalizeTableName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "")
    .replace(/^[^A-Za-z_]+/, "")
    .slice(0, 80);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function replaceRawText(
  raw: string,
  query: string,
  replacement: string,
  replaceAll: boolean,
) {
  if (!query) {
    return raw;
  }

  return raw.replace(
    new RegExp(escapeRegExp(query), replaceAll ? "gi" : "i"),
    replacement,
  );
}
