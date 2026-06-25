import { createHash } from "node:crypto";
import type { BoardReleaseArchiveStewardshipExecutivePacketReport } from "@/features/projects/board-release-archive-stewardship-executive-packet";

export type BoardReleaseArchiveGovernancePolicyCharterKind = "approval-policy" | "decision-rights" | "release-authority" | "risk-acceptance";

export type BoardReleaseArchiveGovernancePolicyCharterStatus = "blocked" | "ratified" | "watch";

export interface BoardReleaseArchiveGovernancePolicyCharterOverride {
  decisionRight: string;
  kind: BoardReleaseArchiveGovernancePolicyCharterKind;
  requiredApproval: string;
  score: number;
}

export interface BoardReleaseArchiveGovernancePolicyCharterRow {
  decisionRight: string;
  id: string;
  kind: BoardReleaseArchiveGovernancePolicyCharterKind;
  nextAction: string;
  policyHash: string;
  requiredApproval: string;
  score: number;
  status: BoardReleaseArchiveGovernancePolicyCharterStatus;
  stewardshipHash: string;
  title: string;
}

export interface BoardReleaseArchiveGovernancePolicyCharterReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveGovernancePolicyCharterRow[];
  summary: {
    blockedCount: number;
    charterHash: string;
    charterScore: number;
    nextAction: string;
    ratifiedCount: number;
    rowCount: number;
    status: BoardReleaseArchiveGovernancePolicyCharterStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveGovernancePolicyCharterInput {
  charterOverrides?: BoardReleaseArchiveGovernancePolicyCharterOverride[];
  generatedAt?: string;
  stewardshipPacket: BoardReleaseArchiveStewardshipExecutivePacketReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveGovernancePolicyCharterKind, number> = {
  "decision-rights": 0,
  "approval-policy": 1,
  "risk-acceptance": 2,
  "release-authority": 3,
};

const statusRank: Record<BoardReleaseArchiveGovernancePolicyCharterStatus, number> = {
  blocked: 0,
  watch: 1,
  ratified: 2,
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

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
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

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function defaultCharterRows(input: {
  stewardshipPacket: BoardReleaseArchiveStewardshipExecutivePacketReport;
}) {
  const packetStatus = input.stewardshipPacket.summary.status;
  const baseScore = input.stewardshipPacket.summary.stewardshipScore;
  const riskApproval =
    packetStatus === "blocked"
      ? "Board archive governance committee remediation vote"
      : packetStatus === "watch"
        ? "Board chair and risk owner acknowledgement"
        : "Board chair ratification";

  return [
    {
      decisionRight: "Archive governance board owns release archive decision rights.",
      kind: "decision-rights" as const,
      requiredApproval: "Board chair ratification",
      score: baseScore,
      title: "Decision rights charter",
    },
    {
      decisionRight: "Archive governance board approves stewardship packet outcomes before release archive changes.",
      kind: "approval-policy" as const,
      requiredApproval: packetStatus === "approved" ? "Board chair ratification" : "Board chair and governance secretary acknowledgement",
      score: packetStatus === "approved" ? baseScore : Math.max(0, baseScore - 8),
      title: "Approval policy charter",
    },
    {
      decisionRight: "Risk acceptance requires explicit board authorization for exception budget carry-forward.",
      kind: "risk-acceptance" as const,
      requiredApproval: riskApproval,
      score: packetStatus === "approved" ? baseScore : Math.max(0, baseScore - 12),
      title: "Risk acceptance charter",
    },
    {
      decisionRight: "Release authority follows the stewardship packet recommendation and board governance disposition.",
      kind: "release-authority" as const,
      requiredApproval: packetStatus === "approved" ? "Executive sponsor approval" : "Executive sponsor hold acknowledgement",
      score: packetStatus === "approved" ? baseScore : Math.max(0, baseScore - 10),
      title: "Release authority charter",
    },
  ];
}

function statusFor(input: {
  requiredApproval: string;
  score: number;
  stewardshipStatus: BoardReleaseArchiveStewardshipExecutivePacketReport["summary"]["status"];
}) {
  if (input.stewardshipStatus === "blocked" || input.score < 60 || input.requiredApproval.trim().length === 0) {
    return "blocked" satisfies BoardReleaseArchiveGovernancePolicyCharterStatus;
  }

  if (input.stewardshipStatus === "watch" || input.score < 85) {
    return "watch" satisfies BoardReleaseArchiveGovernancePolicyCharterStatus;
  }

  return "ratified" satisfies BoardReleaseArchiveGovernancePolicyCharterStatus;
}

function nextActionFor(input: {
  status: BoardReleaseArchiveGovernancePolicyCharterStatus;
  title: string;
}) {
  if (input.status === "blocked") {
    return `Repair blocked archive governance policy charter for ${input.title}.`;
  }

  if (input.status === "watch") {
    return `Review archive governance policy charter approval depth for ${input.title}.`;
  }

  return `Keep archive governance policy charter ratified for ${input.title}.`;
}

function createRows(input: CreateBoardReleaseArchiveGovernancePolicyCharterInput & { workspaceId: string }) {
  const overrides = new Map((input.charterOverrides ?? []).map((entry) => [entry.kind, entry]));

  return defaultCharterRows({
    stewardshipPacket: input.stewardshipPacket,
  })
    .map((entry) => {
      const override = overrides.get(entry.kind);
      const decisionRight = override?.decisionRight ?? entry.decisionRight;
      const requiredApproval = override?.requiredApproval ?? entry.requiredApproval;
      const score = clamp(override?.score ?? entry.score);
      const status = statusFor({
        requiredApproval,
        score,
        stewardshipStatus: input.stewardshipPacket.summary.status,
      });
      const policyHash = sha256({
        decisionRight,
        kind: entry.kind,
        requiredApproval,
        score,
        status,
        stewardshipHash: input.stewardshipPacket.summary.stewardshipPacketHash,
      });

      return {
        decisionRight,
        id: `archive-governance-policy-charter:${slug(input.workspaceId)}:${entry.kind}`,
        kind: entry.kind,
        nextAction: nextActionFor({
          status,
          title: entry.title,
        }),
        policyHash,
        requiredApproval,
        score,
        status,
        stewardshipHash: input.stewardshipPacket.summary.stewardshipPacketHash,
        title: entry.title,
      } satisfies BoardReleaseArchiveGovernancePolicyCharterRow;
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || kindRank[first.kind] - kindRank[second.kind] || first.title.localeCompare(second.title));
}

function createCsv(rows: BoardReleaseArchiveGovernancePolicyCharterRow[]) {
  const header = ["charter_id", "kind", "title", "status", "decision_right", "required_approval", "score", "policy_hash", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.kind, entry.title, entry.status, entry.decisionRight, entry.requiredApproval, entry.score, entry.policyHash, entry.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveGovernancePolicyCharterRow[]): BoardReleaseArchiveGovernancePolicyCharterReport["summary"] {
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const ratifiedCount = rows.filter((entry) => entry.status === "ratified").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const status: BoardReleaseArchiveGovernancePolicyCharterStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ratified";
  const nextRow = rows.find((entry) => entry.status === "blocked") ?? rows.find((entry) => entry.status === "watch") ?? rows[0] ?? null;

  return {
    blockedCount,
    charterHash: sha256(rows.map((entry) => entry.policyHash)),
    charterScore: rows.length > 0 ? Math.round(rows.reduce((total, entry) => total + entry.score, 0) / rows.length) : 100,
    nextAction: status === "ratified" ? "Archive governance policy charter is ratified." : (nextRow?.nextAction ?? "Review archive governance policy charter."),
    ratifiedCount,
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveGovernancePolicyCharterRow[];
  summary: BoardReleaseArchiveGovernancePolicyCharterReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveGovernancePolicyCharter(
  input: CreateBoardReleaseArchiveGovernancePolicyCharterInput,
): BoardReleaseArchiveGovernancePolicyCharterReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.stewardshipPacket.workspaceId;
  const rows = createRows({
    ...input,
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-governance-policy-charter-${dateStamp(generatedAt)}`;

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
