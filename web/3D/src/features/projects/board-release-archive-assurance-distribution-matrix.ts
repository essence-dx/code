import { createHash } from "node:crypto";
import type { BoardReleaseArchiveAssuranceNotarizationEntry, BoardReleaseArchiveAssuranceNotarizationRegisterReport } from "@/features/projects/board-release-archive-assurance-notarization-register";
import type {
  BoardReleaseArchiveEvidenceReviewerAudience,
  BoardReleaseArchiveEvidenceReviewerPacket,
  BoardReleaseArchiveEvidenceReviewerPacketReport,
} from "@/features/projects/board-release-archive-evidence-reviewer-packets";

export type BoardReleaseArchiveAssuranceDistributionRoute = "client-secure-link" | "internal-workspace" | "investor-data-room" | "partner-vault";
export type BoardReleaseArchiveAssuranceDistributionStatus = "blocked" | "covered" | "watch";

export interface BoardReleaseArchiveAssuranceDistributionRecipient {
  acknowledgementDeadline: string;
  acknowledgementRequired: boolean;
  audience: BoardReleaseArchiveEvidenceReviewerAudience;
  coverageHash: string;
  expiryAt: string;
  expiryCoverage: string;
  handoffPacketHash: string;
  id: string;
  nextAction: string;
  packetHash: string;
  recipient: string;
  route: BoardReleaseArchiveAssuranceDistributionRoute;
  routeLabel: string;
  status: BoardReleaseArchiveAssuranceDistributionStatus;
  title: string;
}

export interface BoardReleaseArchiveAssuranceDistributionMatrixReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  recipients: BoardReleaseArchiveAssuranceDistributionRecipient[];
  summary: {
    blockedCount: number;
    coveredCount: number;
    distributionHash: string;
    expiryCoveredCount: number;
    matrixScore: number;
    nextAction: string;
    recipientCount: number;
    status: BoardReleaseArchiveAssuranceDistributionStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveAssuranceDistributionMatrixInput {
  generatedAt?: string;
  notarizationRegister: BoardReleaseArchiveAssuranceNotarizationRegisterReport;
  reviewerPackets: BoardReleaseArchiveEvidenceReviewerPacketReport;
  workspaceId?: string;
}

const audienceRank: Record<BoardReleaseArchiveEvidenceReviewerAudience, number> = {
  "internal-board": 0,
  investor: 1,
  client: 2,
  partner: 3,
};

const statusRank: Record<BoardReleaseArchiveAssuranceDistributionStatus, number> = {
  blocked: 0,
  watch: 1,
  covered: 2,
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex")}`;
}

function csvCell(value: string | number | boolean | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function addHours(value: string, hours: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  date.setUTCHours(date.getUTCHours() + hours);

  return date.toISOString();
}

function routeFor(audience: BoardReleaseArchiveEvidenceReviewerAudience): {
  route: BoardReleaseArchiveAssuranceDistributionRoute;
  routeLabel: string;
} {
  switch (audience) {
    case "client":
      return {
        route: "client-secure-link",
        routeLabel: "Client secure review link",
      };
    case "internal-board":
      return {
        route: "internal-workspace",
        routeLabel: "Internal board workspace",
      };
    case "investor":
      return {
        route: "investor-data-room",
        routeLabel: "Investor data room",
      };
    case "partner":
      return {
        route: "partner-vault",
        routeLabel: "Partner restricted vault",
      };
  }
}

function findNotarization(rows: BoardReleaseArchiveAssuranceNotarizationEntry[], kind: BoardReleaseArchiveAssuranceNotarizationEntry["kind"]) {
  return rows.find((row) => row.kind === kind) ?? null;
}

function statusFor(input: {
  handoffNotarization: BoardReleaseArchiveAssuranceNotarizationEntry | null;
  packet: BoardReleaseArchiveEvidenceReviewerPacket;
  reviewerNotarization: BoardReleaseArchiveAssuranceNotarizationEntry | null;
}) {
  if (input.packet.status === "blocked" || input.handoffNotarization?.status === "blocked" || input.reviewerNotarization?.status === "blocked") {
    return "blocked";
  }

  if (input.packet.status === "ready" && input.handoffNotarization?.status === "notarized" && input.reviewerNotarization?.status === "notarized") {
    return "covered";
  }

  return "watch";
}

function nextActionFor(input: {
  packet: BoardReleaseArchiveEvidenceReviewerPacket;
  routeLabel: string;
  status: BoardReleaseArchiveAssuranceDistributionStatus;
}) {
  if (input.status === "blocked") {
    return `Resolve blockers before sending ${input.packet.title} through ${input.routeLabel}.`;
  }

  if (input.status === "watch") {
    return `Send ${input.packet.title} through ${input.routeLabel} with acknowledgement and expiry tracking.`;
  }

  return `Keep ${input.packet.title} distribution evidence covered through ${input.routeLabel}.`;
}

function createRecipient(input: {
  generatedAt: string;
  handoffNotarization: BoardReleaseArchiveAssuranceNotarizationEntry | null;
  packet: BoardReleaseArchiveEvidenceReviewerPacket;
  reviewerNotarization: BoardReleaseArchiveAssuranceNotarizationEntry | null;
  workspaceId: string;
}) {
  const route = routeFor(input.packet.audience);
  const status = statusFor(input);
  const acknowledgementDeadline = addHours(input.generatedAt, input.packet.acknowledgementWindowHours);
  const expiryAt = addHours(acknowledgementDeadline, 24);
  const expiryCoverage =
    status === "covered" ? "covered until recipient acknowledgement is retained" : status === "blocked" ? "blocked before expiry coverage can start" : "watch until acknowledgement is retained";
  const handoffPacketHash = sha256({
    handoff: input.handoffNotarization?.notarizationHash ?? null,
    packet: input.packet.packetHash,
    reviewer: input.reviewerNotarization?.notarizationHash ?? null,
  });
  const coverageHash = sha256({
    acknowledgementDeadline,
    audience: input.packet.audience,
    expiryAt,
    handoffPacketHash,
    route: route.route,
    status,
  });

  return {
    acknowledgementDeadline,
    acknowledgementRequired: input.packet.acknowledgementRequired,
    audience: input.packet.audience,
    coverageHash,
    expiryAt,
    expiryCoverage,
    handoffPacketHash,
    id: `archive-assurance-distribution:${slug(input.workspaceId)}:${input.packet.audience}:${dateStamp(input.generatedAt)}`,
    nextAction: nextActionFor({
      packet: input.packet,
      routeLabel: route.routeLabel,
      status,
    }),
    packetHash: input.packet.packetHash,
    recipient: input.packet.reviewerEmail ?? input.packet.reviewerName,
    route: route.route,
    routeLabel: route.routeLabel,
    status,
    title: input.packet.title,
  } satisfies BoardReleaseArchiveAssuranceDistributionRecipient;
}

function createRecipients(input: CreateBoardReleaseArchiveAssuranceDistributionMatrixInput & { generatedAt: string; workspaceId: string }) {
  const handoffNotarization = findNotarization(input.notarizationRegister.rows, "handoff-digest");
  const reviewerNotarization = findNotarization(input.notarizationRegister.rows, "reviewer-packets");

  return input.reviewerPackets.packets
    .map((packet) =>
      createRecipient({
        generatedAt: input.generatedAt,
        handoffNotarization,
        packet,
        reviewerNotarization,
        workspaceId: input.workspaceId,
      }),
    )
    .sort(
      (first, second) =>
        statusRank[first.status] - statusRank[second.status] ||
        audienceRank[first.audience] - audienceRank[second.audience] ||
        first.title.localeCompare(second.title),
    );
}

function createCsv(recipients: BoardReleaseArchiveAssuranceDistributionRecipient[]) {
  const header = [
    "distribution_id",
    "audience",
    "title",
    "status",
    "route",
    "recipient",
    "acknowledgement_required",
    "acknowledgement_deadline",
    "expiry_at",
    "packet_hash",
    "handoff_packet_hash",
    "coverage_hash",
    "next_action",
  ];
  const body = recipients.map((recipient) =>
    [
      recipient.id,
      recipient.audience,
      recipient.title,
      recipient.status,
      recipient.route,
      recipient.recipient,
      recipient.acknowledgementRequired,
      recipient.acknowledgementDeadline,
      recipient.expiryAt,
      recipient.packetHash,
      recipient.handoffPacketHash,
      recipient.coverageHash,
      recipient.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(recipients: BoardReleaseArchiveAssuranceDistributionRecipient[]): BoardReleaseArchiveAssuranceDistributionMatrixReport["summary"] {
  const blockedCount = recipients.filter((recipient) => recipient.status === "blocked").length;
  const watchCount = recipients.filter((recipient) => recipient.status === "watch").length;
  const coveredCount = recipients.filter((recipient) => recipient.status === "covered").length;
  const expiryCoveredCount = recipients.filter((recipient) => recipient.expiryCoverage.startsWith("covered")).length;
  const status = recipients.reduce<BoardReleaseArchiveAssuranceDistributionStatus>(
    (worst, recipient) => (statusRank[recipient.status] < statusRank[worst] ? recipient.status : worst),
    "covered",
  );
  const nextRecipient = recipients.find((recipient) => recipient.status !== "covered") ?? recipients[0] ?? null;

  return {
    blockedCount,
    coveredCount,
    distributionHash: sha256(recipients.map((recipient) => recipient.coverageHash)),
    expiryCoveredCount,
    matrixScore: recipients.length > 0 ? Math.max(0, Math.round((coveredCount / recipients.length) * 100 - blockedCount * 18 - watchCount * 5)) : 100,
    nextAction: status === "covered" ? "Archive assurance distribution matrix is fully covered." : (nextRecipient?.nextAction ?? "Create archive assurance distribution matrix."),
    recipientCount: recipients.length,
    status,
    watchCount,
  };
}

function createJson(input: {
  generatedAt: string;
  recipients: BoardReleaseArchiveAssuranceDistributionRecipient[];
  summary: BoardReleaseArchiveAssuranceDistributionMatrixReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveAssuranceDistributionMatrix(
  input: CreateBoardReleaseArchiveAssuranceDistributionMatrixInput,
): BoardReleaseArchiveAssuranceDistributionMatrixReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.notarizationRegister.workspaceId;
  const recipients = createRecipients({
    ...input,
    generatedAt,
    workspaceId,
  });
  const summary = summarize(recipients);
  const csvContent = createCsv(recipients);
  const jsonContent = createJson({
    generatedAt,
    recipients,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-assurance-distribution-matrix-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    recipients,
    summary,
    workspaceId,
  };
}
