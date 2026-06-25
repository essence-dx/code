import { createHash } from "node:crypto";
import type {
  BoardReleaseArchiveOversightExecutiveHealthKind,
  BoardReleaseArchiveOversightExecutiveHealthPacketReport,
} from "@/features/projects/board-release-archive-oversight-executive-health-packet";

export type BoardReleaseArchiveStewardshipOwnershipRotationStatus = "blocked" | "ready" | "watch";

export interface BoardReleaseArchiveStewardshipOwnershipRotationOverride {
  currentOwner: string;
  handoffEvidenceHash: string | null;
  kind: BoardReleaseArchiveOversightExecutiveHealthKind;
  nextOwner: string;
  rotationDueAt: string;
}

export interface BoardReleaseArchiveStewardshipOwnershipRotationPlannerRow {
  currentOwner: string;
  handoffEvidenceHash: string | null;
  handoffHash: string;
  id: string;
  kind: BoardReleaseArchiveOversightExecutiveHealthKind;
  nextAction: string;
  nextOwner: string;
  rotationDueAt: string;
  rotationScore: number;
  status: BoardReleaseArchiveStewardshipOwnershipRotationStatus;
  title: string;
}

export interface BoardReleaseArchiveStewardshipOwnershipRotationPlannerReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveStewardshipOwnershipRotationPlannerRow[];
  summary: {
    blockedCount: number;
    nextAction: string;
    readyCount: number;
    rotationPlannerHash: string;
    rotationScore: number;
    rowCount: number;
    status: BoardReleaseArchiveStewardshipOwnershipRotationStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveStewardshipOwnershipRotationPlannerInput {
  generatedAt?: string;
  healthPacket: BoardReleaseArchiveOversightExecutiveHealthPacketReport;
  rotationOverrides?: BoardReleaseArchiveStewardshipOwnershipRotationOverride[];
  workspaceId?: string;
}

const ownerByKind: Record<BoardReleaseArchiveOversightExecutiveHealthKind, { currentOwner: string; nextOwner: string; rotationDays: number }> = {
  "board-distribution": {
    currentOwner: "Board distribution owner",
    nextOwner: "Governance operations deputy",
    rotationDays: 30,
  },
  "evidence-quality": {
    currentOwner: "Evidence quality owner",
    nextOwner: "Audit evidence deputy",
    rotationDays: 21,
  },
  "exception-renewals": {
    currentOwner: "Renewal owner",
    nextOwner: "Quality owner",
    rotationDays: 14,
  },
  "incident-replay": {
    currentOwner: "Replay owner",
    nextOwner: "Replay deputy",
    rotationDays: 21,
  },
  "release-recommendation": {
    currentOwner: "Executive health owner",
    nextOwner: "Board secretary",
    rotationDays: 30,
  },
};

const kindRank: Record<BoardReleaseArchiveOversightExecutiveHealthKind, number> = {
  "exception-renewals": 0,
  "evidence-quality": 1,
  "board-distribution": 2,
  "incident-replay": 3,
  "release-recommendation": 4,
};

const statusRank: Record<BoardReleaseArchiveStewardshipOwnershipRotationStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
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

function csvCell(value: string | number | null) {
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

function addDays(value: string, days: number) {
  const date = new Date(value);
  const base = Number.isNaN(date.getTime()) ? Date.now() : date.getTime();

  return new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
}

function daysUntil(input: { dueAt: string; generatedAt: string }) {
  const dueAt = new Date(input.dueAt).getTime();
  const now = new Date(input.generatedAt).getTime();

  if (Number.isNaN(dueAt) || Number.isNaN(now)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.ceil((dueAt - now) / (24 * 60 * 60 * 1000));
}

function statusFor(input: {
  dueAt: string;
  generatedAt: string;
  handoffEvidenceHash: string | null;
  healthStatus: BoardReleaseArchiveOversightExecutiveHealthPacketReport["summary"]["status"];
}) {
  if (input.healthStatus === "blocked" || !input.handoffEvidenceHash?.startsWith("sha256:") || daysUntil({ dueAt: input.dueAt, generatedAt: input.generatedAt }) < 0) {
    return "blocked" satisfies BoardReleaseArchiveStewardshipOwnershipRotationStatus;
  }

  if (input.healthStatus === "watch" || daysUntil({ dueAt: input.dueAt, generatedAt: input.generatedAt }) <= 7) {
    return "watch" satisfies BoardReleaseArchiveStewardshipOwnershipRotationStatus;
  }

  return "ready" satisfies BoardReleaseArchiveStewardshipOwnershipRotationStatus;
}

function nextActionFor(input: {
  status: BoardReleaseArchiveStewardshipOwnershipRotationStatus;
  title: string;
}) {
  if (input.status === "blocked") {
    return `Complete blocked archive stewardship ownership rotation for ${input.title}.`;
  }

  if (input.status === "watch") {
    return `Prepare upcoming archive stewardship ownership rotation for ${input.title}.`;
  }

  return `Keep archive stewardship ownership rotation ready for ${input.title}.`;
}

function createRows(input: CreateBoardReleaseArchiveStewardshipOwnershipRotationPlannerInput & { generatedAt: string; workspaceId: string }) {
  const overrides = new Map((input.rotationOverrides ?? []).map((entry) => [entry.kind, entry]));

  return input.healthPacket.rows
    .map((entry) => {
      const defaults = ownerByKind[entry.kind];
      const override = overrides.get(entry.kind);
      const currentOwner = override?.currentOwner ?? defaults.currentOwner;
      const nextOwner = override?.nextOwner ?? defaults.nextOwner;
      const rotationDueAt = override?.rotationDueAt ?? addDays(input.generatedAt, defaults.rotationDays);
      const handoffEvidenceHash =
        override?.handoffEvidenceHash ??
        sha256({
          currentOwner,
          healthHash: entry.healthHash,
          kind: entry.kind,
          nextOwner,
        });
      const status = statusFor({
        dueAt: rotationDueAt,
        generatedAt: input.generatedAt,
        handoffEvidenceHash,
        healthStatus: input.healthPacket.summary.status,
      });
      const rotationScore = status === "ready" ? 100 : status === "watch" ? 78 : 42;
      const handoffHash = sha256({
        currentOwner,
        handoffEvidenceHash,
        healthHash: entry.healthHash,
        kind: entry.kind,
        nextOwner,
        rotationDueAt,
        status,
      });

      return {
        currentOwner,
        handoffEvidenceHash,
        handoffHash,
        id: `archive-stewardship-ownership-rotation:${slug(input.workspaceId)}:${entry.kind}`,
        kind: entry.kind,
        nextAction: nextActionFor({
          status,
          title: entry.title,
        }),
        nextOwner,
        rotationDueAt,
        rotationScore,
        status,
        title: entry.title,
      } satisfies BoardReleaseArchiveStewardshipOwnershipRotationPlannerRow;
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || kindRank[first.kind] - kindRank[second.kind] || first.title.localeCompare(second.title));
}

function createCsv(rows: BoardReleaseArchiveStewardshipOwnershipRotationPlannerRow[]) {
  const header = ["rotation_id", "kind", "title", "status", "current_owner", "next_owner", "rotation_due_at", "handoff_hash", "handoff_evidence_hash", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.kind, entry.title, entry.status, entry.currentOwner, entry.nextOwner, entry.rotationDueAt, entry.handoffHash, entry.handoffEvidenceHash, entry.nextAction]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveStewardshipOwnershipRotationPlannerRow[]): BoardReleaseArchiveStewardshipOwnershipRotationPlannerReport["summary"] {
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const readyCount = rows.filter((entry) => entry.status === "ready").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const status: BoardReleaseArchiveStewardshipOwnershipRotationStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";
  const nextRow = rows.find((entry) => entry.status === "blocked") ?? rows.find((entry) => entry.status === "watch") ?? rows[0] ?? null;

  return {
    blockedCount,
    nextAction:
      status === "ready"
        ? "Archive stewardship ownership rotation planner is ready."
        : (nextRow?.nextAction ?? "Review archive stewardship ownership rotation planner."),
    readyCount,
    rotationPlannerHash: sha256(rows.map((entry) => entry.handoffHash)),
    rotationScore: rows.length > 0 ? Math.round(rows.reduce((total, entry) => total + entry.rotationScore, 0) / rows.length) : 100,
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveStewardshipOwnershipRotationPlannerRow[];
  summary: BoardReleaseArchiveStewardshipOwnershipRotationPlannerReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveStewardshipOwnershipRotationPlanner(
  input: CreateBoardReleaseArchiveStewardshipOwnershipRotationPlannerInput,
): BoardReleaseArchiveStewardshipOwnershipRotationPlannerReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.healthPacket.workspaceId;
  const rows = createRows({
    ...input,
    generatedAt,
    workspaceId,
  });
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-stewardship-ownership-rotation-planner-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    rows,
    summary,
    workspaceId,
  };
}
