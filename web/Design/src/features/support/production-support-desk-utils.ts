import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  ProductionSupportDeskStatus,
  ProductionSupportIssue,
  ProductionSupportSeverity,
} from "@/features/support/production-support-desk-types";

export function createIssueStatus(
  severity: ProductionSupportSeverity,
): ProductionSupportDeskStatus {
  if (severity === "urgent") return "urgent";
  if (severity === "high" || severity === "medium") return "triage";

  return "ready";
}

export function createDeskStatus(
  issues: ProductionSupportIssue[],
): ProductionSupportDeskStatus {
  if (issues.some((issue) => issue.severity === "urgent")) return "urgent";
  if (issues.length) return "triage";

  return "ready";
}

export function scoreSupportDesk(issues: ProductionSupportIssue[]) {
  const penalty = issues.reduce((total, issue) => {
    if (issue.severity === "urgent") return total + 28;
    if (issue.severity === "high") return total + 18;
    if (issue.severity === "medium") return total + 10;

    return total + 5;
  }, 0);

  return Math.max(0, Math.min(100, 100 - penalty));
}

export function sortIssues(issues: ProductionSupportIssue[]) {
  return [...issues].sort(
    (left, right) =>
      severityWeight(right.severity) - severityWeight(left.severity) ||
      Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
      left.title.localeCompare(right.title),
  );
}

export function findAuditContext(input: {
  logs: WorkspaceAuditLogSummary[];
  projectId: string;
  targetIds?: string[];
}) {
  const targets = new Set([input.projectId, ...(input.targetIds ?? [])]);

  return input.logs
    .filter(
      (log) =>
        (log.targetId && targets.has(log.targetId)) ||
        String(log.metadata.projectId ?? "") === input.projectId,
    )
    .sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    )
    .slice(0, 4);
}

export function createResolutionDownload(input: {
  projectId: string;
  issueId: string;
  projectName: string;
  summary: string;
  auditLogIds: string[];
  checklist: string[];
}) {
  const json = JSON.stringify(
    {
      kind: "essence-studio.support-resolution-packet",
      version: 1,
      projectId: input.projectId,
      issueId: input.issueId,
      projectName: input.projectName,
      summary: input.summary,
      auditLogIds: input.auditLogIds,
      checklist: input.checklist,
    },
    null,
    2,
  );

  return {
    fileName: `support-resolution-${slugify(input.projectId)}.json`,
    href: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    json,
  };
}

export function isPastDue(value: string | null, now: Date) {
  if (!value) return false;

  return Date.parse(value) < now.getTime();
}

export function severityWeight(severity: ProductionSupportSeverity) {
  if (severity === "urgent") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;

  return 1;
}

export function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}
