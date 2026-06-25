import type {
  ReleaseReadinessContext,
  ReleaseReadinessGate,
  ReleaseReadinessItem,
  ReleaseRouteDefinition,
} from "@/features/operations/release-readiness-types";
import { releaseRouteDefinitions } from "@/features/operations/release-readiness-types";
import {
  coverageScore,
  scoreToStatus,
} from "@/features/operations/release-readiness-utils";

export function createRouteCoverageGate(
  context: ReleaseReadinessContext,
): ReleaseReadinessGate {
  const routeItems = releaseRouteDefinitions.map((route) =>
    createRouteCoverageItem(route, context),
  );
  const criticalItems = routeItems.filter((item) =>
    releaseRouteDefinitions.find((route) => route.id === item.id)?.critical,
  );
  const coveredCriticalRoutes = criticalItems.filter(
    (item) => item.status !== "blocked",
  ).length;
  const score = coverageScore(coveredCriticalRoutes, criticalItems.length);

  return {
    id: "route-coverage",
    title: "Route coverage",
    description:
      "Critical App Router pages and route handlers backed by the minimum data needed for a release smoke pass.",
    status: scoreToStatus(
      score,
      criticalItems.some((item) => item.status === "blocked"),
    ),
    score,
    metricLabel: "covered critical routes",
    metricValue: coveredCriticalRoutes,
    items: routeItems,
  };
}

function createRouteCoverageItem(
  route: ReleaseRouteDefinition,
  context: ReleaseReadinessContext,
): ReleaseReadinessItem {
  const publishedWebsites = context.websitePublishes.filter(
    (publish) => publish.status === "published",
  );
  const completedExports = context.serverExportJobs.filter(
    (job) => job.status === "completed",
  );
  const routeContext: Record<ReleaseRouteDefinition["requirement"], number> = {
    always: 1,
    project: context.activeProjects.length,
    template: context.templates.length,
    share: context.activeProjects.filter(
      (project) => project.publicShareId || project.editShareId,
    ).length,
    website: publishedWebsites.length,
    "email-export": completedExports.length,
    "project-version": context.projectVersions.length,
    "auth-email": context.authEmails.filter(
      (email) => email.purpose === "email-verification",
    ).length,
  };
  const count = routeContext[route.requirement];
  const covered = count > 0 || route.requirement === "always";

  return {
    id: route.id,
    title: route.label,
    detail: covered
      ? `${route.path} is included in the release smoke map.`
      : createRouteGapDetail(route.requirement),
    status: covered ? "ready" : route.critical ? "blocked" : "review",
    badge: covered ? "Covered" : "Needs seed data",
    href: route.area === "app" && route.requirement === "always" ? route.path : null,
    meta: [route.path, route.source, route.critical ? "Critical" : "Support"],
  };
}

function createRouteGapDetail(
  requirement: ReleaseRouteDefinition["requirement"],
) {
  if (requirement === "project") {
    return "Create an active project so this route can be covered in release smoke checks.";
  }
  if (requirement === "template") {
    return "Add at least one template so template routes can be checked.";
  }
  if (requirement === "share") {
    return "Create public or editable share links before release smoke checks.";
  }
  if (requirement === "website") {
    return "Publish at least one website before checking public website routes.";
  }
  if (requirement === "email-export") {
    return "Complete a server export before checking email export confidence.";
  }
  if (requirement === "project-version") {
    return "Create at least one project version before checking restore routes.";
  }
  if (requirement === "auth-email") {
    return "Generate an email verification message before checking the auth email route.";
  }

  return "This route needs release seed data.";
}
