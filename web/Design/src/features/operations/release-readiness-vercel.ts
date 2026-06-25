import type {
  ReleaseReadinessContext,
  ReleaseReadinessGate,
  ReleaseReadinessItem,
} from "@/features/operations/release-readiness-types";
import {
  average,
  operationalStatusLabel,
  operationalStatusToReleaseStatus,
  scoreToStatus,
  statusScore,
} from "@/features/operations/release-readiness-utils";

export function createVercelDeploymentGate(
  context: ReleaseReadinessContext,
): ReleaseReadinessGate {
  const vercelGroup = context.health?.groups.find((group) => group.id === "vercel");
  const completedExports = context.serverExportJobs.filter(
    (job) => job.status === "completed",
  );
  const publishedSites = context.websitePublishes.filter(
    (publish) => publish.status === "published",
  );
  const items: ReleaseReadinessItem[] = [
    vercelGroup
      ? {
          id: "vercel-runtime",
          title: "Vercel runtime signals",
          detail:
            vercelGroup.checks.find((check) => check.status !== "healthy")
              ?.detail ?? "Vercel runtime and public URL checks are available.",
          href: null,
          status: operationalStatusToReleaseStatus(vercelGroup.status),
          badge: operationalStatusLabel(vercelGroup.status),
          meta: vercelGroup.checks.map((check) => check.label),
        }
      : {
          id: "vercel-runtime",
          title: "Vercel runtime signals",
          detail:
            "Admin health data is required to include Vercel runtime metadata in the confidence packet.",
          href: null,
          status: "review",
          badge: "Admin required",
          meta: [],
        },
    {
      id: "release-artifacts",
      title: "Release artifacts",
      detail: completedExports.length
        ? "Completed export artifacts are available for release confidence review."
        : "Create at least one completed server export before deployment.",
      href: null,
      status: completedExports.length ? "ready" : "review",
      badge: `${completedExports.length} exports`,
      meta: [
        `${context.serverExportJobs.length} jobs`,
        `${context.serverExportJobs.filter((job) => job.status === "failed").length} failed`,
      ],
    },
    {
      id: "public-surface",
      title: "Public surface",
      detail: publishedSites.length
        ? "Published website surfaces are represented in deployment confidence."
        : "Publish or verify at least one website surface before public release.",
      href: null,
      status: publishedSites.length ? "ready" : "review",
      badge: `${publishedSites.length} sites`,
      meta: [`${context.websitePublishes.length} website records`],
    },
  ];
  const score = average(items.map((item) => statusScore(item.status)));

  return {
    id: "vercel-deployment",
    title: "Vercel deployment confidence",
    description:
      "Runtime metadata, release artifacts, and public surfaces exported into a downloadable confidence packet.",
    status: scoreToStatus(score, items.some((item) => item.status === "blocked")),
    score,
    metricLabel: "ready signals",
    metricValue: items.filter((item) => item.status === "ready").length,
    items,
  };
}
