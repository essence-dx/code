import type { ReleaseDeploymentCheckCategory, ReleaseDeploymentCheckStatus, ReleaseDeploymentChecklist } from "./release-deployment-checklist";

export interface ReleaseReadinessCategorySummary {
  category: ReleaseDeploymentCheckCategory;
  failCount: number;
  label: string;
  passCount: number;
  status: ReleaseDeploymentCheckStatus;
  totalCount: number;
  warningCount: number;
}

export interface ReleaseReadinessDashboardSummary {
  actionCommand: string;
  blockerCount: number;
  categories: ReleaseReadinessCategorySummary[];
  completionPercent: number;
  generatedAt: string;
  issueChecks: ReleaseDeploymentChecklist["checks"];
  passCount: number;
  status: ReleaseDeploymentCheckStatus;
  statusLabel: string;
  targetLabel: string;
  totalChecks: number;
  warningCount: number;
}

const categoryLabels: Record<ReleaseDeploymentCheckCategory, string> = {
  auth: "Auth",
  database: "Database",
  email: "Email",
  vercel: "Vercel",
};

const categoryOrder: ReleaseDeploymentCheckCategory[] = ["auth", "database", "email", "vercel"];

function statusFromCounts(failCount: number, warningCount: number): ReleaseDeploymentCheckStatus {
  if (failCount > 0) {
    return "fail";
  }

  return warningCount > 0 ? "warning" : "pass";
}

function statusLabel(status: ReleaseDeploymentCheckStatus) {
  if (status === "pass") {
    return "Ready";
  }

  return status === "warning" ? "Needs review" : "Blocked";
}

function targetLabel(target: ReleaseDeploymentChecklist["target"]) {
  return target.charAt(0).toUpperCase() + target.slice(1);
}

export function createReleaseReadinessDashboardSummary(
  checklist: ReleaseDeploymentChecklist,
  options: { actionCommand?: string } = {},
): ReleaseReadinessDashboardSummary {
  const totalChecks = checklist.checks.length;
  const passCount = checklist.checks.filter((check) => check.status === "pass").length;
  const completionPercent = totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 100;
  const categories = categoryOrder.map((category) => {
    const checks = checklist.checks.filter((check) => check.category === category);
    const failCount = checks.filter((check) => check.status === "fail").length;
    const warningCount = checks.filter((check) => check.status === "warning").length;
    const categoryPassCount = checks.filter((check) => check.status === "pass").length;

    return {
      category,
      failCount,
      label: categoryLabels[category],
      passCount: categoryPassCount,
      status: statusFromCounts(failCount, warningCount),
      totalCount: checks.length,
      warningCount,
    };
  });

  return {
    actionCommand: options.actionCommand ?? "bun run release:deployment:check",
    blockerCount: checklist.blockerCount,
    categories,
    completionPercent,
    generatedAt: checklist.generatedAt,
    issueChecks: checklist.checks.filter((check) => check.status !== "pass"),
    passCount,
    status: checklist.status,
    statusLabel: statusLabel(checklist.status),
    targetLabel: targetLabel(checklist.target),
    totalChecks,
    warningCount: checklist.warningCount,
  };
}
