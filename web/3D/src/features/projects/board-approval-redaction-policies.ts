import type { BoardApprovalMeetingAgendaReport } from "@/features/projects/board-approval-agenda";
import type { BoardApprovalPacketDiffReport } from "@/features/projects/board-approval-diff";
import type {
  BoardApprovalPacketCriticalPathRow,
  BoardApprovalPacketReport,
  BoardApprovalPacketSignOffRow,
  BoardApprovalPacketStatus,
} from "@/features/projects/board-approval-packet";

export type BoardApprovalRedactionAudience = "client" | "internal-board" | "investor" | "partner";
export type BoardApprovalRedactionStrictness = "balanced" | "internal" | "restricted" | "strict";
export type BoardApprovalRedactionPolicyStatus = BoardApprovalPacketStatus;
export type BoardApprovalRedactionRuleAction = "allow" | "mask" | "remove";
export type BoardApprovalRedactionRuleKind =
  | "email"
  | "evidence-link"
  | "financial"
  | "internal-action"
  | "owner"
  | "project"
  | "raw-checksum"
  | "status-detail"
  | "system";

export interface BoardApprovalRedactionPolicyRule {
  action: BoardApprovalRedactionRuleAction;
  appliesTo: BoardApprovalRedactionAudience[];
  id: string;
  kind: BoardApprovalRedactionRuleKind;
  label: string;
  reason: string;
}

export interface BoardApprovalRedactionPolicyPreview {
  audience: BoardApprovalRedactionAudience;
  criticalPath: BoardApprovalPacketCriticalPathRow[];
  executiveMemo: string;
  redactedSummary: string;
  redactionCount: number;
  removedFieldCount: number;
  retainedFieldCount: number;
  signOffs: BoardApprovalPacketSignOffRow[];
  status: BoardApprovalRedactionPolicyStatus;
}

export interface BoardApprovalRedactionPolicyTemplate {
  allowedSections: string[];
  audience: BoardApprovalRedactionAudience;
  description: string;
  id: string;
  label: string;
  preview: BoardApprovalRedactionPolicyPreview;
  removedSections: string[];
  rules: BoardApprovalRedactionPolicyRule[];
  strictness: BoardApprovalRedactionStrictness;
  summary: string;
}

export interface BoardApprovalRedactionPolicyReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  summary: {
    externalTemplateCount: number;
    nextAction: string;
    removedFieldCount: number;
    retainedFieldCount: number;
    status: BoardApprovalRedactionPolicyStatus;
    templateCount: number;
    totalRedactionCount: number;
  };
  templates: BoardApprovalRedactionPolicyTemplate[];
}

export interface CreateBoardApprovalRedactionPolicyReportInput {
  boardApprovalAgenda?: BoardApprovalMeetingAgendaReport | null;
  boardApprovalDiff?: BoardApprovalPacketDiffReport | null;
  boardApprovalPacket: BoardApprovalPacketReport;
  generatedAt?: string;
  workspaceId?: string;
}

interface AudiencePolicyConfig {
  allowedSections: string[];
  audience: BoardApprovalRedactionAudience;
  description: string;
  keepChecksums: boolean;
  keepEmails: boolean;
  keepEvidenceLinks: boolean;
  keepOwnerNames: boolean;
  label: string;
  removedSections: string[];
  rules: BoardApprovalRedactionPolicyRule[];
  strictness: BoardApprovalRedactionStrictness;
}

const statusRank: Record<BoardApprovalRedactionPolicyStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const audienceConfigs: AudiencePolicyConfig[] = [
  {
    allowedSections: ["approval state", "approval score", "board-level blockers", "scenario recommendation"],
    audience: "investor",
    description: "Strict investor view with business status, release decision context, and no personal or raw evidence tokens.",
    keepChecksums: false,
    keepEmails: false,
    keepEvidenceLinks: false,
    keepOwnerNames: false,
    label: "Investor review",
    removedSections: ["raw checksums", "internal URLs", "personal emails", "private owner names", "internal runbook actions"],
    rules: [
      rule("investor-status-detail", "status-detail", "allow", "Keep release status and board decision context visible.", ["investor"]),
      rule("investor-email", "email", "remove", "Remove direct personal contact data before investor circulation.", ["investor"]),
      rule("investor-owner", "owner", "mask", "Replace owner names with accountability roles.", ["investor"]),
      rule("investor-evidence-link", "evidence-link", "remove", "Remove internal URLs and mailbox links from investor packets.", ["investor"]),
      rule("investor-raw-checksum", "raw-checksum", "remove", "Hide raw packet and source checksums outside the workspace.", ["investor"]),
      rule("investor-internal-action", "internal-action", "mask", "Summarize internal runbook actions without operational links.", ["investor"]),
    ],
    strictness: "strict",
  },
  {
    allowedSections: ["approval state", "client-impacting blockers", "timeline-safe next actions", "release readiness summary"],
    audience: "client",
    description: "Client-facing policy for accountable release updates without exposing private operators or internal systems.",
    keepChecksums: false,
    keepEmails: false,
    keepEvidenceLinks: false,
    keepOwnerNames: false,
    label: "Client review",
    removedSections: ["raw checksums", "internal URLs", "personal emails", "private owner names"],
    rules: [
      rule("client-status-detail", "status-detail", "allow", "Keep delivery status and blockers readable for client decisions.", ["client"]),
      rule("client-email", "email", "mask", "Mask direct personal contact data in client-ready packets.", ["client"]),
      rule("client-owner", "owner", "mask", "Use role labels instead of personal owner names.", ["client"]),
      rule("client-evidence-link", "evidence-link", "remove", "Remove internal evidence URLs from client packets.", ["client"]),
      rule("client-raw-checksum", "raw-checksum", "remove", "Keep checksum proof in internal records, not client exports.", ["client"]),
    ],
    strictness: "restricted",
  },
  {
    allowedSections: ["approval state", "integration-safe evidence labels", "partner-facing next actions", "dependency status"],
    audience: "partner",
    description: "Partner policy that keeps integration labels and dependency actions while masking private people and systems.",
    keepChecksums: false,
    keepEmails: false,
    keepEvidenceLinks: false,
    keepOwnerNames: false,
    label: "Partner review",
    removedSections: ["personal emails", "internal URLs", "raw checksums"],
    rules: [
      rule("partner-status-detail", "status-detail", "allow", "Keep dependency and integration status visible to partners.", ["partner"]),
      rule("partner-evidence-link", "evidence-link", "mask", "Replace internal evidence links with human-safe labels.", ["partner"]),
      rule("partner-email", "email", "mask", "Mask direct personal email addresses in partner packets.", ["partner"]),
      rule("partner-owner", "owner", "mask", "Use role labels for owner accountability.", ["partner"]),
      rule("partner-raw-checksum", "raw-checksum", "remove", "Remove raw checksum data from partner handoffs.", ["partner"]),
    ],
    strictness: "balanced",
  },
  {
    allowedSections: ["full memo", "owner accountability", "agenda and diff context", "raw checksums", "source evidence"],
    audience: "internal-board",
    description: "Internal board policy that preserves accountability, direct evidence, and checksum proof for sign-off.",
    keepChecksums: true,
    keepEmails: true,
    keepEvidenceLinks: true,
    keepOwnerNames: true,
    label: "Internal board",
    removedSections: ["external-only public distribution"],
    rules: [
      rule("internal-status-detail", "status-detail", "allow", "Show full approval state for internal board decision-making.", ["internal-board"]),
      rule("internal-email", "email", "allow", "Retain direct owner contact data for accountable board follow-up.", ["internal-board"]),
      rule("internal-owner", "owner", "allow", "Retain owner names for internal accountability.", ["internal-board"]),
      rule("internal-evidence-link", "evidence-link", "allow", "Retain internal evidence links for board verification.", ["internal-board"]),
      rule("internal-raw-checksum", "raw-checksum", "allow", "Retain raw checksums for packet integrity verification.", ["internal-board"]),
    ],
    strictness: "internal",
  },
];

function rule(
  id: string,
  kind: BoardApprovalRedactionRuleKind,
  action: BoardApprovalRedactionRuleAction,
  reason: string,
  appliesTo: BoardApprovalRedactionAudience[],
): BoardApprovalRedactionPolicyRule {
  return {
    action,
    appliesTo,
    id,
    kind,
    label: kind
      .split("-")
      .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
      .join(" "),
    reason,
  };
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64) || "workspace"
  );
}

function csvCell(value: string | number) {
  const text = String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function worstStatus(statuses: BoardApprovalRedactionPolicyStatus[]) {
  return statuses.reduce<BoardApprovalRedactionPolicyStatus>((worst, status) => (statusRank[status] < statusRank[worst] ? status : worst), "ready");
}

function createRedactor(config: AudiencePolicyConfig) {
  let count = 0;

  function replaceWithCount(value: string, pattern: RegExp, replacement: string) {
    return value.replace(pattern, () => {
      count += 1;

      return replacement;
    });
  }

  return {
    count() {
      return count;
    },
    redactText(value: string | null | undefined) {
      let text = value ?? "";

      if (!config.keepEmails) {
        text = replaceWithCount(text, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]");
        text = replaceWithCount(text, /\bmailto:[^\s),]+/gi, "[redacted-email-link]");
      }

      if (!config.keepEvidenceLinks) {
        text = replaceWithCount(text, /\bhttps?:\/\/[^\s),]+/gi, "[redacted-url]");
      }

      if (!config.keepChecksums) {
        text = replaceWithCount(text, /\bsha256:[A-Z0-9._:-]+\b/gi, "[redacted-checksum]");
      }

      return text;
    },
    redactOwner(value: string, role: string) {
      if (config.keepOwnerNames) {
        return value;
      }

      count += value ? 1 : 0;

      return `${role} owner`;
    },
  };
}

function redactedLinks(links: string[], redactor: ReturnType<typeof createRedactor>, config: AudiencePolicyConfig) {
  if (config.keepEvidenceLinks) {
    return links.map((link) => redactor.redactText(link));
  }

  return links.length > 0 ? ["Evidence link redacted"] : [];
}

function redactedEmail(value: string | null, redactor: ReturnType<typeof createRedactor>, config: AudiencePolicyConfig) {
  if (!value) {
    return null;
  }

  return config.keepEmails ? value : redactor.redactText(value);
}

function redactedHash(value: string, redactor: ReturnType<typeof createRedactor>, config: AudiencePolicyConfig) {
  return config.keepChecksums ? value : redactor.redactText(value);
}

function redactedSignOffs(input: {
  config: AudiencePolicyConfig;
  redactor: ReturnType<typeof createRedactor>;
  signOffs: BoardApprovalPacketSignOffRow[];
}) {
  return input.signOffs.map((row) => ({
    ...row,
    action: input.redactor.redactText(row.action),
    evidenceHash: redactedHash(row.evidenceHash, input.redactor, input.config),
    evidenceLinks: redactedLinks(row.evidenceLinks, input.redactor, input.config),
    ownerEmail: redactedEmail(row.ownerEmail, input.redactor, input.config),
    ownerName: input.redactor.redactOwner(row.ownerName, row.role),
  }));
}

function redactedCriticalPath(input: {
  config: AudiencePolicyConfig;
  criticalPath: BoardApprovalPacketCriticalPathRow[];
  redactor: ReturnType<typeof createRedactor>;
}) {
  return input.criticalPath.map((row) => ({
    ...row,
    action: input.redactor.redactText(row.action),
    evidence: input.redactor.redactText(row.evidence),
    evidenceHash: redactedHash(row.evidenceHash, input.redactor, input.config),
    ownerName: input.redactor.redactOwner(row.ownerName, row.source),
  }));
}

function fieldCounts(input: {
  config: AudiencePolicyConfig;
  criticalPath: BoardApprovalPacketCriticalPathRow[];
  redactionCount: number;
  signOffs: BoardApprovalPacketSignOffRow[];
}) {
  const retainedBase = 4 + input.signOffs.length * 6 + input.criticalPath.length * 5 + input.config.allowedSections.length;
  const policyRemovedFields = input.config.removedSections.length + input.config.rules.filter((rule) => rule.action === "remove").length;
  const removedFieldCount = policyRemovedFields + input.redactionCount;

  return {
    removedFieldCount,
    retainedFieldCount: Math.max(0, retainedBase - removedFieldCount),
  };
}

function templateStatus(packetStatus: BoardApprovalPacketStatus, diffStatus: BoardApprovalPacketDiffReport["summary"]["status"] | null) {
  return worstStatus([packetStatus, diffStatus ?? "ready"]);
}

function templateSummary(input: {
  agenda: BoardApprovalMeetingAgendaReport | null;
  config: AudiencePolicyConfig;
  diff: BoardApprovalPacketDiffReport | null;
  packet: BoardApprovalPacketReport;
  redactor: ReturnType<typeof createRedactor>;
}) {
  const diffLine = input.diff ? `Diff: ${input.diff.summary.changeCount} changes, ${input.diff.summary.warningChangeCount} warnings.` : "Diff: no saved baseline attached.";
  const agendaLine = input.agenda
    ? `Agenda: ${input.agenda.summary.totalItemCount} items, ${input.agenda.summary.requiredAttendeeCount} required attendees.`
    : "Agenda: no meeting agenda attached.";

  return input.redactor.redactText(
    `${input.config.label} ${input.config.strictness} policy. Status ${input.packet.summary.status}; ${diffLine} ${agendaLine} Next action: ${input.packet.summary.nextAction}`,
  );
}

function createTemplate(input: {
  agenda: BoardApprovalMeetingAgendaReport | null;
  config: AudiencePolicyConfig;
  diff: BoardApprovalPacketDiffReport | null;
  packet: BoardApprovalPacketReport;
}) {
  const redactor = createRedactor(input.config);
  const redactedSummary = redactor.redactText(input.packet.redactedSummary);
  const executiveMemo = redactor.redactText(input.packet.executiveMemo);
  const signOffs = redactedSignOffs({
    config: input.config,
    redactor,
    signOffs: input.packet.signOffs,
  });
  const criticalPath = redactedCriticalPath({
    config: input.config,
    criticalPath: input.packet.criticalPath,
    redactor,
  });
  const summary = templateSummary({
    agenda: input.agenda,
    config: input.config,
    diff: input.diff,
    packet: input.packet,
    redactor,
  });
  const redactionCount = redactor.count();
  const counts = fieldCounts({
    config: input.config,
    criticalPath,
    redactionCount,
    signOffs,
  });
  const status = templateStatus(input.packet.summary.status, input.diff?.summary.status ?? null);

  return {
    allowedSections: input.config.allowedSections,
    audience: input.config.audience,
    description: input.config.description,
    id: `board-redaction-policy:${input.config.audience}`,
    label: input.config.label,
    preview: {
      audience: input.config.audience,
      criticalPath,
      executiveMemo,
      redactedSummary,
      redactionCount,
      removedFieldCount: counts.removedFieldCount,
      retainedFieldCount: counts.retainedFieldCount,
      signOffs,
      status,
    },
    removedSections: input.config.removedSections,
    rules: input.config.rules,
    strictness: input.config.strictness,
    summary,
  } satisfies BoardApprovalRedactionPolicyTemplate;
}

function createCsv(templates: BoardApprovalRedactionPolicyTemplate[]) {
  const header = ["audience", "label", "status", "strictness", "redaction_count", "retained_fields", "removed_fields", "next_action"];
  const rows = templates.map((template) =>
    [
      template.audience,
      template.label,
      template.preview.status,
      template.strictness,
      template.preview.redactionCount,
      template.preview.retainedFieldCount,
      template.preview.removedFieldCount,
      template.summary,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...rows].join("\n")}\n`;
}

function createSummary(templates: BoardApprovalRedactionPolicyTemplate[], packet: BoardApprovalPacketReport): BoardApprovalRedactionPolicyReport["summary"] {
  const totalRedactionCount = templates.reduce((sum, template) => sum + template.preview.redactionCount, 0);
  const retainedFieldCount = templates.reduce((sum, template) => sum + template.preview.retainedFieldCount, 0);
  const removedFieldCount = templates.reduce((sum, template) => sum + template.preview.removedFieldCount, 0);
  const status = worstStatus([packet.summary.status, ...templates.map((template) => template.preview.status)]);

  return {
    externalTemplateCount: templates.filter((template) => template.audience !== "internal-board").length,
    nextAction:
      status === "blocked"
        ? `Apply the matching redaction policy before circulation, then resolve: ${packet.summary.nextAction}`
        : "Apply the matching redaction policy before sending the board packet outside the workspace.",
    removedFieldCount,
    retainedFieldCount,
    status,
    templateCount: templates.length,
    totalRedactionCount,
  };
}

export function createBoardApprovalRedactionPolicyReport(input: CreateBoardApprovalRedactionPolicyReportInput): BoardApprovalRedactionPolicyReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const templates = audienceConfigs.map((config) =>
    createTemplate({
      agenda: input.boardApprovalAgenda ?? null,
      config,
      diff: input.boardApprovalDiff ?? null,
      packet: input.boardApprovalPacket,
    }),
  );
  const csvContent = createCsv(templates);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(input.workspaceId ?? "workspace")}-board-redaction-policies.csv`,
    generatedAt,
    summary: createSummary(templates, input.boardApprovalPacket),
    templates,
  };
}
