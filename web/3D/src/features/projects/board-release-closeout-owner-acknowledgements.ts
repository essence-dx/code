import { createHash } from "node:crypto";
import type {
  BoardReleaseCloseoutReadinessGate,
  BoardReleaseCloseoutReadinessGateKind,
  BoardReleaseCloseoutReadinessGateReport,
  BoardReleaseCloseoutReadinessGateStatus,
} from "@/features/projects/board-release-closeout-readiness-gates";
import type { WorkspaceMemberRow, WorkspaceRole } from "@/features/workspaces/types";

export type BoardReleaseCloseoutOwnerAcknowledgementStatus = "blocked" | "due" | "signed" | "waived";

export interface BoardReleaseCloseoutOwnerAcknowledgement {
  acknowledgementHash: string;
  acknowledgementId: string;
  dueAt: string;
  evidenceHash: string | null;
  gateId: string;
  gateKind: BoardReleaseCloseoutReadinessGateKind;
  gateStatus: BoardReleaseCloseoutReadinessGateStatus;
  nextAction: string;
  requiredRole: WorkspaceRole;
  roleCovered: boolean;
  signedAt: string | null;
  signerEmail: string | null;
  signerName: string | null;
  signerUserId: string | null;
  status: BoardReleaseCloseoutOwnerAcknowledgementStatus;
  workspaceId: string;
}

export interface BoardReleaseCloseoutOwnerAcknowledgementReport {
  acknowledgements: BoardReleaseCloseoutOwnerAcknowledgement[];
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
    dueCount: number;
    missingRoleCount: number;
    nextAction: string;
    roleCoverageCount: number;
    signedCount: number;
    status: BoardReleaseCloseoutReadinessGateStatus;
    waivedCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseCloseoutOwnerAcknowledgementReportInput {
  generatedAt?: string;
  members: WorkspaceMemberRow[];
  readinessGates: BoardReleaseCloseoutReadinessGateReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseCloseoutOwnerAcknowledgementStatus, number> = {
  blocked: 0,
  due: 1,
  waived: 2,
  signed: 3,
};

const gateRoleMap: Record<BoardReleaseCloseoutReadinessGateKind, WorkspaceRole> = {
  "distribution-readiness": "admin",
  "evidence-archive": "admin",
  "observability-digest": "owner",
  "signed-export-packets": "owner",
};

const dueWindowHours: Record<BoardReleaseCloseoutOwnerAcknowledgementStatus, number> = {
  blocked: 24,
  due: 72,
  signed: 0,
  waived: 0,
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

function addHours(value: string, hours: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  date.setUTCHours(date.getUTCHours() + hours);

  return date.toISOString();
}

function csvCell(value: boolean | string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function acknowledgementStatus(gate: BoardReleaseCloseoutReadinessGate): BoardReleaseCloseoutOwnerAcknowledgementStatus {
  if (gate.status === "blocked") {
    return "blocked";
  }

  return gate.status === "watch" ? "due" : "signed";
}

function findSigner(members: WorkspaceMemberRow[], requiredRole: WorkspaceRole) {
  return (
    members.find((member) => member.role === requiredRole) ??
    members.find((member) => member.role === "owner") ??
    members.find((member) => member.role === "admin") ??
    members[0] ??
    null
  );
}

function createAcknowledgement(input: {
  gate: BoardReleaseCloseoutReadinessGate;
  generatedAt: string;
  members: WorkspaceMemberRow[];
  workspaceId: string;
}): BoardReleaseCloseoutOwnerAcknowledgement {
  const requiredRole = gateRoleMap[input.gate.gateKind];
  const signer = findSigner(input.members, requiredRole);
  const roleCovered = input.members.some((member) => member.role === requiredRole);
  const status = roleCovered ? acknowledgementStatus(input.gate) : "blocked";
  const dueAt = addHours(input.generatedAt, dueWindowHours[status]);
  const acknowledgementId = `board-release-closeout-owner-ack:${slug(input.workspaceId)}:${input.gate.gateKind}`;
  const acknowledgementHash = sha256({
    acknowledgementId,
    dueAt,
    evidenceHash: input.gate.evidenceHash,
    gateHash: input.gate.gateHash,
    requiredRole,
    roleCovered,
    signerUserId: signer?.userId ?? null,
    status,
    workspaceId: input.workspaceId,
  });

  return {
    acknowledgementHash,
    acknowledgementId,
    dueAt,
    evidenceHash: input.gate.evidenceHash,
    gateId: input.gate.gateId,
    gateKind: input.gate.gateKind,
    gateStatus: input.gate.status,
    nextAction: roleCovered ? input.gate.nextAction : `Assign a ${requiredRole} before this closeout acknowledgement can be completed.`,
    requiredRole,
    roleCovered,
    signedAt: status === "signed" ? input.generatedAt : null,
    signerEmail: signer?.email ?? null,
    signerName: signer?.name ?? null,
    signerUserId: signer?.userId ?? null,
    status,
    workspaceId: input.workspaceId,
  };
}

function createAcknowledgements(input: {
  generatedAt: string;
  members: WorkspaceMemberRow[];
  readinessGates: BoardReleaseCloseoutReadinessGateReport;
  workspaceId: string;
}) {
  return input.readinessGates.gates
    .map((gate) =>
      createAcknowledgement({
        gate,
        generatedAt: input.generatedAt,
        members: input.members,
        workspaceId: input.workspaceId,
      }),
    )
    .sort(
      (first, second) =>
        statusRank[first.status] - statusRank[second.status] ||
        first.requiredRole.localeCompare(second.requiredRole) ||
        first.gateKind.localeCompare(second.gateKind),
    );
}

function summarize(
  acknowledgements: BoardReleaseCloseoutOwnerAcknowledgement[],
): BoardReleaseCloseoutOwnerAcknowledgementReport["summary"] {
  const blockedCount = acknowledgements.filter((acknowledgement) => acknowledgement.status === "blocked").length;
  const dueCount = acknowledgements.filter((acknowledgement) => acknowledgement.status === "due").length;
  const missingRoleCount = acknowledgements.filter((acknowledgement) => !acknowledgement.roleCovered).length;
  const firstAttention = acknowledgements.find((acknowledgement) => acknowledgement.status === "blocked" || acknowledgement.status === "due") ?? null;

  return {
    acknowledgementCount: acknowledgements.length,
    blockedCount,
    dueCount,
    missingRoleCount,
    nextAction:
      firstAttention?.nextAction ??
      "All required board release closeout owners have acknowledged their gates and evidence coverage.",
    roleCoverageCount: acknowledgements.filter((acknowledgement) => acknowledgement.roleCovered).length,
    signedCount: acknowledgements.filter((acknowledgement) => acknowledgement.status === "signed").length,
    status: blockedCount > 0 || missingRoleCount > 0 ? "blocked" : dueCount > 0 ? "watch" : "ready",
    waivedCount: acknowledgements.filter((acknowledgement) => acknowledgement.status === "waived").length,
  };
}

function createCsv(acknowledgements: BoardReleaseCloseoutOwnerAcknowledgement[]) {
  const header = [
    "acknowledgement_id",
    "gate_kind",
    "required_role",
    "status",
    "due_at",
    "signed_at",
    "signer_email",
    "role_covered",
    "evidence_hash",
    "acknowledgement_hash",
    "next_action",
  ];
  const body = acknowledgements.map((acknowledgement) =>
    [
      acknowledgement.acknowledgementId,
      acknowledgement.gateKind,
      acknowledgement.requiredRole,
      acknowledgement.status,
      acknowledgement.dueAt,
      acknowledgement.signedAt,
      acknowledgement.signerEmail,
      acknowledgement.roleCovered,
      acknowledgement.evidenceHash,
      acknowledgement.acknowledgementHash,
      acknowledgement.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  acknowledgements: BoardReleaseCloseoutOwnerAcknowledgement[];
  generatedAt: string;
  summary: BoardReleaseCloseoutOwnerAcknowledgementReport["summary"];
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

export function createBoardReleaseCloseoutOwnerAcknowledgementReport(
  input: CreateBoardReleaseCloseoutOwnerAcknowledgementReportInput,
): BoardReleaseCloseoutOwnerAcknowledgementReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.readinessGates.workspaceId;
  const acknowledgements = createAcknowledgements({
    generatedAt,
    members: input.members,
    readinessGates: input.readinessGates,
    workspaceId,
  });
  const summary = summarize(acknowledgements);
  const csvContent = createCsv(acknowledgements);
  const jsonContent = createJson({
    acknowledgements,
    generatedAt,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-closeout-owner-acknowledgements-${dateStamp(generatedAt)}`;

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
