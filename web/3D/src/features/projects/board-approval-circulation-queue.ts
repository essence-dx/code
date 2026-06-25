import type { BoardApprovalPacketHistoryRecord, BoardApprovalPacketHistoryReport } from "@/features/projects/board-approval-packet-history";
import type {
  BoardApprovalRedactionAudience,
  BoardApprovalRedactionPolicyReport,
  BoardApprovalRedactionPolicyStatus,
  BoardApprovalRedactionPolicyTemplate,
} from "@/features/projects/board-approval-redaction-policies";

export type BoardApprovalPacketCirculationStatus = "blocked" | "expired" | "queued" | "revoked" | "sent";

export interface BoardApprovalPacketCirculationQueueRow {
  audience: BoardApprovalRedactionAudience;
  daysUntilExpiry: number;
  expiresAt: string;
  id: string;
  nextAction: string;
  packetRecordId: string | null;
  packetStatus: BoardApprovalRedactionPolicyStatus;
  recipientEmail: string | null;
  recipientName: string;
  recipientPurpose: string;
  redactionCount: number;
  revokedAt: string | null;
  revokeReason: string | null;
  status: BoardApprovalPacketCirculationStatus;
  templateId: string;
  templateLabel: string;
}

export interface BoardApprovalPacketCirculationQueueReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  rows: BoardApprovalPacketCirculationQueueRow[];
  summary: {
    activeHistoryCount: number;
    blockedCount: number;
    expiredCount: number;
    externalQueueCount: number;
    nextAction: string;
    queuedCount: number;
    revokedCount: number;
    sentCount: number;
    status: BoardApprovalRedactionPolicyStatus;
    totalQueueCount: number;
  };
}

export interface CreateBoardApprovalPacketCirculationQueueReportInput {
  generatedAt?: string;
  packetHistory?: BoardApprovalPacketHistoryReport | null;
  redactionPolicies: BoardApprovalRedactionPolicyReport;
  workspaceId?: string;
}

const audienceExpiryDays: Record<BoardApprovalRedactionAudience, number> = {
  client: 5,
  "internal-board": 2,
  investor: 7,
  partner: 5,
};

const statusRank: Record<BoardApprovalPacketCirculationStatus, number> = {
  blocked: 0,
  expired: 1,
  revoked: 2,
  queued: 3,
  sent: 4,
};

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

function csvCell(value: string | number | null) {
  const text = value === null ? "" : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function addDays(value: string, days: number) {
  const base = new Date(value);
  const time = Number.isNaN(base.getTime()) ? Date.now() : base.getTime();

  return new Date(time + days * 24 * 60 * 60 * 1000).toISOString();
}

function daysUntil(expiresAt: string, generatedAt: string) {
  const diff = new Date(expiresAt).getTime() - new Date(generatedAt).getTime();

  if (Number.isNaN(diff)) {
    return 0;
  }

  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

function recipientPurpose(template: BoardApprovalRedactionPolicyTemplate) {
  return `${template.label} - board approval packet`;
}

function defaultRecipientName(template: BoardApprovalRedactionPolicyTemplate) {
  switch (template.audience) {
    case "client":
      return "Client reviewer";
    case "internal-board":
      return "Internal board";
    case "investor":
      return "Investor reviewer";
    case "partner":
      return "Partner reviewer";
  }
}

function findLatestRecord(records: BoardApprovalPacketHistoryRecord[], purpose: string) {
  return records
    .filter((record) => record.recipientPurpose === purpose)
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt) || second.createdAt.localeCompare(first.createdAt))[0] ?? null;
}

function rowStatus(input: {
  expiresAt: string;
  generatedAt: string;
  record: BoardApprovalPacketHistoryRecord | null;
  template: BoardApprovalRedactionPolicyTemplate;
}): BoardApprovalPacketCirculationStatus {
  if (input.record?.status === "revoked") {
    return "revoked";
  }

  if (new Date(input.expiresAt).getTime() <= new Date(input.generatedAt).getTime()) {
    return "expired";
  }

  if (input.template.preview.status === "blocked") {
    return "blocked";
  }

  return input.record?.status === "active" ? "sent" : "queued";
}

function nextActionFor(input: {
  daysUntilExpiry: number;
  record: BoardApprovalPacketHistoryRecord | null;
  status: BoardApprovalPacketCirculationStatus;
  template: BoardApprovalRedactionPolicyTemplate;
}) {
  switch (input.status) {
    case "blocked":
      return `Resolve packet blockers before circulating ${input.template.label}.`;
    case "expired":
      return `Refresh and reissue ${input.template.label}; the current packet expired.`;
    case "queued":
      return `Save and circulate the ${input.template.label} packet.`;
    case "revoked":
      return `Review revocation reason and create a replacement ${input.template.label} packet.`;
    case "sent":
      return input.daysUntilExpiry <= 1
        ? `Refresh ${input.template.label}; recipient access expires in ${input.daysUntilExpiry} day${input.daysUntilExpiry === 1 ? "" : "s"}.`
        : `Track downloads for ${input.record?.recipientName ?? input.template.label}.`;
  }
}

function createRow(input: {
  generatedAt: string;
  historyRecords: BoardApprovalPacketHistoryRecord[];
  template: BoardApprovalRedactionPolicyTemplate;
}) {
  const purpose = recipientPurpose(input.template);
  const record = findLatestRecord(input.historyRecords, purpose);
  const expiresAt = addDays(record?.createdAt ?? input.generatedAt, audienceExpiryDays[input.template.audience]);
  const days = daysUntil(expiresAt, input.generatedAt);
  const status = rowStatus({
    expiresAt,
    generatedAt: input.generatedAt,
    record,
    template: input.template,
  });

  return {
    audience: input.template.audience,
    daysUntilExpiry: days,
    expiresAt,
    id: `board-circulation:${input.template.audience}`,
    nextAction: nextActionFor({
      daysUntilExpiry: days,
      record,
      status,
      template: input.template,
    }),
    packetRecordId: record?.id ?? null,
    packetStatus: input.template.preview.status,
    recipientEmail: record?.recipientEmail ?? null,
    recipientName: record?.recipientName ?? defaultRecipientName(input.template),
    recipientPurpose: purpose,
    redactionCount: input.template.preview.redactionCount,
    revokedAt: record?.revokedAt ?? null,
    revokeReason: record?.revokeReason ?? null,
    status,
    templateId: input.template.id,
    templateLabel: input.template.label,
  } satisfies BoardApprovalPacketCirculationQueueRow;
}

function compareRows(first: BoardApprovalPacketCirculationQueueRow, second: BoardApprovalPacketCirculationQueueRow) {
  return (
    statusRank[first.status] - statusRank[second.status] ||
    first.daysUntilExpiry - second.daysUntilExpiry ||
    first.templateLabel.localeCompare(second.templateLabel)
  );
}

function createCsv(rows: BoardApprovalPacketCirculationQueueRow[]) {
  const header = ["audience", "template", "status", "recipient_purpose", "recipient", "expires_at", "revoked_at", "next_action"];
  const csvRows = rows.map((row) =>
    [row.audience, row.templateLabel, row.status, row.recipientPurpose, row.recipientEmail ?? row.recipientName, row.expiresAt, row.revokedAt, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...csvRows].join("\n")}\n`;
}

function reportStatus(rows: BoardApprovalPacketCirculationQueueRow[], policyStatus: BoardApprovalRedactionPolicyStatus): BoardApprovalRedactionPolicyStatus {
  if (policyStatus === "blocked" || rows.some((row) => row.status === "blocked" || row.status === "expired" || row.status === "revoked")) {
    return "blocked";
  }

  if (policyStatus === "watch" || rows.some((row) => row.status === "queued")) {
    return "watch";
  }

  return "ready";
}

function createSummary(input: {
  history: BoardApprovalPacketHistoryReport | null | undefined;
  policies: BoardApprovalRedactionPolicyReport;
  rows: BoardApprovalPacketCirculationQueueRow[];
}) {
  const status = reportStatus(input.rows, input.policies.summary.status);
  const topRow = input.rows.find((row) => row.status !== "sent") ?? input.rows[0] ?? null;

  return {
    activeHistoryCount: input.history?.summary.activeCount ?? 0,
    blockedCount: input.rows.filter((row) => row.status === "blocked").length,
    expiredCount: input.rows.filter((row) => row.status === "expired").length,
    externalQueueCount: input.rows.filter((row) => row.audience !== "internal-board").length,
    nextAction: topRow?.nextAction ?? input.policies.summary.nextAction,
    queuedCount: input.rows.filter((row) => row.status === "queued").length,
    revokedCount: input.rows.filter((row) => row.status === "revoked").length,
    sentCount: input.rows.filter((row) => row.status === "sent").length,
    status,
    totalQueueCount: input.rows.length,
  } satisfies BoardApprovalPacketCirculationQueueReport["summary"];
}

export function createBoardApprovalPacketCirculationQueueReport(
  input: CreateBoardApprovalPacketCirculationQueueReportInput,
): BoardApprovalPacketCirculationQueueReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const historyRecords = input.packetHistory?.records ?? [];
  const rows = input.redactionPolicies.templates
    .map((template) =>
      createRow({
        generatedAt,
        historyRecords,
        template,
      }),
    )
    .sort(compareRows);
  const csvContent = createCsv(rows);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(input.workspaceId ?? "workspace")}-board-circulation-queue.csv`,
    generatedAt,
    rows,
    summary: createSummary({
      history: input.packetHistory,
      policies: input.redactionPolicies,
      rows,
    }),
  };
}
