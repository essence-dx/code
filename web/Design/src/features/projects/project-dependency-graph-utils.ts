import type { ProjectDependencyGraphStatus } from "@/features/projects/project-dependency-graph-types";

export function projectNodeId(projectId: string) {
  return `project-${projectId}`;
}

export function packageNodeId(templateId: string) {
  return `package-${templateId}`;
}

export function exportNodeId(exportId: string) {
  return `export-${exportId}`;
}

export function websiteNodeId(publishId: string) {
  return `website-${publishId}`;
}

export function campaignNodeId(campaignId: string) {
  return `campaign-${campaignId}`;
}

export function publicLinkNodeId(projectId: string, kind: "view" | "edit") {
  return `public-link-${kind}-${projectId}`;
}

export function scoreToStatus(
  score: number,
  hasBlockedRisk: boolean,
): ProjectDependencyGraphStatus {
  if (hasBlockedRisk || score < 50) return "blocked";
  if (score < 85) return "review";

  return "ready";
}

export function statusScore(status: ProjectDependencyGraphStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 65;

  return 0;
}

export function statusWeight(status: ProjectDependencyGraphStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

export function average(values: number[]) {
  if (!values.length) return 100;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

export function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  const uniqueItems: T[] = [];

  for (const item of items) {
    if (seen.has(item.id)) continue;

    seen.add(item.id);
    uniqueItems.push(item);
  }

  return uniqueItems;
}
