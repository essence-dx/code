import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import {
  isApprovalAuditLog,
  scoreToStatus,
  statusWeight,
} from "@/features/review/enterprise-approval-workflow-utils";
import type {
  EnterpriseApprovalGovernancePacket,
  EnterpriseApprovalGovernanceReport,
  EnterpriseApprovalWorkflowStatus,
  EnterpriseApprovalWorkflowTemplate,
} from "@/features/review/enterprise-approval-workflows-types";

export function createGovernanceReports(input: {
  workflowTemplates: EnterpriseApprovalWorkflowTemplate[];
  auditLogs: WorkspaceAuditLogSummary[];
}): EnterpriseApprovalGovernanceReport[] {
  const pendingSubjects = input.workflowTemplates.reduce(
    (total, workflow) => total + workflow.subjects.length,
    0,
  );
  const blockedWorkflows = input.workflowTemplates.filter(
    (workflow) => workflow.status === "blocked",
  ).length;
  const reviewWorkflows = input.workflowTemplates.filter(
    (workflow) => workflow.status === "review",
  ).length;
  const missingOwners = input.workflowTemplates.reduce(
    (total, workflow) =>
      total +
      workflow.stageOwners.filter((owner) => owner.coverage === "missing")
        .length,
    0,
  );
  const overdueCount = input.workflowTemplates.reduce(
    (total, workflow) => total + workflow.reviewerSla.overdueCount,
    0,
  );
  const dueSoonCount = input.workflowTemplates.reduce(
    (total, workflow) => total + workflow.reviewerSla.dueSoonCount,
    0,
  );
  const escalationRules = input.workflowTemplates.flatMap(
    (workflow) => workflow.escalationRules,
  );
  const blockedEscalations = escalationRules.filter(
    (rule) => rule.status === "blocked",
  ).length;
  const auditEvents = input.auditLogs.filter(isApprovalAuditLog);

  return [
    createReport({
      id: "workflow-coverage",
      label: "Workflow template coverage",
      score: Math.max(0, 100 - blockedWorkflows * 30 - reviewWorkflows * 12),
      detail: `${input.workflowTemplates.length} workflow templates, ${pendingSubjects} pending approval subjects`,
      evidence: input.workflowTemplates.map(
        (workflow) => `${workflow.title}: ${workflow.score}/100`,
      ),
    }),
    createReport({
      id: "stage-owners",
      label: "Stage owner coverage",
      score: Math.max(0, 100 - missingOwners * 25),
      detail: `${missingOwners} missing stage owners across intake, review, approval, and governance stages`,
      evidence: input.workflowTemplates.flatMap((workflow) =>
        workflow.stageOwners.map(
          (owner) =>
            `${workflow.title} ${owner.stage}: ${owner.ownerLabel} (${owner.coverage})`,
        ),
      ),
    }),
    createReport({
      id: "reviewer-slas",
      label: "Reviewer SLA governance",
      score: Math.max(0, 100 - overdueCount * 45 - dueSoonCount * 10),
      detail: `${overdueCount} overdue reviewer items, ${dueSoonCount} due soon`,
      evidence: input.workflowTemplates.map(
        (workflow) => `${workflow.title}: ${workflow.reviewerSla.detail}`,
      ),
    }),
    createReport({
      id: "escalation-rules",
      label: "Escalation rule readiness",
      score: Math.max(0, 100 - blockedEscalations * 24),
      detail: `${escalationRules.length} escalation rules, ${blockedEscalations} blocked`,
      evidence: escalationRules.length
        ? escalationRules.map((rule) => `${rule.title}: ${rule.trigger}`)
        : ["No active escalation rules."],
    }),
    createReport({
      id: "audit-evidence",
      label: "Approval audit evidence",
      score: auditEvents.length ? 100 : pendingSubjects ? 55 : 80,
      detail: `${auditEvents.length} approval audit events available for dashboard reporting`,
      evidence: auditEvents.length
        ? auditEvents.slice(0, 5).map((log) => log.summary)
        : ["No approval audit events found."],
    }),
  ];
}

export function createGovernancePacket(input: {
  status: EnterpriseApprovalWorkflowStatus;
  workflowTemplates: EnterpriseApprovalWorkflowTemplate[];
  governanceReports: EnterpriseApprovalGovernanceReport[];
  nextActions: string[];
  now: Date;
}): EnterpriseApprovalGovernancePacket {
  const auditLogIds = [
    ...new Set(
      input.workflowTemplates.flatMap((workflow) => workflow.auditLogIds),
    ),
  ];
  const payload = {
    kind: "essence-studio.enterprise-approval-workflows",
    version: 1,
    generatedAt: input.now.toISOString(),
    status: input.status,
    workflowTemplates: input.workflowTemplates,
    governanceReports: input.governanceReports,
    nextActions: input.nextActions,
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    id: "enterprise-approval-workflows",
    status: input.status,
    workflowTemplateIds: input.workflowTemplates.map((workflow) => workflow.id),
    auditLogIds,
    download: {
      fileName: "enterprise-approval-workflows.json",
      href: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      json,
    },
  };
}

export function createNextActions(
  workflowTemplates: EnterpriseApprovalWorkflowTemplate[],
) {
  const escalationActions = workflowTemplates
    .flatMap((workflow) =>
      workflow.escalationRules.map((rule) => ({
        status: rule.status,
        text: `${workflow.title}: ${rule.action}`,
      })),
    )
    .sort(
      (left, right) => statusWeight(left.status) - statusWeight(right.status),
    )
    .map((item) => item.text);

  if (escalationActions.length) return escalationActions.slice(0, 5);

  return workflowTemplates
    .filter((workflow) => workflow.status === "review")
    .map((workflow) => `${workflow.title}: ${workflow.governanceDetail}`)
    .slice(0, 5);
}

function createReport(input: {
  id: EnterpriseApprovalGovernanceReport["id"];
  label: string;
  score: number;
  detail: string;
  evidence: string[];
}): EnterpriseApprovalGovernanceReport {
  return {
    id: input.id,
    label: input.label,
    score: input.score,
    status: scoreToStatus(input.score),
    detail: input.detail,
    evidence: input.evidence.slice(0, 8),
  };
}
