import type {
  AccountProfile,
  AccountSessionSummary,
} from "@/db/account-settings";
import type { AuthEmailSummary } from "@/db/auth-emails";
import type {
  WebsiteFormSubmissionSummary,
  WebsitePublishSummary,
} from "@/db/website-publishing";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ProjectSummary } from "@/features/editor/types";

export type CompliancePrivacyStatus = "ready" | "review" | "blocked";

export type ConsentCaptureSignal = {
  id: string;
  websiteTitle: string;
  status: CompliancePrivacyStatus;
  score: number;
  detail: string;
  submissionCount: number;
  consentFieldCount: number;
  fields: string[];
};

export type PublicFormSafetyCheck = {
  id: string;
  label: string;
  status: CompliancePrivacyStatus;
  score: number;
  detail: string;
};

export type AccountDataPacket = {
  id: "export" | "delete";
  title: string;
  status: CompliancePrivacyStatus;
  score: number;
  detail: string;
  fileName: string;
  dataUrl: string;
  checklist: Array<{
    label: string;
    value: string;
    status: CompliancePrivacyStatus;
  }>;
};

export type AuditRetentionSetting = {
  id: string;
  status: CompliancePrivacyStatus;
  score: number;
  retentionDays: number;
  totalLogs: number;
  logsOutsideRetention: number;
  oldestLogAt: string | null;
  detail: string;
};

export type CompliancePrivacyCenter = {
  status: CompliancePrivacyStatus;
  score: number;
  consentSignals: ConsentCaptureSignal[];
  formSafetyChecks: PublicFormSafetyCheck[];
  accountPackets: AccountDataPacket[];
  auditRetention: AuditRetentionSetting;
  nextActions: string[];
  totals: {
    publishedForms: number;
    submissions: number;
    consentReadyForms: number;
    sensitiveFieldIssues: number;
    accountPackets: number;
    auditLogs: number;
  };
};

const retentionDays = 180;
const consentFieldPattern = /(consent|privacy|terms|gdpr|agree|permission)/i;
const sensitiveFieldPattern =
  /(password|secret|token|card|credit|cvv|ssn|passport|national.?id)/i;

export function createCompliancePrivacyCenter(input: {
  profile: AccountProfile;
  sessions: AccountSessionSummary[];
  authEmails: AuthEmailSummary[];
  projects: ProjectSummary[];
  websitePublishes: WebsitePublishSummary[];
  websiteFormSubmissions: WebsiteFormSubmissionSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: Date;
}): CompliancePrivacyCenter {
  const now = input.now ?? new Date();
  const consentSignals = createConsentSignals({
    publishes: input.websitePublishes,
    submissions: input.websiteFormSubmissions,
  });
  const formSafetyChecks = createFormSafetyChecks(consentSignals);
  const auditRetention = createAuditRetentionSetting(input.auditLogs, now);
  const accountPackets = createAccountPackets({
    profile: input.profile,
    sessions: input.sessions,
    authEmails: input.authEmails,
    projects: input.projects,
    websitePublishes: input.websitePublishes,
    websiteFormSubmissions: input.websiteFormSubmissions,
    auditLogs: input.auditLogs,
    consentSignals,
    auditRetention,
    now,
  });
  const score = average([
    average(consentSignals.map((signal) => signal.score)),
    average(formSafetyChecks.map((check) => check.score)),
    auditRetention.score,
    average(accountPackets.map((packet) => packet.score)),
  ]);

  return {
    status: scoreToStatus(
      score,
      formSafetyChecks.some((check) => check.status === "blocked") ||
        accountPackets.some((packet) => packet.status === "blocked") ||
        auditRetention.status === "blocked",
    ),
    score,
    consentSignals,
    formSafetyChecks,
    accountPackets,
    auditRetention,
    nextActions: createNextActions({
      consentSignals,
      formSafetyChecks,
      auditRetention,
      accountPackets,
    }),
    totals: {
      publishedForms: consentSignals.length,
      submissions: input.websiteFormSubmissions.length,
      consentReadyForms: consentSignals.filter(
        (signal) => signal.status === "ready",
      ).length,
      sensitiveFieldIssues: formSafetyChecks.find(
        (check) => check.id === "sensitive-fields",
      )?.score === 100
        ? 0
        : countSensitiveFieldIssues(input.websiteFormSubmissions),
      accountPackets: accountPackets.length,
      auditLogs: input.auditLogs.length,
    },
  };
}

function createConsentSignals(input: {
  publishes: WebsitePublishSummary[];
  submissions: WebsiteFormSubmissionSummary[];
}): ConsentCaptureSignal[] {
  return input.publishes
    .filter((publish) => publish.status === "published")
    .map((publish) => {
      const submissions = input.submissions.filter(
        (submission) => submission.publishId === publish.id,
      );
      const fields = Array.from(
        new Set(submissions.flatMap((submission) => Object.keys(submission.payload))),
      ).sort();
      const consentFieldCount = fields.filter((field) =>
        consentFieldPattern.test(field),
      ).length;
      const score = submissions.length
        ? consentFieldCount
          ? 100
          : 35
        : 70;

      return {
        id: `consent-${publish.id}`,
        websiteTitle: publish.title,
        status: scoreToStatus(score, false),
        score,
        detail: submissions.length
          ? consentFieldCount
            ? "Consent capture is present in submitted form payloads."
            : "Submissions exist, but no consent or privacy acknowledgement field is present."
          : "No submissions have been collected yet.",
        submissionCount: submissions.length,
        consentFieldCount,
        fields,
      };
    })
    .sort(
      (left, right) =>
        statusWeight(left.status) - statusWeight(right.status) ||
        left.score - right.score ||
        left.websiteTitle.localeCompare(right.websiteTitle),
    );
}

function createFormSafetyChecks(
  consentSignals: ConsentCaptureSignal[],
): PublicFormSafetyCheck[] {
  const totalForms = consentSignals.length;
  const consentReady = consentSignals.filter(
    (signal) => signal.consentFieldCount > 0 || signal.submissionCount === 0,
  ).length;
  const sensitiveFields = consentSignals.flatMap((signal) =>
    signal.fields.filter((field) => sensitiveFieldPattern.test(field)),
  );
  const payloadVisibilityScore = sensitiveFields.length ? 0 : 100;
  const consentScore = totalForms ? ratioScore(consentReady, totalForms) : 75;

  return [
    {
      id: "consent-capture",
      label: "Consent capture",
      status: scoreToStatus(consentScore, totalForms > 0 && consentReady === 0),
      score: consentScore,
      detail: `${consentReady} of ${totalForms} published forms have consent-ready payloads or no submissions yet.`,
    },
    {
      id: "sensitive-fields",
      label: "Sensitive field safety",
      status: sensitiveFields.length ? "blocked" : "ready",
      score: payloadVisibilityScore,
      detail: sensitiveFields.length
        ? `Remove sensitive public fields: ${Array.from(new Set(sensitiveFields)).join(", ")}.`
        : "No password, token, card, or national ID fields were found in public submissions.",
    },
    {
      id: "submission-minimization",
      label: "Submission minimization",
      status: scoreToStatus(
        average(consentSignals.map((signal) => (signal.fields.length <= 8 ? 100 : 55))),
        false,
      ),
      score: average(
        consentSignals.map((signal) => (signal.fields.length <= 8 ? 100 : 55)),
      ),
      detail: "Public forms should request only the fields needed for follow-up.",
    },
  ];
}

function createAuditRetentionSetting(
  auditLogs: WorkspaceAuditLogSummary[],
  now: Date,
): AuditRetentionSetting {
  const oldest = [...auditLogs].sort(
    (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt),
  )[0];
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  const outsideRetention = auditLogs.filter(
    (log) => Date.parse(log.createdAt) < cutoff,
  );
  const score = auditLogs.length
    ? Math.max(0, 100 - outsideRetention.length * 15)
    : 65;

  return {
    id: "audit-retention",
    status: scoreToStatus(score, outsideRetention.length > 6),
    score,
    retentionDays,
    totalLogs: auditLogs.length,
    logsOutsideRetention: outsideRetention.length,
    oldestLogAt: oldest?.createdAt ?? null,
    detail: outsideRetention.length
      ? `${outsideRetention.length} audit log${outsideRetention.length === 1 ? "" : "s"} are older than ${retentionDays} days.`
      : `Audit logs fit within the ${retentionDays}-day review window.`,
  };
}

function createAccountPackets(input: {
  profile: AccountProfile;
  sessions: AccountSessionSummary[];
  authEmails: AuthEmailSummary[];
  projects: ProjectSummary[];
  websitePublishes: WebsitePublishSummary[];
  websiteFormSubmissions: WebsiteFormSubmissionSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  consentSignals: ConsentCaptureSignal[];
  auditRetention: AuditRetentionSetting;
  now: Date;
}): AccountDataPacket[] {
  const exportPayload = {
    kind: "essence-studio.account-export",
    exportedAt: input.now.toISOString(),
    profile: input.profile,
    sessions: input.sessions,
    authEmails: input.authEmails,
    projects: input.projects.map((project) => ({
      id: project.id,
      name: project.name,
      approvalStatus: project.approvalStatus,
      publicShareId: project.publicShareId,
      editShareId: project.editShareId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })),
    websites: input.websitePublishes,
    submissionCount: input.websiteFormSubmissions.length,
    auditLogCount: input.auditLogs.length,
  };
  const deletePayload = {
    kind: "essence-studio.account-delete-readiness",
    exportedAt: input.now.toISOString(),
    accountId: input.profile.id,
    email: input.profile.email,
    activeProjects: input.projects.filter((project) => !project.deletedAt).length,
    publicShares: input.projects.filter((project) => project.publicShareId).length,
    editShares: input.projects.filter((project) => project.editShareId).length,
    websitePublishes: input.websitePublishes.length,
    submissions: input.websiteFormSubmissions.length,
    auditRetention: input.auditRetention,
  };
  const deleteScore = createDeleteReadinessScore(deletePayload);

  return [
    {
      id: "export",
      title: "Account data export",
      status: input.profile.emailVerified ? "ready" : "review",
      score: input.profile.emailVerified ? 100 : 70,
      detail: "Download a compact account data packet for portability review.",
      fileName: "essence-account-export.json",
      dataUrl: createJsonDataUrl(exportPayload),
      checklist: [
        {
          label: "Email",
          value: input.profile.emailVerified ? "Verified" : "Unverified",
          status: input.profile.emailVerified ? "ready" : "review",
        },
        {
          label: "Sessions",
          value: `${input.sessions.length} active`,
          status: input.sessions.length > 3 ? "review" : "ready",
        },
        {
          label: "Submissions",
          value: `${input.websiteFormSubmissions.length} public form records`,
          status: input.consentSignals.some((signal) => signal.status === "blocked")
            ? "blocked"
            : "ready",
        },
      ],
    },
    {
      id: "delete",
      title: "Delete readiness packet",
      status: scoreToStatus(deleteScore, false),
      score: deleteScore,
      detail: "Review public surfaces and retained records before account deletion.",
      fileName: "essence-delete-readiness.json",
      dataUrl: createJsonDataUrl(deletePayload),
      checklist: [
        {
          label: "Active projects",
          value: `${deletePayload.activeProjects}`,
          status: deletePayload.activeProjects ? "review" : "ready",
        },
        {
          label: "Public shares",
          value: `${deletePayload.publicShares + deletePayload.editShares}`,
          status:
            deletePayload.publicShares + deletePayload.editShares
              ? "review"
              : "ready",
        },
        {
          label: "Website records",
          value: `${deletePayload.websitePublishes} sites, ${deletePayload.submissions} submissions`,
          status: deletePayload.submissions ? "review" : "ready",
        },
      ],
    },
  ];
}

function createDeleteReadinessScore(input: {
  activeProjects: number;
  publicShares: number;
  editShares: number;
  websitePublishes: number;
  submissions: number;
}) {
  return Math.max(
    35,
    100 -
      input.activeProjects * 4 -
      (input.publicShares + input.editShares) * 8 -
      input.websitePublishes * 6 -
      input.submissions * 3,
  );
}

function createNextActions(input: {
  consentSignals: ConsentCaptureSignal[];
  formSafetyChecks: PublicFormSafetyCheck[];
  auditRetention: AuditRetentionSetting;
  accountPackets: AccountDataPacket[];
}) {
  return [
    ...input.formSafetyChecks
      .filter((check) => check.status !== "ready")
      .map((check) => `${check.label}: ${check.detail}`),
    ...input.consentSignals
      .filter((signal) => signal.status !== "ready")
      .map((signal) => `${signal.websiteTitle}: ${signal.detail}`),
    input.auditRetention.status !== "ready"
      ? `Audit retention: ${input.auditRetention.detail}`
      : null,
    ...input.accountPackets
      .filter((packet) => packet.status !== "ready")
      .map((packet) => `${packet.title}: ${packet.detail}`),
  ]
    .filter((action): action is string => Boolean(action))
    .slice(0, 5);
}

function countSensitiveFieldIssues(
  submissions: WebsiteFormSubmissionSummary[],
) {
  return submissions.reduce(
    (total, submission) =>
      total +
      Object.keys(submission.payload).filter((field) =>
        sensitiveFieldPattern.test(field),
      ).length,
    0,
  );
}

function createJsonDataUrl(payload: unknown) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(payload, null, 2),
  )}`;
}

function ratioScore(current: number, total: number) {
  if (!total) return 0;

  return Math.round((current / total) * 100);
}

function average(values: number[]) {
  if (!values.length) return 0;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function scoreToStatus(
  score: number,
  hasBlocked: boolean,
): CompliancePrivacyStatus {
  if (hasBlocked || score < 50) return "blocked";
  if (score < 85) return "review";

  return "ready";
}

function statusWeight(status: CompliancePrivacyStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}
