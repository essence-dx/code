import type { PolicyAsCodeGovernanceCenter } from "@/features/governance/policy-as-code-governance";
import type {
  PublishExportReleaseGateCenter,
  PublishExportReleaseGateId,
} from "@/features/operations/publish-export-release-gates";
import type {
  ProductionCommandRunnerCenter,
  ProductionCommandSourceKind,
} from "@/features/operations/production-command-runner";

export type ReleaseOperationKind =
  | "publish-website"
  | "unpublish-website"
  | "create-export-job"
  | "complete-export-artifact"
  | "publish-template";

export type ReleaseOperationTargetType =
  | "project"
  | "template"
  | "website-publish"
  | "server-export-job";

export type ReleaseOperationEnforcementStatus =
  | "ready"
  | "needs-review"
  | "blocked";

export type ReleaseOperationEnforcementSource =
  | "policy-as-code"
  | "release-gate"
  | "production-command-runner";

export type ReleaseOperation = {
  id: string;
  kind: ReleaseOperationKind;
  targetType: ReleaseOperationTargetType;
  targetId: string;
  label: string;
  requestedByEmail?: string | null;
  relatedIds?: string[];
};

export type ReleaseOperationEnforcementFinding = {
  id: string;
  source: ReleaseOperationEnforcementSource;
  sourceKind: string;
  sourceId: string;
  title: string;
  detail: string;
  status: "review" | "blocked";
  evidenceIds: string[];
  remediation: string[];
};

export type ReleaseOperationDeferredFinding =
  ReleaseOperationEnforcementFinding & {
    reason: string;
  };

export type ReleaseOperationEnforcementSourceCheck = {
  source: ReleaseOperationEnforcementSource;
  status: ReleaseOperationEnforcementStatus;
  blocking: number;
  review: number;
  deferred: number;
};

export type ReleaseOperationEnforcementPacket = {
  fileName: string;
  dataUrl: string;
  payload: {
    kind: "essence-studio.release-operation-enforcement";
    version: 1;
    checkedAt: string;
    operation: ReleaseOperation;
    status: ReleaseOperationEnforcementStatus;
    canMutate: boolean;
    sourceChecks: ReleaseOperationEnforcementSourceCheck[];
    findings: ReleaseOperationEnforcementFinding[];
    deferredFindings: ReleaseOperationDeferredFinding[];
  };
};

export type ReleaseOperationEnforcementDecision = {
  operation: ReleaseOperation;
  status: ReleaseOperationEnforcementStatus;
  canMutate: boolean;
  checkedAt: string;
  summary: string;
  sourceChecks: ReleaseOperationEnforcementSourceCheck[];
  blockingFindings: ReleaseOperationEnforcementFinding[];
  reviewFindings: ReleaseOperationEnforcementFinding[];
  deferredFindings: ReleaseOperationDeferredFinding[];
  evidencePacket: ReleaseOperationEnforcementPacket;
};

export type ReleaseOperationEnforcementInput = {
  operation: ReleaseOperation;
  policyAsCode: PolicyAsCodeGovernanceCenter;
  publishExportReleaseGates: PublishExportReleaseGateCenter;
  productionCommandRunner: ProductionCommandRunnerCenter;
  now?: string | Date;
};

type CandidateFinding =
  | (ReleaseOperationEnforcementFinding & { deferredReason?: undefined })
  | (ReleaseOperationEnforcementFinding & { deferredReason: string });

const exportRemediationGateItems = new Set([
  "export-coverage",
  "export-freshness",
  "artifact-download-evidence",
]);

export function createReleaseOperationEnforcementDecision(
  input: ReleaseOperationEnforcementInput,
): ReleaseOperationEnforcementDecision {
  const checkedAt = normalizeNow(input.now).toISOString();
  const candidateFindings = [
    ...createPolicyFindings(input),
    ...createReleaseGateFindings(input),
    ...createProductionCommandFindings(input),
  ];
  const deferredFindings = candidateFindings
    .filter(hasDeferredReason)
    .map(({ deferredReason, ...finding }) => ({
      ...finding,
      reason: deferredReason,
    }));
  const activeFindings = candidateFindings.filter(
    (finding) => !finding.deferredReason,
  );
  const blockingFindings = activeFindings.filter(
    (finding) => finding.status === "blocked",
  );
  const reviewFindings = activeFindings.filter(
    (finding) => finding.status === "review",
  );
  const status = createDecisionStatus({ blockingFindings, reviewFindings });
  const canMutate = status === "ready";
  const sourceChecks = createSourceChecks({
    activeFindings,
    deferredFindings,
  });
  const summary = createSummary({
    operation: input.operation,
    status,
    blockingFindings,
    reviewFindings,
    deferredFindings,
  });
  const evidencePacket = createEvidencePacket({
    checkedAt,
    operation: input.operation,
    status,
    canMutate,
    sourceChecks,
    findings: [...blockingFindings, ...reviewFindings],
    deferredFindings,
  });

  return {
    operation: input.operation,
    status,
    canMutate,
    checkedAt,
    summary,
    sourceChecks,
    blockingFindings,
    reviewFindings,
    deferredFindings,
    evidencePacket,
  };
}

export function formatReleaseOperationBlockedMessage(
  decision: ReleaseOperationEnforcementDecision,
) {
  if (decision.status === "ready") {
    return `${decision.operation.label} is ready for release mutation.`;
  }

  const finding = decision.blockingFindings[0] ?? decision.reviewFindings[0];
  const statusText =
    decision.status === "blocked" ? "blocked" : "waiting for review";

  return finding
    ? `${decision.operation.label} is ${statusText}: ${finding.title} - ${finding.detail}`
    : `${decision.operation.label} is ${statusText}.`;
}

function createPolicyFindings(
  input: ReleaseOperationEnforcementInput,
): CandidateFinding[] {
  const operationIds = createOperationIdSet(input.operation);

  return input.policyAsCode.dryRunReports
    .filter((report) => report.status !== "ready")
    .flatMap((report) =>
      report.affectedItems
        .filter((item) =>
          matchesAnyOperationId(operationIds, [
            item.id,
            item.name,
            ...item.sourceIds,
          ]),
        )
        .map(
          (item): CandidateFinding => ({
            id: `policy-${report.id}-${item.id}`,
            source: "policy-as-code",
            sourceKind: report.domain,
            sourceId: report.id,
            title: `${report.title}: ${item.name}`,
            detail: item.detail || report.summary,
            status: item.severity === "blocked" ? "blocked" : "review",
            evidenceIds: unique([
              report.id,
              input.policyAsCode.enforcementPacket.id,
              ...report.auditLogIds,
              ...item.sourceIds,
            ]),
            remediation: report.plannedActions.length
              ? report.plannedActions
              : input.policyAsCode.nextActions,
          }),
        ),
    );
}

function createReleaseGateFindings(
  input: ReleaseOperationEnforcementInput,
): CandidateFinding[] {
  const operationIds = createOperationIdSet(input.operation);

  return input.publishExportReleaseGates.gates.flatMap((gate) =>
    gate.items
      .filter((item) => item.status !== "ready")
      .filter((item) =>
        matchesAnyOperationId(operationIds, [
          item.id,
          item.sourceId,
          ...item.meta,
        ]),
      )
      .map((item): CandidateFinding => {
        const deferredReason = getReleaseGateDeferredReason({
          operation: input.operation,
          gateId: gate.id,
          itemId: item.id,
        });

        return {
          id: `release-gate-${gate.id}-${item.id}`,
          source: "release-gate",
          sourceKind: gate.id,
          sourceId: item.sourceId ?? item.id,
          title: `${gate.title}: ${item.title}`,
          detail: item.detail,
          status: item.status === "blocked" ? "blocked" : "review",
          evidenceIds: unique([
            gate.id,
            item.id,
            item.sourceId,
            input.publishExportReleaseGates.releasePacket.fileName,
          ]),
          remediation: unique([
            item.detail,
            ...item.meta,
            ...input.publishExportReleaseGates.nextActions,
          ]),
          ...(deferredReason ? { deferredReason } : {}),
        };
      }),
  );
}

function createProductionCommandFindings(
  input: ReleaseOperationEnforcementInput,
): CandidateFinding[] {
  const operationIds = createOperationIdSet(input.operation);

  return input.productionCommandRunner.commands
    .filter((command) => command.status !== "ready")
    .filter((command) =>
      matchesAnyOperationId(operationIds, [
        command.id,
        command.sourceId,
        ...command.auditEvidence.sourceIds,
      ]),
    )
    .map((command): CandidateFinding => {
      const deferredReason = getCommandDeferredReason({
        operation: input.operation,
        sourceKind: command.sourceKind,
        sourceId: command.sourceId,
      });

      return {
        id: `production-command-${command.id}`,
        source: "production-command-runner",
        sourceKind: command.sourceKind,
        sourceId: command.sourceId,
        title: command.title,
        detail: command.detail,
        status: command.status === "blocked" ? "blocked" : "review",
        evidenceIds: unique([
          command.id,
          command.sourceId,
          ...command.auditEvidence.auditLogIds,
          ...command.auditEvidence.packetIds,
          ...command.auditEvidence.sourceIds,
        ]),
        remediation: unique([
          ...command.dryRunPlan,
          ...command.applyPlan,
          command.rollbackNote,
        ]),
        ...(deferredReason ? { deferredReason } : {}),
      };
    });
}

function createSourceChecks(input: {
  activeFindings: ReleaseOperationEnforcementFinding[];
  deferredFindings: ReleaseOperationDeferredFinding[];
}): ReleaseOperationEnforcementSourceCheck[] {
  const sources: ReleaseOperationEnforcementSource[] = [
    "policy-as-code",
    "release-gate",
    "production-command-runner",
  ];

  return sources.map((source) => {
    const active = input.activeFindings.filter(
      (finding) => finding.source === source,
    );
    const blocking = active.filter(
      (finding) => finding.status === "blocked",
    ).length;
    const review = active.filter(
      (finding) => finding.status === "review",
    ).length;
    const deferred = input.deferredFindings.filter(
      (finding) => finding.source === source,
    ).length;

    return {
      source,
      status: createSourceStatus({ blocking, review }),
      blocking,
      review,
      deferred,
    };
  });
}

function createEvidencePacket(input: {
  checkedAt: string;
  operation: ReleaseOperation;
  status: ReleaseOperationEnforcementStatus;
  canMutate: boolean;
  sourceChecks: ReleaseOperationEnforcementSourceCheck[];
  findings: ReleaseOperationEnforcementFinding[];
  deferredFindings: ReleaseOperationDeferredFinding[];
}): ReleaseOperationEnforcementPacket {
  const payload: ReleaseOperationEnforcementPacket["payload"] = {
    kind: "essence-studio.release-operation-enforcement",
    version: 1,
    checkedAt: input.checkedAt,
    operation: input.operation,
    status: input.status,
    canMutate: input.canMutate,
    sourceChecks: input.sourceChecks,
    findings: input.findings,
    deferredFindings: input.deferredFindings,
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    fileName: `release-operation-enforcement-${input.operation.id}-${input.checkedAt.slice(0, 10)}.json`,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    payload,
  };
}

function createSummary(input: {
  operation: ReleaseOperation;
  status: ReleaseOperationEnforcementStatus;
  blockingFindings: ReleaseOperationEnforcementFinding[];
  reviewFindings: ReleaseOperationEnforcementFinding[];
  deferredFindings: ReleaseOperationDeferredFinding[];
}) {
  if (input.status === "ready") {
    return input.deferredFindings.length
      ? `${input.operation.label} can proceed; ${input.deferredFindings.length} export readiness finding${input.deferredFindings.length === 1 ? "" : "s"} will be remediated by this operation.`
      : `${input.operation.label} can proceed.`;
  }

  if (input.status === "blocked") {
    return `${input.operation.label} is blocked by ${input.blockingFindings.length} release enforcement finding${input.blockingFindings.length === 1 ? "" : "s"}.`;
  }

  return `${input.operation.label} needs review for ${input.reviewFindings.length} release enforcement finding${input.reviewFindings.length === 1 ? "" : "s"}.`;
}

function createDecisionStatus(input: {
  blockingFindings: ReleaseOperationEnforcementFinding[];
  reviewFindings: ReleaseOperationEnforcementFinding[];
}): ReleaseOperationEnforcementStatus {
  if (input.blockingFindings.length) return "blocked";
  if (input.reviewFindings.length) return "needs-review";

  return "ready";
}

function createSourceStatus(input: {
  blocking: number;
  review: number;
}): ReleaseOperationEnforcementStatus {
  if (input.blocking) return "blocked";
  if (input.review) return "needs-review";

  return "ready";
}

function getReleaseGateDeferredReason(input: {
  operation: ReleaseOperation;
  gateId: PublishExportReleaseGateId;
  itemId: string;
}) {
  if (
    isExportArtifactOperation(input.operation.kind) &&
    input.gateId === "export-readiness" &&
    exportRemediationGateItems.has(input.itemId)
  ) {
    return "This export operation remediates the export readiness finding instead of bypassing it.";
  }

  return null;
}

function getCommandDeferredReason(input: {
  operation: ReleaseOperation;
  sourceKind: ProductionCommandSourceKind;
  sourceId: string;
}) {
  if (
    isExportArtifactOperation(input.operation.kind) &&
    input.sourceKind === "release-gate" &&
    Array.from(exportRemediationGateItems).some((itemId) =>
      input.sourceId.includes(itemId),
    )
  ) {
    return "This export operation remediates the production command runner finding instead of bypassing it.";
  }

  return null;
}

function isExportArtifactOperation(kind: ReleaseOperationKind) {
  return kind === "create-export-job" || kind === "complete-export-artifact";
}

function createOperationIdSet(operation: ReleaseOperation) {
  return new Set(
    unique([operation.id, operation.targetId, ...(operation.relatedIds ?? [])]),
  );
}

function matchesAnyOperationId(
  operationIds: Set<string>,
  values: Array<string | null | undefined>,
) {
  return values.some((value) => {
    const normalized = String(value ?? "").trim();

    return normalized ? operationIds.has(normalized) : false;
  });
}

function hasDeferredReason(
  finding: CandidateFinding,
): finding is ReleaseOperationEnforcementFinding & { deferredReason: string } {
  return typeof finding.deferredReason === "string";
}

function normalizeNow(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)),
  );
}
