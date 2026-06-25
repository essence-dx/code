import type { BoardEvidenceCloseoutReport, BoardEvidenceCloseoutStatus } from "@/features/projects/board-evidence-closeout-report";
import type { BoardEvidencePacketLockReport } from "@/features/projects/board-evidence-packet-lock";
import type { WorkspaceMemberRow } from "@/features/workspaces/types";

export type BoardEvidenceReleaseApprovalHandoffStatus = "blocked" | "ready" | "watch";
export type BoardEvidenceReleaseApprovalSignerRole = "accountable" | "packet-owner" | "release-admin";

export interface BoardEvidenceReleaseApprovalSigner {
  dependencyCount: number;
  dueAt: string;
  email: string | null;
  id: string;
  name: string;
  nextAction: string;
  role: BoardEvidenceReleaseApprovalSignerRole;
  status: BoardEvidenceReleaseApprovalHandoffStatus;
  userId: string | null;
}

export interface BoardEvidenceReleaseApprovalDependency {
  id: string;
  nextAction: string;
  ownerName: string | null;
  source: "closeout-report" | "packet-lock" | "packet-lock-row";
  status: BoardEvidenceReleaseApprovalHandoffStatus;
  title: string;
}

export interface BoardEvidenceReleaseApprovalHandoffReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  dependencies: BoardEvidenceReleaseApprovalDependency[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releasePromotionId: string | null;
  signers: BoardEvidenceReleaseApprovalSigner[];
  summary: {
    dependencyBlockerCount: number;
    dependencyCount: number;
    dueSoonCount: number;
    handoffScore: number;
    nextAction: string;
    signerCount: number;
    status: BoardEvidenceReleaseApprovalHandoffStatus;
  };
  workspaceId: string;
}

export interface CreateBoardEvidenceReleaseApprovalHandoffReportInput {
  closeout: BoardEvidenceCloseoutReport;
  generatedAt?: string;
  members: WorkspaceMemberRow[];
  packetLock: BoardEvidencePacketLockReport;
  releasePromotionId?: string | null;
  workspaceId?: string;
}

const statusRank: Record<BoardEvidenceReleaseApprovalHandoffStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

function statusFromCloseout(value: BoardEvidenceCloseoutStatus): BoardEvidenceReleaseApprovalHandoffStatus {
  return value === "blocked" ? "blocked" : value === "watch" ? "watch" : "ready";
}

function statusFromPacketLock(value: BoardEvidencePacketLockReport["summary"]["status"]): BoardEvidenceReleaseApprovalHandoffStatus {
  return value === "blocked" ? "blocked" : value === "partial" ? "watch" : "ready";
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

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function addDays(value: string, days: number) {
  const date = new Date(value);
  const time = Number.isNaN(date.getTime()) ? Date.now() : date.getTime();

  return new Date(time + days * 24 * 60 * 60 * 1000).toISOString();
}

function signerKey(input: Pick<BoardEvidenceReleaseApprovalSigner, "email" | "name" | "role" | "userId">) {
  return input.userId ?? input.email ?? `${input.role}:${input.name.toLowerCase()}`;
}

function memberSigner(input: {
  dependencies: BoardEvidenceReleaseApprovalDependency[];
  generatedAt: string;
  member: WorkspaceMemberRow;
  role: BoardEvidenceReleaseApprovalSignerRole;
}): BoardEvidenceReleaseApprovalSigner {
  const status = worstStatus(input.dependencies.map((dependency) => dependency.status));
  const blockingDependencies = input.dependencies.filter((dependency) => dependency.status !== "ready");

  return {
    dependencyCount: blockingDependencies.length,
    dueAt: addDays(input.generatedAt, status === "blocked" ? 2 : 5),
    email: input.member.email,
    id: `release-handoff:${input.role}:${input.member.userId}`,
    name: input.member.name,
    nextAction: blockingDependencies[0]?.nextAction ?? "Sign release approval handoff.",
    role: input.role,
    status,
    userId: input.member.userId,
  };
}

function fallbackPacketOwnerSigner(input: {
  dependencies: BoardEvidenceReleaseApprovalDependency[];
  generatedAt: string;
  ownerName: string;
}): BoardEvidenceReleaseApprovalSigner {
  const status = worstStatus(input.dependencies.map((dependency) => dependency.status));
  const blockingDependencies = input.dependencies.filter((dependency) => dependency.status !== "ready");

  return {
    dependencyCount: blockingDependencies.length,
    dueAt: addDays(input.generatedAt, status === "blocked" ? 2 : 5),
    email: null,
    id: `release-handoff:packet-owner:${slug(input.ownerName)}`,
    name: input.ownerName,
    nextAction: blockingDependencies[0]?.nextAction ?? "Confirm packet ownership before release approval.",
    role: "packet-owner",
    status,
    userId: null,
  };
}

function worstStatus(statuses: BoardEvidenceReleaseApprovalHandoffStatus[]) {
  return statuses.reduce<BoardEvidenceReleaseApprovalHandoffStatus>((worst, status) => (statusRank[status] < statusRank[worst] ? status : worst), "ready");
}

function dependencyForCloseout(closeout: BoardEvidenceCloseoutReport): BoardEvidenceReleaseApprovalDependency {
  return {
    id: "closeout-report",
    nextAction: closeout.summary.nextAction,
    ownerName: null,
    source: "closeout-report",
    status: statusFromCloseout(closeout.summary.status),
    title: "Closeout report",
  };
}

function dependenciesForPacketLock(packetLock: BoardEvidencePacketLockReport): BoardEvidenceReleaseApprovalDependency[] {
  const dependencies: BoardEvidenceReleaseApprovalDependency[] = [
    {
      id: "packet-lock",
      nextAction: packetLock.summary.nextAction,
      ownerName: packetLock.lockActor.name,
      source: "packet-lock",
      status: statusFromPacketLock(packetLock.summary.status),
      title: "Packet lock",
    },
  ];

  for (const row of packetLock.rows.filter((entry) => entry.lockState !== "locked")) {
    dependencies.push({
      id: `packet-lock-row:${row.taskId}`,
      nextAction: row.nextAction,
      ownerName: row.ownerName,
      source: "packet-lock-row",
      status: row.lockState === "blocked" ? "blocked" : "watch",
      title: row.title,
    });
  }

  return dependencies;
}

function createDependencies(input: {
  closeout: BoardEvidenceCloseoutReport;
  packetLock: BoardEvidencePacketLockReport;
}) {
  return [dependencyForCloseout(input.closeout), ...dependenciesForPacketLock(input.packetLock)].sort(
    (first, second) => statusRank[first.status] - statusRank[second.status] || first.source.localeCompare(second.source) || first.title.localeCompare(second.title),
  );
}

function createSigners(input: {
  dependencies: BoardEvidenceReleaseApprovalDependency[];
  generatedAt: string;
  members: WorkspaceMemberRow[];
  packetLock: BoardEvidencePacketLockReport;
}) {
  const signers: BoardEvidenceReleaseApprovalSigner[] = [];
  const owners = input.members.filter((member) => member.role === "owner");
  const admins = input.members.filter((member) => member.role === "admin");

  for (const member of owners) {
    signers.push(memberSigner({ dependencies: input.dependencies, generatedAt: input.generatedAt, member, role: "accountable" }));
  }

  for (const member of admins) {
    signers.push(memberSigner({ dependencies: input.dependencies, generatedAt: input.generatedAt, member, role: "release-admin" }));
  }

  const packetOwnerNames = Array.from(new Set(input.packetLock.rows.map((row) => row.ownerName).filter(Boolean)));
  for (const ownerName of packetOwnerNames) {
    const member = input.members.find((entry) => entry.name.toLowerCase() === ownerName.toLowerCase()) ?? null;
    const ownerDependencies = input.dependencies.filter((dependency) => dependency.ownerName?.toLowerCase() === ownerName.toLowerCase());

    signers.push(
      member
        ? memberSigner({
            dependencies: ownerDependencies.length > 0 ? ownerDependencies : input.dependencies,
            generatedAt: input.generatedAt,
            member,
            role: "packet-owner",
          })
        : fallbackPacketOwnerSigner({
            dependencies: ownerDependencies.length > 0 ? ownerDependencies : input.dependencies,
            generatedAt: input.generatedAt,
            ownerName,
          }),
    );
  }

  const seen = new Set<string>();

  return signers
    .filter((signer) => {
      const key = signerKey(signer);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || first.dueAt.localeCompare(second.dueAt) || first.role.localeCompare(second.role));
}

function summarize(input: {
  dependencies: BoardEvidenceReleaseApprovalDependency[];
  generatedAt: string;
  signers: BoardEvidenceReleaseApprovalSigner[];
}): BoardEvidenceReleaseApprovalHandoffReport["summary"] {
  const dependencyBlockerCount = input.dependencies.filter((dependency) => dependency.status !== "ready").length;
  const status = worstStatus(input.dependencies.map((dependency) => dependency.status));
  const dueSoonCutoff = addDays(input.generatedAt, 3);
  const dueSoonCount = input.signers.filter((signer) => signer.dueAt <= dueSoonCutoff).length;
  const firstBlocker = input.dependencies.find((dependency) => dependency.status !== "ready") ?? null;
  const penalty = dependencyBlockerCount * 20;

  return {
    dependencyBlockerCount,
    dependencyCount: input.dependencies.length,
    dueSoonCount,
    handoffScore: Math.max(0, 100 - penalty),
    nextAction: firstBlocker?.nextAction ?? "Release approval handoff is ready for signer circulation.",
    signerCount: input.signers.length,
    status,
  };
}

function createCsv(signers: BoardEvidenceReleaseApprovalSigner[]) {
  const header = ["signer_id", "role", "status", "name", "email", "due_at", "dependency_count", "next_action"];
  const body = signers.map((signer) =>
    [signer.id, signer.role, signer.status, signer.name, signer.email, signer.dueAt, signer.dependencyCount, signer.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  dependencies: BoardEvidenceReleaseApprovalDependency[];
  generatedAt: string;
  releasePromotionId: string | null;
  signers: BoardEvidenceReleaseApprovalSigner[];
  summary: BoardEvidenceReleaseApprovalHandoffReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      dependencies: input.dependencies,
      generatedAt: input.generatedAt,
      releasePromotionId: input.releasePromotionId,
      signers: input.signers,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardEvidenceReleaseApprovalHandoffReport(
  input: CreateBoardEvidenceReleaseApprovalHandoffReportInput,
): BoardEvidenceReleaseApprovalHandoffReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.closeout.workspaceId;
  const releasePromotionId = input.releasePromotionId ?? input.packetLock.releasePromotionId ?? null;
  const dependencies = createDependencies({
    closeout: input.closeout,
    packetLock: input.packetLock,
  });
  const signers = createSigners({
    dependencies,
    generatedAt,
    members: input.members,
    packetLock: input.packetLock,
  });
  const summary = summarize({
    dependencies,
    generatedAt,
    signers,
  });
  const csvContent = createCsv(signers);
  const jsonContent = createJson({
    dependencies,
    generatedAt,
    releasePromotionId,
    signers,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-evidence-release-approval-handoff-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    dependencies,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    releasePromotionId,
    signers,
    summary,
    workspaceId,
  };
}
