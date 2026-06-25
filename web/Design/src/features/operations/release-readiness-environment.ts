import type { OperationalHealthGroup } from "@/features/operations/operational-health";
import type {
  ReleaseReadinessContext,
  ReleaseReadinessGate,
  ReleaseReadinessItem,
} from "@/features/operations/release-readiness-types";
import {
  average,
  operationalStatusToReleaseStatus,
  scoreToStatus,
  statusScore,
} from "@/features/operations/release-readiness-utils";

export function createEnvironmentGate(
  context: ReleaseReadinessContext,
): ReleaseReadinessGate {
  if (!context.health) {
    return {
      id: "environment",
      title: "Environment checks",
      description:
        "Database, auth, email, storage, Vercel, and Tauri readiness from the admin health report.",
      status: "review",
      score: 55,
      metricLabel: "health groups",
      metricValue: 0,
      items: [
        {
          id: "admin-health-report",
          title: "Admin health report",
          detail:
            "Sign in as an admin account to include live environment health in the release gate.",
          status: "review",
          badge: "Admin required",
          meta: [context.generatedAt],
          href: null,
        },
      ],
    };
  }

  const items = context.health.groups.map(createEnvironmentItem);
  const score = average(items.map((item) => statusScore(item.status)));

  return {
    id: "environment",
    title: "Environment checks",
    description:
      "Database, auth, email, storage, Vercel, and Tauri readiness from the admin health report.",
    status: scoreToStatus(score, items.some((item) => item.status === "blocked")),
    score,
    metricLabel: "healthy groups",
    metricValue: items.filter((item) => item.status === "ready").length,
    items,
  };
}

function createEnvironmentItem(
  group: OperationalHealthGroup,
): ReleaseReadinessItem {
  const blockedChecks = group.checks.filter((check) => check.status === "critical");
  const reviewChecks = group.checks.filter((check) => check.status === "warning");
  const status = operationalStatusToReleaseStatus(group.status);

  return {
    id: group.id,
    title: group.title,
    detail:
      blockedChecks[0]?.detail ??
      reviewChecks[0]?.detail ??
      `${group.description} All checks are release-ready.`,
    status,
    badge:
      status === "ready"
        ? "Healthy"
        : `${blockedChecks.length + reviewChecks.length} issue${
            blockedChecks.length + reviewChecks.length === 1 ? "" : "s"
          }`,
    meta: group.checks.map((check) =>
      check.metric ? `${check.label}: ${check.metric}` : check.label,
    ),
    href: null,
  };
}
