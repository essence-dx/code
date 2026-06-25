import { createHash } from "node:crypto";

import type { NativeCadKernelDeliveryEnforcementVerifier } from "@/features/projects/native-cad-kernel-delivery-enforcement-verifier";
import type { NativeReleaseEnforcementLedger } from "@/features/projects/native-release-enforcement-ledger";
import type { ProductionInstallLaunchEvidencePacket } from "@/features/projects/production-install-launch-evidence-packet";

export type CustomerFacingReleaseAcceptanceGate =
  | "cad-runtime-enforcement"
  | "install-launch-evidence"
  | "signed-artifact-enforcement"
  | "support-routing";
export type CustomerFacingReleaseAcceptanceStatus =
  | "blocked"
  | "ready"
  | "review";
export type CustomerFacingReleaseAcceptanceFileFormat = "csv" | "json";

export interface CustomerFacingReleaseSupportRouteInput {
  customerMessage: string;
  evidenceHash: string;
  escalationSlaHours: number;
  owner: string;
  routeId: string;
  supportUrl: string;
}

export interface CustomerFacingReleaseAcceptanceRow {
  acceptanceHash: string;
  customerMessage: string;
  customerReady: boolean;
  evidenceHash: string;
  evidenceLinked: boolean;
  gate: CustomerFacingReleaseAcceptanceGate;
  nextAction: string;
  score: number;
  status: CustomerFacingReleaseAcceptanceStatus;
  supportRouteReady: boolean;
}

export interface CustomerFacingReleaseSupportRouteRow {
  customerMessage: string;
  evidenceHash: string;
  escalationSlaHours: number;
  owner: string;
  routeHash: string;
  routeId: string;
  status: CustomerFacingReleaseAcceptanceStatus;
  supportRouteReady: boolean;
  supportUrl: string;
}

export interface CustomerFacingReleaseAcceptanceFile {
  download: string;
  format: CustomerFacingReleaseAcceptanceFileFormat;
  href: string;
  label: string;
}

export interface CustomerFacingReleaseAcceptancePacket {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: CustomerFacingReleaseAcceptanceFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: CustomerFacingReleaseAcceptanceRow[];
  summary: {
    acceptanceHash: string;
    acceptanceScore: number;
    blockedCount: number;
    customerReleaseAccepted: boolean;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: CustomerFacingReleaseAcceptanceStatus;
    supportRouteReadyCount: number;
  };
  supportRoutes: CustomerFacingReleaseSupportRouteRow[];
  workspaceId: string;
}

export interface CreateCustomerFacingReleaseAcceptancePacketInput {
  cadRuntimeEnforcement: NativeCadKernelDeliveryEnforcementVerifier;
  generatedAt?: string;
  installLaunchEvidence: ProductionInstallLaunchEvidencePacket;
  releaseCandidateId: string;
  signedArtifactEnforcement: NativeReleaseEnforcementLedger;
  supportRoutes: CustomerFacingReleaseSupportRouteInput[];
  workspaceId?: string;
}

const gateRank: Record<CustomerFacingReleaseAcceptanceGate, number> = {
  "signed-artifact-enforcement": 0,
  "cad-runtime-enforcement": 1,
  "install-launch-evidence": 2,
  "support-routing": 3,
};

export function createCustomerFacingReleaseAcceptancePacket(
  input: CreateCustomerFacingReleaseAcceptancePacketInput,
): CustomerFacingReleaseAcceptancePacket {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? input.signedArtifactEnforcement.workspaceId;
  const supportRoutes = input.supportRoutes.map(createSupportRouteRow);
  const rows = createRows({ ...input, supportRoutes }).sort(
    (first, second) => gateRank[first.gate] - gateRank[second.gate],
  );
  const summary = summarize(rows, supportRoutes);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      rows,
      summary,
      supportRoutes,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-customer-facing-release-acceptance-packet-${slug(
    input.releaseCandidateId,
  )}-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    csvContent,
    csvDataUri,
    csvFileName,
    files: [
      {
        download: csvFileName,
        format: "csv",
        href: csvDataUri,
        label: "Customer-facing release acceptance packet CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Customer-facing release acceptance packet JSON",
      },
    ],
    generatedAt,
    jsonContent,
    jsonDataUri,
    jsonFileName,
    releaseCandidateId: input.releaseCandidateId,
    rows,
    summary,
    supportRoutes,
    workspaceId,
  };
}

function createRows(
  input: Omit<CreateCustomerFacingReleaseAcceptancePacketInput, "supportRoutes"> & {
    supportRoutes: CustomerFacingReleaseSupportRouteRow[];
  },
): CustomerFacingReleaseAcceptanceRow[] {
  const signedArtifactReady =
    input.signedArtifactEnforcement.summary.status === "ready" &&
    !input.signedArtifactEnforcement.summary.releaseBlocked;
  const cadRuntimeReady =
    input.cadRuntimeEnforcement.summary.status === "ready" &&
    !input.cadRuntimeEnforcement.summary.deliveryBlocked;
  const installLaunchReady =
    input.installLaunchEvidence.summary.status === "ready" &&
    !input.installLaunchEvidence.summary.installLaunchBlocked;
  const supportRouteReady =
    input.supportRoutes.length > 0 &&
    input.supportRoutes.every((route) => route.supportRouteReady);

  return [
    createRow({
      customerMessage:
        "Signed native package artifacts are certificate-backed, timestamped, and revocation-clear for release.",
      customerReady: signedArtifactReady,
      evidenceHash: input.signedArtifactEnforcement.summary.enforcementHash,
      gate: "signed-artifact-enforcement",
      score: input.signedArtifactEnforcement.summary.enforcementScore,
      supportRouteReady: true,
    }),
    createRow({
      customerMessage:
        "Native CAD conversion has bundled runtime proof, fixture execution, sandbox limits, and fallback coverage.",
      customerReady: cadRuntimeReady,
      evidenceHash: input.cadRuntimeEnforcement.summary.enforcementHash,
      gate: "cad-runtime-enforcement",
      score: input.cadRuntimeEnforcement.summary.enforcementScore,
      supportRouteReady: true,
    }),
    createRow({
      customerMessage:
        "Production installers have install transcripts, launch smoke, crash-free sessions, and rollback evidence.",
      customerReady: installLaunchReady,
      evidenceHash: input.installLaunchEvidence.summary.packetHash,
      gate: "install-launch-evidence",
      score: input.installLaunchEvidence.summary.installLaunchScore,
      supportRouteReady: true,
    }),
    createRow({
      customerMessage:
        "Customer support routes are available for release install issues, CAD fallback, and rollback escalation.",
      customerReady: supportRouteReady,
      evidenceHash: sha256(input.supportRoutes.map((route) => route.routeHash)),
      gate: "support-routing",
      score:
        input.supportRoutes.length > 0
          ? Math.round(
              (input.supportRoutes.filter((route) => route.supportRouteReady)
                .length /
                input.supportRoutes.length) *
                100,
            )
          : 0,
      supportRouteReady,
    }),
  ];
}

function createRow(input: {
  customerMessage: string;
  customerReady: boolean;
  evidenceHash: string;
  gate: CustomerFacingReleaseAcceptanceGate;
  score: number;
  supportRouteReady: boolean;
}): CustomerFacingReleaseAcceptanceRow {
  const score = normalizeScore(input.score);
  const evidenceHash = input.evidenceHash.trim() || "missing";
  const evidenceLinked = hasSha256(evidenceHash);
  const status = statusFor({
    customerReady: input.customerReady,
    evidenceLinked,
    score,
    supportRouteReady: input.supportRouteReady,
  });
  const rowWithoutHash = {
    customerMessage: input.customerMessage,
    customerReady: input.customerReady,
    evidenceHash,
    evidenceLinked,
    gate: input.gate,
    nextAction: "",
    score,
    status,
    supportRouteReady: input.supportRouteReady,
  } satisfies Omit<CustomerFacingReleaseAcceptanceRow, "acceptanceHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    acceptanceHash: sha256(row),
  };
}

function createSupportRouteRow(
  input: CustomerFacingReleaseSupportRouteInput,
): CustomerFacingReleaseSupportRouteRow {
  const customerMessage = input.customerMessage.trim();
  const evidenceHash = input.evidenceHash.trim() || "missing";
  const owner = input.owner.trim();
  const routeId = input.routeId.trim() || "unassigned-route";
  const supportUrl = input.supportUrl.trim();
  const escalationSlaHours = Math.max(0, Math.round(input.escalationSlaHours));
  const supportRouteReady =
    customerMessage.length >= 40 &&
    escalationSlaHours > 0 &&
    escalationSlaHours <= 24 &&
    hasSha256(evidenceHash) &&
    owner.length > 0 &&
    supportUrl.startsWith("https://");
  const status: CustomerFacingReleaseAcceptanceStatus = supportRouteReady
    ? "ready"
    : "blocked";
  const rowWithoutHash = {
    customerMessage,
    evidenceHash,
    escalationSlaHours,
    owner,
    routeId,
    status,
    supportRouteReady,
    supportUrl,
  };

  return {
    ...rowWithoutHash,
    routeHash: sha256(rowWithoutHash),
  };
}

function statusFor(input: {
  customerReady: boolean;
  evidenceLinked: boolean;
  score: number;
  supportRouteReady: boolean;
}): CustomerFacingReleaseAcceptanceStatus {
  if (
    !input.customerReady ||
    !input.evidenceLinked ||
    !input.supportRouteReady ||
    input.score < 60
  ) {
    return "blocked";
  }

  if (input.score < 90) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Omit<CustomerFacingReleaseAcceptanceRow, "acceptanceHash">,
) {
  if (row.status === "blocked") {
    return `Resolve blocked customer-facing release acceptance packet for ${row.gate}.`;
  }

  if (row.status === "review") {
    return `Review customer-facing release acceptance packet evidence for ${row.gate}.`;
  }

  return `Customer-facing release acceptance is ready for ${row.gate}.`;
}

function summarize(
  rows: CustomerFacingReleaseAcceptanceRow[],
  supportRoutes: CustomerFacingReleaseSupportRouteRow[],
): CustomerFacingReleaseAcceptancePacket["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const supportRouteReadyCount = supportRoutes.filter(
    (route) => route.supportRouteReady,
  ).length;
  const status: CustomerFacingReleaseAcceptanceStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const customerReleaseAccepted = status === "ready";
  const nextRow = rows.find((row) => row.status !== "ready");
  const baseScore =
    rows.reduce((total, row) => total + row.score, 0) / Math.max(1, rows.length);
  const linkedPenalty =
    rows.filter((row) => !row.evidenceLinked || !row.customerReady).length * 10;
  const supportPenalty =
    Math.max(0, supportRoutes.length - supportRouteReadyCount) * 8;
  const summaryWithoutHash = {
    acceptanceScore: normalizeScore(baseScore - linkedPenalty - supportPenalty),
    blockedCount,
    customerReleaseAccepted,
    nextAction:
      nextRow?.nextAction ??
      "Customer-facing release acceptance packet is ready for release.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
    supportRouteReadyCount,
  };

  return {
    ...summaryWithoutHash,
    acceptanceHash: sha256({
      rows: rows.map((row) => row.acceptanceHash),
      summary: summaryWithoutHash,
      supportRoutes: supportRoutes.map((route) => route.routeHash),
    }),
  };
}

function createCsv(rows: CustomerFacingReleaseAcceptanceRow[]) {
  const header = [
    "gate",
    "status",
    "score",
    "customer_ready",
    "evidence_linked",
    "support_route_ready",
    "acceptance_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.gate,
      row.status,
      row.score,
      row.customerReady,
      row.evidenceLinked,
      row.supportRouteReady,
      row.acceptanceHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return [header.join(","), ...body].join("\n");
}

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
  return `sha256:${createHash("sha256")
    .update(typeof value === "string" ? value : stableJson(value))
    .digest("hex")}`;
}

function csvCell(value: boolean | number | string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function encodeDataUri(mimeType: string, content: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
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

  return Number.isNaN(date.getTime())
    ? "current"
    : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function hasSha256(value: string) {
  return value.trim().startsWith("sha256:");
}

function normalizeScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
