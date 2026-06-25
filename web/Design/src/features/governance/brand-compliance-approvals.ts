import type { CampaignBoardSummary } from "@/db/campaigns";
import type {
  BrandComplianceApprovalCenter,
  BrandComplianceApprovalCenterInput,
  BrandComplianceApprovalStatus,
  BrandComplianceCampaignEnforcement,
  BrandComplianceExceptionRequest,
  BrandComplianceLegalReviewPacket,
  BrandComplianceRule,
  BrandComplianceRuleCategory,
} from "@/features/governance/brand-compliance-approvals-types";
import type { PolicyAsCodeDomain } from "@/features/governance/policy-as-code-governance";

export type {
  BrandComplianceApprovalCenter,
  BrandComplianceApprovalCenterInput,
  BrandComplianceApprovalStatus,
  BrandComplianceCampaignEnforcement,
  BrandComplianceExceptionRequest,
  BrandComplianceExceptionSourceKind,
  BrandComplianceLegalReviewPacket,
  BrandComplianceRule,
  BrandComplianceRuleCategory,
} from "@/features/governance/brand-compliance-approvals-types";

export function createBrandComplianceApprovalCenter(
  input: BrandComplianceApprovalCenterInput,
): BrandComplianceApprovalCenter {
  const generatedAt = normalizeDate(input.now).toISOString();
  const campaignEnforcement = createCampaignEnforcements(input.campaigns);
  const exceptionRequests = createExceptionRequests({
    ...input,
    campaignEnforcement,
  });
  const legalReviewPackets = createLegalReviewPackets({
    exceptionRequests,
    generatedAt,
  });
  const ruleLibrary = createRuleLibrary({
    ...input,
    campaignEnforcement,
    legalReviewPackets,
  });
  const statuses = [
    ...ruleLibrary.map((rule) => rule.status),
    ...exceptionRequests.map((request) => request.status),
    ...legalReviewPackets.map((packet) => packet.status),
    ...campaignEnforcement.map((campaign) => campaign.status),
  ];
  const status = aggregateStatus(statuses);
  const score = Math.max(
    0,
    Math.round(
      average(
        ruleLibrary.map((rule) => rule.score),
        100,
      ) -
        exceptionRequests.filter((request) => request.status === "blocked")
          .length *
          4 -
        exceptionRequests.filter((request) => request.status === "review")
          .length *
          2,
    ),
  );
  const nextActions = [
    ...campaignEnforcement
      .filter((campaign) => campaign.status !== "ready")
      .map((campaign) => campaign.nextAction),
    ...exceptionRequests
      .filter((request) => request.status !== "ready")
      .map((request) => `${request.title}: ${request.requestReason}`),
  ].slice(0, 8);

  return {
    generatedAt,
    status,
    score,
    ruleLibrary,
    exceptionRequests,
    legalReviewPackets,
    campaignEnforcement,
    nextActions,
    totals: {
      reusableRules: ruleLibrary.length,
      exceptionRequests: exceptionRequests.length,
      blockedExceptions: exceptionRequests.filter(
        (request) => request.status === "blocked",
      ).length,
      reviewExceptions: exceptionRequests.filter(
        (request) => request.status === "review",
      ).length,
      legalReviewPackets: legalReviewPackets.length,
      campaignEnforcements: campaignEnforcement.length,
      blockedCampaigns: campaignEnforcement.filter(
        (campaign) => campaign.status === "blocked",
      ).length,
      reviewCampaigns: campaignEnforcement.filter(
        (campaign) => campaign.status === "review",
      ).length,
      auditEvidence: unique([
        ...exceptionRequests.flatMap((request) => request.auditEvidenceIds),
        ...legalReviewPackets.flatMap((packet) => packet.auditEvidenceIds),
        ...input.auditLogs.map((log) => log.id),
      ]).length,
    },
  };
}

function createCampaignEnforcements(
  campaigns: CampaignBoardSummary[],
): BrandComplianceCampaignEnforcement[] {
  return campaigns.map((campaign) => {
    const missingBrandEvidence = getMissingBrandEvidence(campaign);
    const blockedDeliverables = campaign.deliverables.filter(
      (deliverable) => deliverable.approvalStatus === "changes-requested",
    );
    const reviewDeliverables = campaign.deliverables.filter(
      (deliverable) =>
        deliverable.approvalStatus === "draft" ||
        deliverable.approvalStatus === "in-review",
    );
    const status = blockedDeliverables.length
      ? "blocked"
      : reviewDeliverables.length || missingBrandEvidence.length
        ? "review"
        : "ready";
    const score = Math.max(
      25,
      100 -
        blockedDeliverables.length * 24 -
        reviewDeliverables.length * 10 -
        missingBrandEvidence.length * 8,
    );

    return {
      id: `campaign-enforcement-${campaign.id}`,
      campaignId: campaign.id,
      campaignName: campaign.name,
      status,
      score,
      enforcedRuleIds: [
        "brand-identity-library",
        "approval-gate-library",
        "campaign-enforcement-library",
      ],
      blockedDeliverableIds: blockedDeliverables.map(
        (deliverable) => deliverable.id,
      ),
      reviewDeliverableIds: reviewDeliverables.map(
        (deliverable) => deliverable.id,
      ),
      missingBrandEvidence,
      enforcementSummary: createCampaignSummary({
        campaign,
        blockedDeliverables,
        reviewDeliverables,
        missingBrandEvidence,
      }),
      nextAction: createCampaignNextAction({
        campaign,
        blockedDeliverables,
        reviewDeliverables,
        missingBrandEvidence,
      }),
    };
  });
}

function createExceptionRequests(
  input: BrandComplianceApprovalCenterInput & {
    campaignEnforcement: BrandComplianceCampaignEnforcement[];
  },
): BrandComplianceExceptionRequest[] {
  const policyRequests = input.policyAsCode.dryRunReports.flatMap((report) =>
    report.affectedItems.map((item) => ({
      id: `exception-policy-${report.domain}-${item.id}`,
      sourceKind: "policy" as const,
      sourceId: item.id,
      title: `${report.title}: ${item.name}`,
      status: item.severity,
      requestReason: item.detail,
      requesterRole: "Policy gate",
      approverRole: policyApproverRoles[report.domain],
      legalReviewRequired: isPolicyLegalReviewRequired({
        domain: report.domain,
        detail: item.detail,
      }),
      sourceIds: item.sourceIds,
      auditEvidenceIds: report.auditLogIds,
    })),
  );
  const approvalRequests = input.approvalWorkflows.workflowTemplates.flatMap(
    (workflow) =>
      workflow.escalationRules.map((rule) => ({
        id: `exception-approval-${rule.id}`,
        sourceKind: "approval" as const,
        sourceId: rule.id,
        title: rule.title,
        status: rule.status,
        requestReason: rule.trigger,
        requesterRole: "Approval workflow",
        approverRole: "Workspace admin",
        legalReviewRequired: hasLegalSignal(
          `${rule.title} ${rule.trigger} ${rule.action}`,
        ),
        sourceIds: rule.subjectNames,
        auditEvidenceIds: rule.auditLogIds,
      })),
  );
  const campaignRequests = input.campaignEnforcement
    .filter((campaign) => campaign.status !== "ready")
    .map((campaign) => ({
      id: `exception-campaign-${campaign.campaignId}`,
      sourceKind: "campaign" as const,
      sourceId: campaign.campaignId,
      title: `${campaign.campaignName} campaign enforcement`,
      status: campaign.status,
      requestReason: campaign.enforcementSummary,
      requesterRole: "Campaign owner",
      approverRole: "Brand governance",
      legalReviewRequired: false,
      sourceIds: [
        campaign.campaignId,
        ...campaign.blockedDeliverableIds,
        ...campaign.reviewDeliverableIds,
      ],
      auditEvidenceIds: findAuditIdsForSources(input, [
        campaign.campaignId,
        ...campaign.blockedDeliverableIds,
        ...campaign.reviewDeliverableIds,
      ]),
    }));

  return [...policyRequests, ...approvalRequests, ...campaignRequests];
}

function createLegalReviewPackets(input: {
  exceptionRequests: BrandComplianceExceptionRequest[];
  generatedAt: string;
}): BrandComplianceLegalReviewPacket[] {
  const legalRequests = input.exceptionRequests.filter(
    (request) => request.legalReviewRequired,
  );

  if (!legalRequests.length) return [];

  const status = aggregateStatus(
    legalRequests.map((request) => request.status),
  );
  const auditEvidenceIds = unique(
    legalRequests.flatMap((request) => request.auditEvidenceIds),
  );
  const notes = legalRequests.map(
    (request) => `${request.title}: ${request.requestReason}`,
  );
  const payload = {
    kind: "essence-studio.brand-compliance-legal-review",
    schemaVersion: 1,
    generatedAt: input.generatedAt,
    status,
    exceptionRequestIds: legalRequests.map((request) => request.id),
    auditEvidenceIds,
    notes,
  };
  const json = JSON.stringify(payload, null, 2);

  return [
    {
      id: "brand-compliance-legal-review-packet",
      status,
      generatedAt: input.generatedAt,
      exceptionRequestIds: payload.exceptionRequestIds,
      auditEvidenceIds,
      notes,
      fileName: "brand-compliance-legal-review-packet.json",
      dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      json,
    },
  ];
}

function createRuleLibrary(
  input: BrandComplianceApprovalCenterInput & {
    campaignEnforcement: BrandComplianceCampaignEnforcement[];
    legalReviewPackets: BrandComplianceLegalReviewPacket[];
  },
): BrandComplianceRule[] {
  const brandRules = input.designGovernance.rules.filter((rule) =>
    ["brand-colors", "brand-fonts", "brand-logos"].includes(rule.id),
  );
  const brandScore = average(
    brandRules.map((rule) => rule.score),
    input.designGovernance.score,
  );
  const templateLockScore =
    input.designGovernance.templateLockRules.length >= 3
      ? 100
      : input.designGovernance.templateLockRules.length
        ? 74
        : 40;
  const campaignStatus = aggregateStatus(
    input.campaignEnforcement.map((campaign) => campaign.status),
  );
  const campaignScore = average(
    input.campaignEnforcement.map((campaign) => campaign.score),
    100,
  );
  const legalStatus = input.legalReviewPackets.length
    ? aggregateStatus(input.legalReviewPackets.map((packet) => packet.status))
    : "ready";
  return [
    createRule({
      id: "brand-identity-library",
      category: "brand-identity",
      title: "Reusable brand identity library",
      description:
        "Campaign and release approvals require brand color, type, and logo evidence.",
      score: brandScore,
      evidence: brandRules.flatMap((rule) => rule.evidence).slice(0, 6),
      sourceIds: brandRules.map((rule) => rule.id),
    }),
    createRule({
      id: "template-lock-library",
      category: "template-locks",
      title: "Reusable template lock library",
      description:
        "Governed templates should keep locked brand-safe regions before release.",
      score: templateLockScore,
      evidence: input.designGovernance.templateLockRules.length
        ? input.designGovernance.templateLockRules
        : ["No reusable template lock rules are active."],
      sourceIds: input.designGovernance.templateLockRules,
    }),
    {
      id: "approval-gate-library",
      category: "approval-gates",
      title: "Approval gate rule library",
      description:
        "Project, template, and campaign deliverable approvals must clear before production launch.",
      status: input.approvalWorkflows.status,
      score: input.approvalWorkflows.score,
      evidence: input.approvalWorkflows.workflowTemplates
        .map((workflow) => workflow.governanceDetail)
        .slice(0, 4),
      sourceIds: input.approvalWorkflows.workflowTemplates.map(
        (workflow) => workflow.id,
      ),
    },
    {
      id: "policy-as-code-library",
      category: "policy-as-code",
      title: "Policy-as-code exception library",
      description:
        "Publishing, sharing, asset, approval, and retention rules feed reusable exception requests.",
      status: input.policyAsCode.status,
      score: input.policyAsCode.score,
      evidence: input.policyAsCode.dryRunReports
        .map((report) => report.summary)
        .slice(0, 5),
      sourceIds: input.policyAsCode.dryRunReports.map((report) => report.id),
    },
    {
      id: "legal-review-library",
      category: "legal-review",
      title: "Legal review packet library",
      description:
        "License, retention, sharing, and legal-copy exceptions create downloadable review packets.",
      status: legalStatus,
      score: input.legalReviewPackets.length
        ? average(
            input.legalReviewPackets.map((packet) =>
              packet.status === "blocked"
                ? 45
                : packet.status === "review"
                  ? 72
                  : 100,
            ),
            100,
          )
        : 100,
      evidence: input.legalReviewPackets.length
        ? input.legalReviewPackets.flatMap((packet) => packet.notes).slice(0, 4)
        : ["No legal review packets are currently required."],
      sourceIds: input.legalReviewPackets.flatMap(
        (packet) => packet.exceptionRequestIds,
      ),
    },
    {
      id: "campaign-enforcement-library",
      category: "campaign-enforcement",
      title: "Campaign enforcement rule library",
      description:
        "Active campaigns enforce brand evidence and deliverable approval before launch.",
      status: campaignStatus,
      score: campaignScore,
      evidence: input.campaignEnforcement
        .map(
          (campaign) =>
            `${campaign.campaignName}: ${campaign.enforcementSummary}`,
        )
        .slice(0, 6),
      sourceIds: input.campaignEnforcement.map(
        (campaign) => campaign.campaignId,
      ),
    },
  ];
}

function createRule(input: {
  id: string;
  category: BrandComplianceRuleCategory;
  title: string;
  description: string;
  score: number;
  evidence: string[];
  sourceIds: string[];
}): BrandComplianceRule {
  return {
    ...input,
    status: scoreToStatus(input.score),
  };
}

function getMissingBrandEvidence(campaign: CampaignBoardSummary): string[] {
  return [
    campaign.primaryBrandColor ? null : "Brand color",
    campaign.brandLogoName ? null : "Brand logo",
    campaign.brandFontFamily ? null : "Brand font",
  ].filter((item): item is string => Boolean(item));
}

function createCampaignSummary(input: {
  campaign: CampaignBoardSummary;
  blockedDeliverables: CampaignBoardSummary["deliverables"];
  reviewDeliverables: CampaignBoardSummary["deliverables"];
  missingBrandEvidence: string[];
}): string {
  if (input.blockedDeliverables.length) {
    return `${input.blockedDeliverables.length} deliverable${
      input.blockedDeliverables.length === 1 ? "" : "s"
    } blocked by requested changes.`;
  }

  if (input.reviewDeliverables.length || input.missingBrandEvidence.length) {
    return `${input.reviewDeliverables.length} deliverable${
      input.reviewDeliverables.length === 1 ? "" : "s"
    } need approval review; ${input.missingBrandEvidence.length} brand evidence item${
      input.missingBrandEvidence.length === 1 ? "" : "s"
    } missing.`;
  }

  return `${input.campaign.name} has approved deliverables and brand evidence.`;
}

function createCampaignNextAction(input: {
  campaign: CampaignBoardSummary;
  blockedDeliverables: CampaignBoardSummary["deliverables"];
  reviewDeliverables: CampaignBoardSummary["deliverables"];
  missingBrandEvidence: string[];
}): string {
  if (input.blockedDeliverables.length) {
    return `Resolve ${input.campaign.name} blocked deliverables before launch approval.`;
  }

  if (input.missingBrandEvidence.length) {
    return `Attach ${input.missingBrandEvidence.join(", ")} evidence to ${input.campaign.name}.`;
  }

  if (input.reviewDeliverables.length) {
    return `Move ${input.campaign.name} deliverables through approval review.`;
  }

  return `${input.campaign.name} is ready for brand compliance approval.`;
}

function isPolicyLegalReviewRequired(input: {
  domain: PolicyAsCodeDomain;
  detail: string;
}): boolean {
  return (
    input.domain === "assets" ||
    input.domain === "retention" ||
    input.domain === "sharing" ||
    hasLegalSignal(input.detail)
  );
}

function hasLegalSignal(value: string): boolean {
  return /legal|license|licence|rights|retention|hold|public|external/i.test(
    value,
  );
}

function findAuditIdsForSources(
  input: BrandComplianceApprovalCenterInput,
  sourceIds: string[],
): string[] {
  const sourceIdSet = new Set(sourceIds);

  return input.auditLogs
    .filter(
      (log) =>
        (log.targetId && sourceIdSet.has(log.targetId)) ||
        Object.values(log.metadata).some(
          (value) => typeof value === "string" && sourceIdSet.has(value),
        ),
    )
    .map((log) => log.id);
}

function aggregateStatus(
  statuses: BrandComplianceApprovalStatus[],
): BrandComplianceApprovalStatus {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("review")) return "review";

  return "ready";
}

function scoreToStatus(score: number): BrandComplianceApprovalStatus {
  if (score >= 80) return "ready";
  if (score >= 55) return "review";

  return "blocked";
}

function average(values: number[], fallback: number): number {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function normalizeDate(value: string | Date | undefined): Date {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

const policyApproverRoles: Record<PolicyAsCodeDomain, string> = {
  sharing: "Workspace admin",
  publishing: "Campaign approver",
  assets: "Legal reviewer",
  approvals: "Approval owner",
  retention: "Legal reviewer",
};
