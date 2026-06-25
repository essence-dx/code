import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { PolicyAsCodeGovernanceCenter } from "@/features/governance/policy-as-code-governance";
import type { PublishExportReleaseGateCenter } from "@/features/operations/publish-export-release-gates";
import type { ProductionCommandRunnerCenter } from "@/features/operations/production-command-runner";
import {
  createReleaseOperationEnforcementDecision,
  formatReleaseOperationBlockedMessage,
} from "@/features/operations/release-operation-enforcement";

describe("release operation enforcement", () => {
  test("blocks a public publish when policy, release gates, and command runner all reject the target", () => {
    const decision = createReleaseOperationEnforcementDecision({
      operation: {
        id: "publish-project-launch",
        kind: "publish-website",
        targetType: "project",
        targetId: "project-launch",
        label: "Publish launch page",
        requestedByEmail: "owner@example.com",
      },
      policyAsCode: createPolicyCenter({
        targetId: "project-launch",
        status: "blocked",
      }),
      publishExportReleaseGates: createReleaseGateCenter({
        targetId: "project-launch",
        status: "blocked",
      }),
      productionCommandRunner: createCommandRunnerCenter({
        targetId: "project-launch",
        status: "blocked",
      }),
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(decision.status, "blocked");
    assert.equal(decision.canMutate, false);
    assert.equal(decision.checkedAt, "2026-05-18T10:00:00.000Z");
    assert.deepEqual(
      decision.blockingFindings.map((finding) => finding.source),
      ["policy-as-code", "release-gate", "production-command-runner"],
    );
    assert.equal(
      decision.evidencePacket.payload.findings.some((finding) =>
        finding.evidenceIds.includes("policy-as-code-dry-run-packet"),
      ),
      true,
    );
    assert.match(
      formatReleaseOperationBlockedMessage(decision),
      /Publish launch page is blocked/,
    );
  });

  test("allows a mutation when non-ready decisions belong to another target", () => {
    const decision = createReleaseOperationEnforcementDecision({
      operation: {
        id: "publish-project-clean",
        kind: "publish-website",
        targetType: "project",
        targetId: "project-clean",
        label: "Publish approved page",
      },
      policyAsCode: createPolicyCenter({
        targetId: "project-other",
        status: "blocked",
      }),
      publishExportReleaseGates: createReleaseGateCenter({
        targetId: "project-other",
        status: "blocked",
      }),
      productionCommandRunner: createCommandRunnerCenter({
        targetId: "project-other",
        status: "blocked",
      }),
      now: "2026-05-18T11:00:00.000Z",
    });

    assert.equal(decision.status, "ready");
    assert.equal(decision.canMutate, true);
    assert.equal(decision.blockingFindings.length, 0);
    assert.equal(decision.reviewFindings.length, 0);
  });

  test("does not block export creation when the matching release finding is solved by creating the export", () => {
    const decision = createReleaseOperationEnforcementDecision({
      operation: {
        id: "export-project-launch",
        kind: "create-export-job",
        targetType: "project",
        targetId: "project-launch",
        label: "Queue launch PDF export",
      },
      policyAsCode: createPolicyCenter({ status: "ready" }),
      publishExportReleaseGates: createReleaseGateCenter({
        targetId: "project-launch",
        status: "review",
        itemId: "export-coverage",
        gateId: "export-readiness",
      }),
      productionCommandRunner: createCommandRunnerCenter({
        targetId: "project-launch",
        status: "review",
        sourceKind: "release-gate",
        sourceId: "export-readiness-export-coverage",
      }),
      now: "2026-05-18T12:00:00.000Z",
    });

    assert.equal(decision.status, "ready");
    assert.equal(decision.canMutate, true);
    assert.equal(decision.deferredFindings.length, 2);
    assert.equal(
      decision.deferredFindings.every((finding) =>
        finding.reason.includes("remediates"),
      ),
      true,
    );
  });
});

function createPolicyCenter(input?: {
  targetId?: string;
  status?: "ready" | "review" | "blocked";
}): PolicyAsCodeGovernanceCenter {
  const status = input?.status ?? "ready";
  const affectedItems =
    status === "ready"
      ? []
      : [
          {
            id: input?.targetId ?? "project-launch",
            kind: "project" as const,
            name: "Launch page",
            severity: status,
            detail: "approval evidence is missing for public release.",
            sourceIds: [input?.targetId ?? "project-launch"],
          },
        ];

  return {
    status,
    score: status === "ready" ? 100 : status === "review" ? 74 : 40,
    checkedAt: "2026-05-18T09:00:00.000Z",
    rules: [],
    dryRunReports: [
      {
        id: "publishing-policy-dry-run",
        domain: "publishing",
        title: "Publishing policy",
        status,
        score: status === "ready" ? 100 : status === "review" ? 74 : 40,
        summary:
          status === "ready"
            ? "Publishing surfaces have approval evidence."
            : "Public publishing needs approval evidence.",
        affectedItems,
        plannedActions: ["Move Launch page into approved state."],
        auditLogIds: ["audit-policy"],
      },
    ],
    enforcementPacket: {
      id: "policy-as-code-dry-run-packet",
      status,
      generatedAt: "2026-05-18T09:00:00.000Z",
      ruleIds: ["publishing-policy-rule"],
      violationCount: affectedItems.length,
      plannedActionCount: affectedItems.length ? 1 : 0,
      download: {
        fileName: "policy-as-code-dry-run-packet.json",
        href: "data:application/json,{}",
        json: "{}",
      },
    },
    nextActions: [],
    totals: {
      policyDomains: 1,
      rules: 1,
      dryRunReports: 1,
      violations: affectedItems.length,
      blockedRules: status === "blocked" ? 1 : 0,
      reviewRules: status === "review" ? 1 : 0,
      plannedActions: affectedItems.length ? 1 : 0,
      auditEvents: 1,
    },
  };
}

function createReleaseGateCenter(input?: {
  gateId?: "policy-decisions" | "export-readiness" | "publish-readiness";
  itemId?: string;
  targetId?: string;
  status?: "ready" | "review" | "blocked";
}): PublishExportReleaseGateCenter {
  const status = input?.status ?? "ready";
  const gateId = input?.gateId ?? "publish-readiness";
  const item = {
    id: input?.itemId ?? "published-project-approval",
    title: "Published project approvals",
    detail:
      status === "ready"
        ? "Published website surfaces point at approved project states."
        : "Published website surface is missing approval evidence.",
    status,
    badge: status,
    sourceId: input?.targetId ?? "project-launch",
    sourceKind: "project",
    href: `/editor/${input?.targetId ?? "project-launch"}`,
    meta: ["approval missing"],
  };

  return {
    status,
    score: status === "ready" ? 100 : status === "review" ? 74 : 42,
    checkedAt: "2026-05-18T09:00:00.000Z",
    gates: [
      {
        id: gateId,
        title:
          gateId === "export-readiness"
            ? "Export readiness"
            : "Publish readiness",
        description: "Release gate for public surfaces.",
        status,
        score: status === "ready" ? 100 : status === "review" ? 74 : 42,
        metricLabel: "items",
        metricValue: 1,
        items: [item],
      },
    ],
    overrideRequests: [],
    approvalEvidence: [],
    releasePacket: {
      fileName: "release-gates.json",
      dataUrl: "data:application/json,{}",
      payload: {
        kind: "essence-studio.publish-export-release-gates",
        version: 1,
        generatedAt: "2026-05-18T09:00:00.000Z",
        status,
        score: status === "ready" ? 100 : status === "review" ? 74 : 42,
        gates: [],
        overrideRequests: [],
        approvalEvidence: [],
        nextActions: [],
      },
    },
    nextActions: [],
    totals: {
      gates: 1,
      blockedGates: status === "blocked" ? 1 : 0,
      reviewGates: status === "review" ? 1 : 0,
      policyExceptions: 0,
      exportJobs: 0,
      completedExports: 0,
      failedExports: 0,
      publishedSurfaces: 0,
      overrideRequests: 0,
      requestedOverrides: 0,
      approvalEvidence: 0,
      auditableApprovals: 0,
    },
  };
}

function createCommandRunnerCenter(input?: {
  targetId?: string;
  sourceId?: string;
  sourceKind?: "policy-dry-run" | "release-gate";
  status?: "ready" | "review" | "blocked";
}): ProductionCommandRunnerCenter {
  const status = input?.status ?? "ready";
  const command =
    status === "ready"
      ? []
      : [
          {
            id: `${input?.sourceKind ?? "release-gate"}-command`,
            area: "release" as const,
            sourceKind: input?.sourceKind ?? "release-gate",
            sourceId:
              input?.sourceId ?? "publish-readiness-published-project-approval",
            title: "Resolve release gate before publish",
            detail:
              "The production command runner is withholding release apply.",
            status,
            mode: "dry-run" as const,
            phase: "validate" as const,
            risk:
              status === "blocked" ? ("high" as const) : ("medium" as const),
            sequence: 1,
            dryRunPlan: ["Validate approval evidence."],
            applyPlan: ["Resolve the release gate."],
            rollbackNote: "Withhold publish/export mutation.",
            auditEvidence: {
              auditLogIds: ["audit-command"],
              packetIds: ["production-command-runner-release.json"],
              sourceIds: [input?.targetId ?? "project-launch"],
            },
            reportSummary: "Release apply is withheld.",
          },
        ];

  return {
    generatedAt: "2026-05-18T09:00:00.000Z",
    status,
    score: status === "ready" ? 100 : status === "review" ? 76 : 42,
    commands: command,
    batches: [],
    executionReports: [],
    nextActions: [],
    totals: {
      batches: 0,
      commands: command.length,
      readyCommands: status === "ready" ? 1 : 0,
      reviewCommands: status === "review" ? 1 : 0,
      blockedCommands: status === "blocked" ? 1 : 0,
      dryRunCommands: command.length,
      applyReadyCommands: 0,
      rollbackNotes: command.length,
      auditEvidenceLinks: command.length,
      executionReports: 0,
    },
  };
}
