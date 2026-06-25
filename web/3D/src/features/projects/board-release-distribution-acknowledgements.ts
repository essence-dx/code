import { createHash } from "node:crypto";
import type {
  BoardReleaseDistributionRecipientManifestEntry,
  BoardReleaseDistributionRecipientManifestReport,
} from "@/features/projects/board-release-distribution-recipient-manifests";

export type BoardReleaseDistributionAcknowledgementStatus = "blocked" | "pending" | "signed" | "waived";

export interface BoardReleaseDistributionAcknowledgement {
  acknowledgementHash: string;
  acknowledgementId: string;
  dueAt: string | null;
  manifestHash: string;
  manifestId: string;
  nextAction: string;
  packetHash: string | null;
  recipientEmail: string | null;
  releasePromotionId: string | null;
  signedAt: string | null;
  signerName: string;
  status: BoardReleaseDistributionAcknowledgementStatus;
  workspaceId: string;
}

export interface BoardReleaseDistributionAcknowledgementReport {
  acknowledgements: BoardReleaseDistributionAcknowledgement[];
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  summary: {
    acknowledgementCount: number;
    blockedCount: number;
    nextAction: string;
    overdueCount: number;
    pendingCount: number;
    signedCount: number;
    status: BoardReleaseDistributionAcknowledgementStatus;
    waivedCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseDistributionAcknowledgementReportInput {
  generatedAt?: string;
  manifests: BoardReleaseDistributionRecipientManifestReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseDistributionAcknowledgementStatus, number> = {
  blocked: 0,
  pending: 1,
  signed: 2,
  waived: 3,
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
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
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

function addDays(value: string, days: number) {
  const date = new Date(value);
  const time = Number.isNaN(date.getTime()) ? Date.now() : date.getTime();

  return new Date(time + days * 24 * 60 * 60 * 1000).toISOString();
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function acknowledgementStatus(manifest: BoardReleaseDistributionRecipientManifestEntry): BoardReleaseDistributionAcknowledgementStatus {
  if (manifest.packetAccess === "missing-recipient" || manifest.packetAccess === "blocked" || manifest.status === "blocked") {
    return "blocked";
  }

  if (manifest.acknowledgementRequirement === "waived") {
    return "waived";
  }

  return manifest.acknowledgementRequirement === "required" ? "pending" : "blocked";
}

function dueAt(input: {
  generatedAt: string;
  manifest: BoardReleaseDistributionRecipientManifestEntry;
  status: BoardReleaseDistributionAcknowledgementStatus;
}) {
  if (input.status !== "pending") {
    return null;
  }

  return addDays(input.generatedAt, input.manifest.channel === "email" ? 2 : 3);
}

function acknowledgementId(input: {
  manifestId: string;
  releasePromotionId: string | null;
  workspaceId: string;
}) {
  return `board-release-distribution-ack:${slug(input.workspaceId)}:${slug(input.releasePromotionId ?? "unassigned-release")}:${slug(input.manifestId)}`;
}

function nextAction(input: {
  manifest: BoardReleaseDistributionRecipientManifestEntry;
  status: BoardReleaseDistributionAcknowledgementStatus;
}) {
  if (input.status === "blocked") {
    return input.manifest.nextAction;
  }

  if (input.status === "pending") {
    return "Capture recipient acknowledgement before distribution closeout.";
  }

  return input.status === "waived" ? "Acknowledgement is waived because no recipient route is available." : "Recipient acknowledgement is signed.";
}

function createAcknowledgements(input: CreateBoardReleaseDistributionAcknowledgementReportInput & { generatedAt: string; workspaceId: string }) {
  return input.manifests.manifests
    .map<BoardReleaseDistributionAcknowledgement>((manifest) => {
      const status = acknowledgementStatus(manifest);
      const due = dueAt({
        generatedAt: input.generatedAt,
        manifest,
        status,
      });
      const core = {
        dueAt: due,
        manifestHash: manifest.manifestHash,
        packetHash: manifest.packetHash,
        recipientEmail: manifest.recipientEmail,
        releasePromotionId: manifest.releasePromotionId,
        status,
        workspaceId: input.workspaceId,
      };

      return {
        acknowledgementHash: sha256(core),
        acknowledgementId: acknowledgementId({
          manifestId: manifest.manifestId,
          releasePromotionId: manifest.releasePromotionId,
          workspaceId: input.workspaceId,
        }),
        dueAt: due,
        manifestHash: manifest.manifestHash,
        manifestId: manifest.manifestId,
        nextAction: nextAction({
          manifest,
          status,
        }),
        packetHash: manifest.packetHash,
        recipientEmail: manifest.recipientEmail,
        releasePromotionId: manifest.releasePromotionId,
        signedAt: status === "signed" ? input.generatedAt : null,
        signerName: manifest.recipientName,
        status,
        workspaceId: input.workspaceId,
      };
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || first.signerName.localeCompare(second.signerName));
}

function isOverdue(input: {
  acknowledgement: BoardReleaseDistributionAcknowledgement;
  generatedAt: string;
}) {
  return Boolean(input.acknowledgement.dueAt && new Date(input.acknowledgement.dueAt).getTime() < new Date(input.generatedAt).getTime());
}

function summarize(input: {
  acknowledgements: BoardReleaseDistributionAcknowledgement[];
  generatedAt: string;
}): BoardReleaseDistributionAcknowledgementReport["summary"] {
  const blockedCount = input.acknowledgements.filter((acknowledgement) => acknowledgement.status === "blocked").length;
  const pendingCount = input.acknowledgements.filter((acknowledgement) => acknowledgement.status === "pending").length;
  const signedCount = input.acknowledgements.filter((acknowledgement) => acknowledgement.status === "signed").length;
  const waivedCount = input.acknowledgements.filter((acknowledgement) => acknowledgement.status === "waived").length;
  const overdueCount = input.acknowledgements.filter((acknowledgement) =>
    isOverdue({
      acknowledgement,
      generatedAt: input.generatedAt,
    }),
  ).length;
  const firstAttention = input.acknowledgements.find((acknowledgement) => acknowledgement.status === "blocked" || acknowledgement.status === "pending") ?? null;

  return {
    acknowledgementCount: input.acknowledgements.length,
    blockedCount,
    nextAction: firstAttention?.nextAction ?? "Distribution acknowledgements are captured or waived.",
    overdueCount,
    pendingCount,
    signedCount,
    status: input.acknowledgements.reduce<BoardReleaseDistributionAcknowledgementStatus>(
      (worst, acknowledgement) => (statusRank[acknowledgement.status] < statusRank[worst] ? acknowledgement.status : worst),
      "waived",
    ),
    waivedCount,
  };
}

function createCsv(acknowledgements: BoardReleaseDistributionAcknowledgement[]) {
  const header = [
    "acknowledgement_id",
    "release_promotion_id",
    "signer",
    "recipient_email",
    "status",
    "due_at",
    "signed_at",
    "packet_hash",
    "manifest_hash",
    "acknowledgement_hash",
    "next_action",
  ];
  const body = acknowledgements.map((acknowledgement) =>
    [
      acknowledgement.acknowledgementId,
      acknowledgement.releasePromotionId,
      acknowledgement.signerName,
      acknowledgement.recipientEmail,
      acknowledgement.status,
      acknowledgement.dueAt,
      acknowledgement.signedAt,
      acknowledgement.packetHash,
      acknowledgement.manifestHash,
      acknowledgement.acknowledgementHash,
      acknowledgement.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  acknowledgements: BoardReleaseDistributionAcknowledgement[];
  generatedAt: string;
  summary: BoardReleaseDistributionAcknowledgementReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      acknowledgements: input.acknowledgements,
      generatedAt: input.generatedAt,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseDistributionAcknowledgementReport(
  input: CreateBoardReleaseDistributionAcknowledgementReportInput,
): BoardReleaseDistributionAcknowledgementReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.manifests.workspaceId;
  const acknowledgements = createAcknowledgements({
    ...input,
    generatedAt,
    workspaceId,
  });
  const summary = summarize({
    acknowledgements,
    generatedAt,
  });
  const csvContent = createCsv(acknowledgements);
  const jsonContent = createJson({
    acknowledgements,
    generatedAt,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-distribution-acknowledgements-${dateStamp(generatedAt)}`;

  return {
    acknowledgements,
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    summary,
    workspaceId,
  };
}
