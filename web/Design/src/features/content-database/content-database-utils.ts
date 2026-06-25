import type {
  ContentDatabaseRecordKind,
  ContentDatabaseStatus,
  ContentTemplateSurface,
} from "@/features/content-database/content-database-types";

export const surfaceDefinitions: Array<{
  surface: ContentTemplateSurface;
  label: string;
}> = [
  { surface: "text", label: "Text layers" },
  { surface: "table", label: "Table cells" },
  { surface: "website", label: "Website sections" },
  { surface: "email", label: "Email blocks" },
  { surface: "social", label: "Social templates" },
];

export const recordKindOrder: Record<ContentDatabaseRecordKind, number> = {
  "brand-copy": 0,
  product: 1,
  pricing: 2,
  person: 3,
  event: 4,
  "campaign-variable": 5,
};

export function extractPricing(text: string) {
  const matches: Array<{
    label: string;
    variableKey: string;
    value: string;
    excerpt: string;
  }> = [];
  const matcher =
    /(?:\$\s?\d+(?:[.,]\d+)?|[A-Z]{3}\s?\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s?%)/g;
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(text))) {
    const value = match[0].replace(/\s+/g, "");
    const context = text.slice(
      Math.max(0, match.index - 40),
      Math.min(text.length, match.index + value.length + 40),
    );
    const earlyBird = /early[-\s]?bird/i.test(context);

    matches.push({
      label: earlyBird ? "Early-bird price" : "Pricing detail",
      variableKey: earlyBird
        ? "early_bird_price"
        : `price_${matches.length + 1}`,
      value,
      excerpt: trimText(context, 160),
    });
  }

  return matches;
}

export function inferProductName(name: string, brief: string) {
  const fromName = name
    .replace(
      /\b(launch|campaign|preorder|sale|story|email|website|hero)\b.*$/i,
      "",
    )
    .trim();

  if (fromName.split(/\s+/).length >= 2) return trimText(fromName, 80);

  const subscriptionMatch = brief.match(
    /\b(?:the\s+)?([A-Z][A-Za-z0-9-]*(?:\s+[A-Z][A-Za-z0-9-]*){1,4}\s+subscription)\b/,
  );

  if (subscriptionMatch?.[1]) return trimText(subscriptionMatch[1], 80);

  const firstWords = brief
    .replace(/[^\w\s-]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(" ");

  return firstWords || name;
}

export function inferProjectSurface(
  name: string,
  width: number,
  height: number,
): ContentTemplateSurface {
  const normalized = name.toLowerCase();

  if (normalized.includes("email") || normalized.includes("newsletter")) {
    return "email";
  }

  if (normalized.includes("website") || normalized.includes("landing")) {
    return "website";
  }

  if (normalized.includes("table") || normalized.includes("pricing")) {
    return "table";
  }

  if (height > width || width <= 1200) return "social";

  return "website";
}

export function mapChannelToSurface(channel: string): ContentTemplateSurface {
  const normalized = channel.toLowerCase();

  if (normalized.includes("email") || normalized.includes("newsletter")) {
    return "email";
  }

  if (normalized.includes("website") || normalized.includes("site")) {
    return "website";
  }

  return "social";
}

export function sortSurfaces(surfaces: ContentTemplateSurface[]) {
  const order = new Map(
    surfaceDefinitions.map((definition, index) => [definition.surface, index]),
  );

  return [...new Set(surfaces)].sort(
    (left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0),
  );
}

export function uniqueSurfaces(surfaces: ContentTemplateSurface[]) {
  return sortSurfaces(surfaces.filter(Boolean));
}

export function getSurfaceLabel(surface: ContentTemplateSurface) {
  return (
    surfaceDefinitions.find((definition) => definition.surface === surface)
      ?.label ?? surface
  );
}

export function formatDateValue(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toISOString().slice(0, 10);
}

export function normalizeContentValue(value: string | null | undefined) {
  return trimText(String(value ?? "").replace(/\s+/g, " "), 500);
}

export function normalizeVariableKey(value: string) {
  return slugify(value).replace(/-/g, "_");
}

export function normalizeDedupeValue(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "item";
}

export function trimText(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function mergeStatus(
  left: ContentDatabaseStatus,
  right: ContentDatabaseStatus,
): ContentDatabaseStatus {
  if (left === "blocked" || right === "blocked") return "blocked";
  if (left === "review" || right === "review") return "review";

  return "ready";
}
