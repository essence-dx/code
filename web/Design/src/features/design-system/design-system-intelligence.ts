import { createDesignSystemComponentDefinitions } from "@/features/design-system/design-system-intelligence-components";
import {
  createDesignSystemTokenDriftReports,
  createDesignSystemUsageMaps,
} from "@/features/design-system/design-system-intelligence-drift";
import {
  createDesignSystemNextActions,
  createDesignSystemRefactorPackets,
} from "@/features/design-system/design-system-intelligence-packets";
import type {
  DesignSystemIntelligenceCenter,
  DesignSystemIntelligenceInput,
} from "@/features/design-system/design-system-intelligence-types";
import {
  averageDesignSystemScore,
  countDesignSystemAuditEvents,
  createDesignSystemTokenProfile,
  designSystemStatusScore,
  latestDesignSystemTimestamp,
  scoreDesignSystemStatus,
} from "@/features/design-system/design-system-intelligence-utils";

export type {
  DesignSystemComponentDefinition,
  DesignSystemComponentKind,
  DesignSystemIntelligenceCenter,
  DesignSystemIntelligenceInput,
  DesignSystemIntelligenceStatus,
  DesignSystemRefactorPacket,
  DesignSystemTokenDriftReport,
  DesignSystemTokenKind,
  DesignSystemTokenProfile,
  DesignSystemUsageMap,
} from "@/features/design-system/design-system-intelligence-types";

export function createDesignSystemIntelligenceCenter(
  input: DesignSystemIntelligenceInput,
): DesignSystemIntelligenceCenter {
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const tokenProfile = createDesignSystemTokenProfile(input);
  const componentDefinitions = createDesignSystemComponentDefinitions({
    templates: input.templates,
    projects: activeProjects,
    projectVersions: input.projectVersions,
    tokenProfile,
  });
  const tokenDriftReports = createDesignSystemTokenDriftReports({
    tokenProfile,
    projectAudits: input.projectAudits,
  });
  const usageMaps = createDesignSystemUsageMaps({
    templates: input.templates,
    projects: activeProjects,
    projectAudits: input.projectAudits,
  });
  const auditEvents = countDesignSystemAuditEvents(input.auditLogs);
  const generatedAt = input.generatedAt ?? createGeneratedAt(input);
  const refactorPackets = createDesignSystemRefactorPackets({
    generatedAt,
    componentDefinitions,
    tokenDriftReports,
    usageMaps,
    auditEvents,
  });
  const score = scoreCenter({
    componentDefinitions,
    tokenDriftReports,
    usageMaps,
    auditEvents,
  });
  const status = scoreDesignSystemStatus(
    score,
    tokenDriftReports.some((item) => item.status === "blocked") ||
      componentDefinitions.some((item) => item.status === "blocked"),
  );

  return {
    status,
    score,
    generatedAt,
    componentDefinitions,
    tokenDriftReports,
    usageMaps,
    refactorPackets,
    nextActions: createDesignSystemNextActions({
      componentDefinitions,
      tokenDriftReports,
      usageMaps,
    }),
    totals: {
      components: componentDefinitions.length,
      readyComponents: componentDefinitions.filter(
        (item) => item.status === "ready",
      ).length,
      tokenDrift: tokenDriftReports.reduce(
        (total, item) => total + item.driftCount,
        0,
      ),
      usageMaps: usageMaps.length,
      refactorPackets: refactorPackets.length,
      auditEvents,
    },
  };
}

function scoreCenter(input: {
  componentDefinitions: DesignSystemIntelligenceCenter["componentDefinitions"];
  tokenDriftReports: DesignSystemIntelligenceCenter["tokenDriftReports"];
  usageMaps: DesignSystemIntelligenceCenter["usageMaps"];
  auditEvents: number;
}) {
  return averageDesignSystemScore([
    averageDesignSystemScore(
      input.componentDefinitions.map((component) => component.score),
    ),
    input.tokenDriftReports.length
      ? averageDesignSystemScore(
          input.tokenDriftReports.map((report) =>
            designSystemStatusScore(report.status),
          ),
        )
      : 100,
    input.usageMaps.length
      ? averageDesignSystemScore(
          input.usageMaps.map((map) => map.coverageScore),
        )
      : 40,
    input.auditEvents ? 100 : 65,
  ]);
}

function createGeneratedAt(input: DesignSystemIntelligenceInput) {
  return latestDesignSystemTimestamp([
    ...input.brandColors.map((item) => item.updatedAt),
    ...input.brandFonts.map((item) => item.updatedAt),
    ...input.brandLogos.map((item) => item.updatedAt),
    ...input.templates.map((item) => item.updatedAt),
    ...input.projects.map((item) => item.updatedAt),
    ...input.projectAudits.map((item) => item.updatedAt),
    ...input.projectVersions.map((item) => item.createdAt),
    ...input.auditLogs.map((item) => item.createdAt),
  ]);
}
