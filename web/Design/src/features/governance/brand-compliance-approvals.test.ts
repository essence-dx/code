import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { CampaignBoardSummary } from "@/db/campaigns";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { DesignGovernanceReport } from "@/features/governance/design-governance";
import type { PolicyAsCodeGovernanceCenter } from "@/features/governance/policy-as-code-governance";
import type { EnterpriseApprovalWorkflowCenter } from "@/features/review/enterprise-approval-workflows";
import { createBrandComplianceApprovalCenter } from "@/features/governance/brand-compliance-approvals";

describe("brand compliance approvals", () => {
  test("creates rule libraries, exception requests, legal packets, and campaign enforcement", () => {
    const center = createBrandComplianceApprovalCenter({
      designGovernance: createDesignGovernanceReport(),
      policyAsCode: createPolicyAsCodeCenter(),
      approvalWorkflows: createApprovalWorkflowCenter(),
      campaigns: [createCampaign()],
      auditLogs: [
        createAuditLog({
          id: "audit-policy",
          action: "release.operation.blocked",
          targetType: "schedule",
          targetId: "schedule-launch",
          summary: "Blocked a campaign schedule item.",
        }),
        createAuditLog({
          id: "audit-asset",
          action: "release.override.requested",
          targetType: "asset",
          targetId: "asset-hero",
          summary: "Requested image license review.",
        }),
        createAuditLog({
          id: "audit-approval",
          action: "approval.updated",
          targetType: "project",
          targetId: "project-hero",
          summary: "Requested legal copy approval.",
        }),
      ],
      now: "2026-05-19T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.reusableRules, 6);
    assert.equal(center.totals.exceptionRequests, 4);
    assert.equal(center.totals.legalReviewPackets, 1);
    assert.equal(center.totals.campaignEnforcements, 1);
    assert.equal(center.totals.blockedCampaigns, 1);
    assert.equal(center.totals.auditEvidence, 3);

    const campaignRule = center.ruleLibrary.find(
      (rule) => rule.id === "campaign-enforcement-library",
    );
    assert.equal(campaignRule?.status, "blocked");
    assert.ok(
      campaignRule?.evidence.some((item) => item.includes("Spring Launch")),
    );

    const campaignEnforcement = center.campaignEnforcement[0];
    assert.equal(campaignEnforcement?.campaignName, "Spring Launch");
    assert.equal(campaignEnforcement?.status, "blocked");
    assert.deepEqual(campaignEnforcement?.blockedDeliverableIds, [
      "deliverable-hero",
    ]);
    assert.ok(campaignEnforcement?.missingBrandEvidence.includes("Brand logo"));

    const legalPacket = center.legalReviewPackets[0];
    assert.equal(legalPacket?.status, "blocked");
    assert.deepEqual(legalPacket?.auditEvidenceIds.sort(), [
      "audit-approval",
      "audit-asset",
      "audit-policy",
    ]);

    const packet = decodePacket(legalPacket?.dataUrl ?? "");
    assert.equal(packet.kind, "essence-studio.brand-compliance-legal-review");
    assert.deepEqual(packet.exceptionRequestIds.sort(), [
      "exception-approval-campaign-launch-approval-legal-review",
      "exception-policy-assets-asset-hero",
      "exception-policy-publishing-schedule-launch",
    ]);

    assert.ok(
      center.nextActions.some((action) => action.includes("Spring Launch")),
    );
  });
});

function createDesignGovernanceReport(): DesignGovernanceReport {
  return {
    score: 72,
    status: "watch",
    rules: [
      {
        id: "brand-colors",
        title: "Reusable brand color rules",
        description: "Shared palette tokens.",
        status: "strong",
        score: 100,
        evidence: ["#2563eb", "#111827"],
      },
      {
        id: "brand-fonts",
        title: "Reusable typography rules",
        description: "Role-based type styles.",
        status: "watch",
        score: 65,
        evidence: ["heading: Inter"],
      },
      {
        id: "brand-logos",
        title: "Logo usage library",
        description: "Approved logo assets.",
        status: "needs-work",
        score: 35,
        evidence: ["No approved logo assets saved yet."],
      },
    ],
    approvalPolicies: [],
    templateLockRules: ["Lock logo placement", "Lock brand colors"],
    auditTrail: [
      {
        id: "audit-governance",
        action: "approval.updated",
        summary: "Governance approval changed.",
        actorEmail: "admin@example.com",
        createdAt: "2026-05-19T08:00:00.000Z",
      },
    ],
    totals: {
      activeProjects: 1,
      governedTemplates: 1,
      brandColors: 2,
      brandFonts: 1,
      brandLogos: 0,
      auditEvents: 1,
    },
  };
}

function createPolicyAsCodeCenter(): PolicyAsCodeGovernanceCenter {
  return {
    status: "blocked",
    score: 58,
    checkedAt: "2026-05-19T10:00:00.000Z",
    rules: [],
    dryRunReports: [
      {
        id: "publishing-policy-dry-run",
        domain: "publishing",
        title: "Publishing policy",
        status: "blocked",
        score: 48,
        summary: "Schedule copy is missing.",
        affectedItems: [
          {
            id: "schedule-launch",
            kind: "schedule",
            name: "Spring launch post",
            severity: "blocked",
            detail: "Launch schedule is missing approved legal copy.",
            sourceIds: ["schedule-launch", "project-hero"],
          },
        ],
        plannedActions: [
          "Add approved legal copy before publishing Spring launch post.",
        ],
        auditLogIds: ["audit-policy"],
      },
      {
        id: "assets-policy-dry-run",
        domain: "assets",
        title: "Asset policy",
        status: "review",
        score: 72,
        summary: "Asset license review needed.",
        affectedItems: [
          {
            id: "asset-hero",
            kind: "asset",
            name: "Hero campaign image",
            severity: "review",
            detail: "Hero image is missing source and license evidence.",
            sourceIds: ["asset-hero"],
          },
        ],
        plannedActions: [
          "Attach source and license metadata to Hero campaign image.",
        ],
        auditLogIds: ["audit-asset"],
      },
    ],
    enforcementPacket: {
      id: "policy-as-code-dry-run-packet",
      status: "blocked",
      generatedAt: "2026-05-19T10:00:00.000Z",
      ruleIds: [],
      violationCount: 2,
      plannedActionCount: 2,
      download: {
        fileName: "policy.json",
        href: "data:application/json,%7B%7D",
        json: "{}",
      },
    },
    nextActions: [],
    totals: {
      policyDomains: 2,
      rules: 2,
      dryRunReports: 2,
      violations: 2,
      blockedRules: 1,
      reviewRules: 1,
      plannedActions: 2,
      auditEvents: 2,
    },
  };
}

function createApprovalWorkflowCenter(): EnterpriseApprovalWorkflowCenter {
  return {
    status: "blocked",
    score: 52,
    workflowTemplates: [
      {
        id: "campaign-launch-approval",
        title: "Campaign launch approval",
        description: "Launch approval stages.",
        subjectKind: "campaign-deliverable",
        status: "blocked",
        score: 52,
        stageOwners: [],
        escalationRules: [
          {
            id: "campaign-launch-approval-legal-review",
            title: "Escalate legal review",
            trigger: "Hero campaign copy requires legal review.",
            action: "Route Spring Launch hero copy to Legal.",
            status: "blocked",
            subjectNames: ["Spring Launch: Hero"],
            auditLogIds: ["audit-approval"],
          },
        ],
        reviewerSla: {
          hours: 48,
          status: "blocked",
          openCount: 1,
          overdueCount: 1,
          dueSoonCount: 0,
          unassignedCount: 0,
          detail: "1 overdue reviewer item.",
        },
        subjects: [],
        auditLogIds: ["audit-approval"],
        governanceDetail: "Legal review is overdue.",
      },
    ],
    governanceReports: [],
    governancePacket: {
      id: "approval-packet",
      status: "blocked",
      workflowTemplateIds: ["campaign-launch-approval"],
      auditLogIds: ["audit-approval"],
      download: {
        fileName: "approval.json",
        href: "data:application/json,%7B%7D",
        json: "{}",
      },
    },
    nextActions: [],
    totals: {
      workflowTemplates: 1,
      pendingSubjects: 1,
      stageOwners: 0,
      escalationRules: 1,
      blockedWorkflows: 1,
      reviewWorkflows: 0,
      openReviewerItems: 1,
      overdueReviewerItems: 1,
      dueSoonReviewerItems: 0,
      governanceReports: 0,
      auditEvents: 1,
    },
  };
}

function createCampaign(): CampaignBoardSummary {
  return {
    id: "campaign-spring",
    name: "Spring Launch",
    brief: "Launch spring collection.",
    goal: "Drive awareness.",
    audience: "Retail customers",
    status: "active",
    primaryBrandColor: "#2563eb",
    brandLogoName: null,
    brandFontFamily: "Inter",
    launchAt: "2026-05-23T09:00:00.000Z",
    deliverables: [
      {
        id: "deliverable-hero",
        projectId: "project-hero",
        projectName: "Hero post",
        projectThumbnail: null,
        projectWidth: 1080,
        projectHeight: 1080,
        projectSourceProjectId: null,
        projectVariantProfileId: null,
        projectVariantName: null,
        role: "Hero",
        channel: "Instagram",
        status: "planned",
        approvalStatus: "changes-requested",
        createdAt: "2026-05-18T09:00:00.000Z",
        updatedAt: "2026-05-19T08:00:00.000Z",
      },
      {
        id: "deliverable-story",
        projectId: "project-story",
        projectName: "Story post",
        projectThumbnail: null,
        projectWidth: 1080,
        projectHeight: 1920,
        projectSourceProjectId: null,
        projectVariantProfileId: null,
        projectVariantName: null,
        role: "Story",
        channel: "Instagram",
        status: "planned",
        approvalStatus: "draft",
        createdAt: "2026-05-18T09:00:00.000Z",
        updatedAt: "2026-05-19T08:00:00.000Z",
      },
    ],
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-19T08:00:00.000Z",
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-1",
    action: "approval.updated",
    targetType: "project",
    targetId: "project-1",
    summary: "Project approval changed.",
    actorEmail: "admin@example.com",
    metadata: {},
    createdAt: "2026-05-19T08:00:00.000Z",
    ...overrides,
  };
}

function decodePacket(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    exceptionRequestIds: string[];
  };
}
