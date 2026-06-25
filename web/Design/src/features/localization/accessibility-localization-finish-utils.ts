import type {
  AccessibilityLocalizationItem,
  AccessibilityLocalizationSection,
  AccessibilityLocalizationSectionId,
  AccessibilityLocalizationStatus,
} from "@/features/localization/accessibility-localization-finish-types";

export function createSection(input: {
  id: AccessibilityLocalizationSectionId;
  title: string;
  description: string;
  metricLabel: string;
  emptyState: string;
  items: AccessibilityLocalizationItem[];
}): AccessibilityLocalizationSection {
  const blockedCount = input.items.filter((item) => item.status === "blocked")
    .length;
  const reviewCount = input.items.filter((item) => item.status === "review")
    .length;
  const score = Math.max(0, 100 - blockedCount * 30 - reviewCount * 12);

  return {
    id: input.id,
    title: input.title,
    description: input.description,
    status: scoreToStatus(score, blockedCount > 0),
    score,
    metricLabel: input.metricLabel,
    metricValue: input.items.length,
    emptyState: input.emptyState,
    items: input.items.sort(compareItems).slice(0, 8),
  };
}

export function createHandoffExport(input: {
  generatedAt: string;
  score: number;
  status: AccessibilityLocalizationStatus;
  sections: AccessibilityLocalizationSection[];
}) {
  const payload = {
    product: "Essence Studio finishing packet",
    generatedAt: input.generatedAt,
    score: input.score,
    status: input.status,
    sections: input.sections.map((section) => ({
      id: section.id,
      title: section.title,
      score: section.score,
      status: section.status,
      openItems: section.metricValue,
      items: section.items.map((item) => ({
        title: item.title,
        detail: item.detail,
        status: item.status,
        meta: item.meta,
      })),
    })),
  };

  return {
    fileName: "essence-finishing-packet.json",
    generatedAt: input.generatedAt,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(payload, null, 2),
    )}`,
  };
}

export function createNextActions(sections: AccessibilityLocalizationSection[]) {
  return sections
    .filter((section) => section.status !== "ready")
    .sort((left, right) => left.score - right.score)
    .map((section) => {
      const item = section.items.find((candidate) => candidate.status !== "ready");

      return item
        ? `${section.title}: ${item.title} - ${item.detail}`
        : `${section.title}: ${section.emptyState}`;
    })
    .slice(0, 4);
}

export function average(values: number[]) {
  if (!values.length) return 0;

  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

export function scoreToStatus(
  score: number,
  hasBlocked: boolean,
): AccessibilityLocalizationStatus {
  if (hasBlocked || score < 50) return "blocked";
  if (score < 85) return "review";

  return "ready";
}

function compareItems(
  left: AccessibilityLocalizationItem,
  right: AccessibilityLocalizationItem,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    left.title.localeCompare(right.title)
  );
}

function statusWeight(status: AccessibilityLocalizationStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}
