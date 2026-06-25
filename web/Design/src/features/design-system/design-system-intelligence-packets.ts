import type {
  DesignSystemComponentDefinition,
  DesignSystemIntelligenceStatus,
  DesignSystemRefactorPacket,
  DesignSystemTokenDriftReport,
  DesignSystemUsageMap,
} from "@/features/design-system/design-system-intelligence-types";
import {
  aggregateDesignSystemStatus,
  uniqueDesignSystemValues,
} from "@/features/design-system/design-system-intelligence-utils";

export function createDesignSystemRefactorPackets(input: {
  generatedAt: string;
  componentDefinitions: DesignSystemComponentDefinition[];
  tokenDriftReports: DesignSystemTokenDriftReport[];
  usageMaps: DesignSystemUsageMap[];
  auditEvents: number;
}): DesignSystemRefactorPacket[] {
  const packets: DesignSystemRefactorPacket[] = [];
  const driftReports = input.tokenDriftReports.filter(
    (report) => report.status !== "ready",
  );
  const unstableComponents = input.componentDefinitions.filter(
    (component) => component.status !== "ready",
  );
  const lowUsageMaps = input.usageMaps.filter((map) => map.coverageScore < 70);

  if (driftReports.length) {
    packets.push(
      createPacket({
        id: "token-refactor",
        title: "Token drift refactor packet",
        status: aggregateDesignSystemStatus(driftReports),
        generatedAt: input.generatedAt,
        affectedProjectIds: uniqueDesignSystemValues(
          driftReports.flatMap((report) => report.affectedProjectIds),
        ),
        steps: driftReports.map((report) => report.recommendedFix),
        payload: driftReports,
      }),
    );
  }

  if (unstableComponents.length || lowUsageMaps.length) {
    packets.push(
      createPacket({
        id: "component-refactor",
        title: "Component adoption refactor packet",
        status: aggregateDesignSystemStatus([
          ...unstableComponents,
          ...lowUsageMaps,
        ]),
        generatedAt: input.generatedAt,
        affectedProjectIds: uniqueDesignSystemValues([
          ...unstableComponents.flatMap(
            (component) => component.usage.projectIds,
          ),
          ...lowUsageMaps.flatMap((map) => map.projectIds),
        ]),
        steps: [
          ...unstableComponents.map((component) => component.recommendation),
          ...lowUsageMaps.map(
            (map) => `Increase ${map.title.toLowerCase()} coverage.`,
          ),
          input.auditEvents
            ? "Attach recent design-system audit activity to the refactor review."
            : "Record an audit event when component refactors are accepted.",
        ],
        payload: {
          components: unstableComponents,
          usageMaps: lowUsageMaps,
          auditEvents: input.auditEvents,
        },
      }),
    );
  }

  return packets;
}

export function createDesignSystemNextActions(input: {
  componentDefinitions: DesignSystemComponentDefinition[];
  tokenDriftReports: DesignSystemTokenDriftReport[];
  usageMaps: DesignSystemUsageMap[];
}) {
  const tokenActions = input.tokenDriftReports
    .filter((report) => report.status !== "ready")
    .map((report) => `${report.label}: ${report.recommendedFix}`);
  const componentActions = input.componentDefinitions
    .filter((component) => component.status !== "ready")
    .map((component) => `${component.name}: ${component.recommendation}`);
  const usageActions = input.usageMaps
    .filter((map) => map.coverageScore < 70)
    .map((map) => `${map.title}: ${map.detail}`);
  const actions = [...tokenActions, ...componentActions, ...usageActions];

  return actions.length
    ? actions.slice(0, 5)
    : ["Design system components and tokens are aligned."];
}

function createPacket(input: {
  id: string;
  title: string;
  status: DesignSystemIntelligenceStatus;
  generatedAt: string;
  affectedProjectIds: string[];
  steps: string[];
  payload: unknown;
}): DesignSystemRefactorPacket {
  const body = {
    kind: "essence-studio.design-system-refactor",
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    status: input.status,
    generatedAt: input.generatedAt,
    affectedProjectIds: input.affectedProjectIds,
    steps: uniqueDesignSystemValues(input.steps),
    payload: input.payload,
  };
  const json = JSON.stringify(body, null, 2);

  return {
    id: input.id,
    title: input.title,
    status: input.status,
    fileName: `${input.id}-${input.generatedAt.slice(0, 10) || "workspace"}.json`,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    json,
    affectedProjectIds: input.affectedProjectIds,
    steps: body.steps,
  };
}
