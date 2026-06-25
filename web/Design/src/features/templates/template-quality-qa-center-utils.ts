import type {
  TemplateQualityFixPlan,
  TemplateQualityModerationRoute,
  TemplateQualityProfile,
  TemplateQualityQaPriority,
  TemplateQualityQaStatus,
  TemplateQualityReadiness,
} from "@/features/templates/template-quality-qa-center-types";

export function scoreToStatus(
  score: number,
  hasBlockedSignal = false,
): TemplateQualityQaStatus {
  if (hasBlockedSignal || score < 50) return "blocked";
  if (score < 85) return "review";

  return "ready";
}

export function statusToPriority(
  status: TemplateQualityQaStatus,
): TemplateQualityQaPriority {
  if (status === "blocked") return "high";
  if (status === "review") return "medium";

  return "low";
}

export function combineStatus(
  readiness: TemplateQualityReadiness[],
): TemplateQualityQaStatus {
  if (readiness.some((item) => item.status === "blocked")) return "blocked";
  if (readiness.some((item) => item.status === "review")) return "review";

  return "ready";
}

export function compareProfiles(
  left: TemplateQualityProfile,
  right: TemplateQualityProfile,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    left.score - right.score ||
    right.stats.views - left.stats.views ||
    left.templateName.localeCompare(right.templateName)
  );
}

export function compareModerationRoutes(
  left: TemplateQualityModerationRoute,
  right: TemplateQualityModerationRoute,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    priorityWeight(left.priority) - priorityWeight(right.priority) ||
    left.templateName.localeCompare(right.templateName) ||
    left.queueLabel.localeCompare(right.queueLabel)
  );
}

export function compareFixPlans(
  left: TemplateQualityFixPlan,
  right: TemplateQualityFixPlan,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    right.items.length - left.items.length ||
    left.score - right.score ||
    left.templateName.localeCompare(right.templateName)
  );
}

export function statusWeight(status: TemplateQualityQaStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

export function priorityWeight(priority: TemplateQualityQaPriority) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;

  return 2;
}

export function average(values: number[], fallback: number) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

export function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function daysBetween(now: Date, isoDate: string) {
  const timestamp = Date.parse(isoDate);

  if (Number.isNaN(timestamp)) return 0;

  return Math.max(
    0,
    Math.floor((now.getTime() - timestamp) / (24 * 60 * 60 * 1000)),
  );
}

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 2 && !genericNameTokens.has(token));
}

export function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

export function formatNames(names: string[]) {
  return names.slice(0, 3).join(", ");
}

export function formatShortDate(value: string) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) return "the latest update";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(timestamp);
}

const genericNameTokens = new Set([
  "campaign",
  "design",
  "kit",
  "page",
  "post",
  "project",
  "template",
]);
