import type { AdminPublicLinkStatus } from "@/features/admin/admin-public-link-observability-types";

export const publicLinkStatusWeight: Record<AdminPublicLinkStatus, number> = {
  blocked: 0,
  review: 1,
  ready: 2,
};

export function joinPublicLinkUrl(baseUrl: string, path: string) {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${cleanBase || "https://<deployment-url>"}${cleanPath}`;
}

export function getWorstPublicLinkStatus(
  statuses: AdminPublicLinkStatus[],
  fallback: AdminPublicLinkStatus = "ready",
) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return fallback;
}

export function getLatestPublicLinkIso(
  left: string | null,
  right: string | null,
) {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return new Date(right).getTime() > new Date(left).getTime() ? right : left;
}

export function normalizePublicLinkReferrerNotes(value: string | undefined) {
  if (!value?.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed)
          .filter((entry): entry is [string, string] => typeof entry[1] === "string")
          .map(([key, note]) => [key.trim(), note.trim()])
          .filter(([key, note]) => key && note),
      );
    }
  } catch {
    return parseDelimitedReferrerNotes(value);
  }

  return parseDelimitedReferrerNotes(value);
}

function parseDelimitedReferrerNotes(value: string) {
  return Object.fromEntries(
    value
      .split(";")
      .map((entry) => entry.split(":"))
      .map(([key = "", ...noteParts]) => [
        key.trim(),
        noteParts.join(":").trim(),
      ])
      .filter(([key, note]) => key && note),
  );
}
