import { createSeededAccountGate } from "@/features/operations/release-readiness-account";
import { createEnvironmentGate } from "@/features/operations/release-readiness-environment";
import { createMigrationDriftGate } from "@/features/operations/release-readiness-migration";
import { createRouteCoverageGate } from "@/features/operations/release-readiness-routes";
import {
  releaseRouteDefinitions,
  type ReleaseReadinessContext,
  type ReleaseReadinessGate,
  type ReleaseReadinessInput,
  type ReleaseReadinessPacket,
  type ReleaseReadinessReport,
} from "@/features/operations/release-readiness-types";
import { createVercelDeploymentGate } from "@/features/operations/release-readiness-vercel";
import {
  average,
  createLatestVersionMap,
  createNextActions,
  scoreToStatus,
} from "@/features/operations/release-readiness-utils";

export type {
  ReleaseReadinessGate,
  ReleaseReadinessGateId,
  ReleaseReadinessInput,
  ReleaseReadinessItem,
  ReleaseReadinessPacket,
  ReleaseReadinessReport,
  ReleaseReadinessStatus,
  ReleaseRouteDefinition,
} from "@/features/operations/release-readiness-types";

export function createReleaseReadinessReport(
  input: ReleaseReadinessInput,
): ReleaseReadinessReport {
  const generatedAt = (input.now ?? new Date()).toISOString();
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const context: ReleaseReadinessContext = {
    ...input,
    activeProjects,
    generatedAt,
  };
  const gates = [
    createRouteCoverageGate(context),
    createEnvironmentGate(context),
    createMigrationDriftGate(context),
    createSeededAccountGate(context),
    createVercelDeploymentGate(context),
  ];
  const score = average(gates.map((gate) => gate.score));
  const status = scoreToStatus(
    score,
    gates.some((gate) => gate.status === "blocked"),
  );
  const nextActions = createNextActions(gates);
  const packet = createReleaseReadinessPacket({
    generatedAt,
    status,
    score,
    gates,
    nextActions,
  });
  const latestVersions = createLatestVersionMap(input.projectVersions);
  const missingSnapshots = activeProjects.filter(
    (project) => !latestVersions.has(project.id),
  ).length;
  const staleSnapshots = activeProjects.filter((project) => {
    const latestVersion = latestVersions.get(project.id);

    return (
      latestVersion !== undefined &&
      Date.parse(project.updatedAt) > Date.parse(latestVersion.createdAt)
    );
  }).length;
  const routeGate = gates.find((gate) => gate.id === "route-coverage");
  const environmentGate = gates.find((gate) => gate.id === "environment");
  const accountGate = gates.find((gate) => gate.id === "seeded-account");
  const vercelGate = gates.find((gate) => gate.id === "vercel-deployment");

  return {
    generatedAt,
    status,
    score,
    gates,
    nextActions,
    packet,
    totals: {
      criticalRoutes: releaseRouteDefinitions.filter((route) => route.critical)
        .length,
      coveredCriticalRoutes: routeGate?.metricValue ?? 0,
      environmentChecks: environmentGate?.items.length ?? 0,
      blockedEnvironmentChecks:
        environmentGate?.items.filter((item) => item.status === "blocked")
          .length ?? 0,
      activeProjects: activeProjects.length,
      missingSnapshots,
      staleSnapshots,
      verifiedSeededAccounts: accountGate?.metricValue ?? 0,
      vercelChecks: vercelGate?.items.length ?? 0,
    },
  };
}

function createReleaseReadinessPacket(input: {
  generatedAt: string;
  status: ReleaseReadinessReport["status"];
  score: number;
  gates: ReleaseReadinessGate[];
  nextActions: string[];
}): ReleaseReadinessPacket {
  const payload: ReleaseReadinessPacket["payload"] = {
    kind: "essence-studio.release-readiness",
    version: 1,
    generatedAt: input.generatedAt,
    status: input.status,
    score: input.score,
    gates: input.gates.map((gate) => ({
      id: gate.id,
      title: gate.title,
      status: gate.status,
      score: gate.score,
      metric: `${gate.metricValue} ${gate.metricLabel}`,
      items: gate.items,
    })),
    nextActions: input.nextActions,
    routeDefinitions: releaseRouteDefinitions,
  };

  return {
    fileName: `essence-release-readiness-${input.generatedAt.slice(0, 10)}.json`,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(payload, null, 2),
    )}`,
    payload,
  };
}
