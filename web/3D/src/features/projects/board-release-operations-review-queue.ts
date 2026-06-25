import type {
  BoardReleaseOperationsHistoryRecord,
  BoardReleaseOperationsHistoryReport,
  BoardReleaseOperationsHistoryStatus,
} from "@/features/projects/board-release-operations-history";
import type { WorkspaceMemberRow } from "@/features/workspaces/types";

export type BoardReleaseOperationsReviewQueueStatus = "blocked" | "closed" | "in-review" | "ready";
export type BoardReleaseOperationsCloseoutTransition = "closed" | "in-review" | "needs-review" | "ready-to-close";

export interface BoardReleaseOperationsReviewQueueItem {
  closeoutTransition: BoardReleaseOperationsCloseoutTransition;
  dueAt: string;
  historyHash: string;
  historyId: string;
  nextAction: string;
  ownerEmail: string | null;
  ownerName: string;
  ownerUserId: string | null;
  queueId: string;
  releasePromotionId: string | null;
  status: BoardReleaseOperationsReviewQueueStatus;
  workspaceId: string;
}

export interface BoardReleaseOperationsReviewQueueReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  items: BoardReleaseOperationsReviewQueueItem[];
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  summary: {
    blockedCount: number;
    closedCount: number;
    inReviewCount: number;
    nextAction: string;
    queueCount: number;
    readyCount: number;
    status: BoardReleaseOperationsReviewQueueStatus;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseOperationsReviewQueueReportInput {
  generatedAt?: string;
  history: BoardReleaseOperationsHistoryReport;
  members: WorkspaceMemberRow[];
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseOperationsReviewQueueStatus, number> = {
  blocked: 0,
  "in-review": 1,
  ready: 2,
  closed: 3,
};

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

function queueStatus(status: BoardReleaseOperationsHistoryStatus): BoardReleaseOperationsReviewQueueStatus {
  if (status === "blocked") {
    return "blocked";
  }

  if (status === "watch") {
    return "in-review";
  }

  return status === "archived" ? "closed" : "ready";
}

function closeoutTransition(status: BoardReleaseOperationsHistoryStatus): BoardReleaseOperationsCloseoutTransition {
  if (status === "blocked") {
    return "needs-review";
  }

  if (status === "watch") {
    return "in-review";
  }

  return status === "archived" ? "closed" : "ready-to-close";
}

function dueAt(input: {
  generatedAt: string;
  status: BoardReleaseOperationsHistoryStatus;
}) {
  if (input.status === "blocked") {
    return addDays(input.generatedAt, 1);
  }

  if (input.status === "watch") {
    return addDays(input.generatedAt, 2);
  }

  return addDays(input.generatedAt, 5);
}

function assignableMembers(members: WorkspaceMemberRow[]) {
  const candidates = members.filter((member) => member.role === "owner" || member.role === "admin");

  return candidates.length > 0 ? candidates : members;
}

function fallbackOwner(): Pick<WorkspaceMemberRow, "email" | "name" | "userId"> {
  return {
    email: "",
    name: "Workspace owner",
    userId: "",
  };
}

function ownerFor(input: {
  index: number;
  members: WorkspaceMemberRow[];
}) {
  const candidates = assignableMembers(input.members);

  return candidates[input.index % candidates.length] ?? fallbackOwner();
}

function queueId(input: {
  historyId: string;
  releasePromotionId: string | null;
}) {
  return `board-release-operations-review:${slug(input.releasePromotionId ?? input.historyId)}`;
}

function nextAction(record: BoardReleaseOperationsHistoryRecord) {
  if (record.status === "blocked") {
    return "Resolve blocked board release operations before promotion.";
  }

  if (record.status === "watch") {
    return "Review watched board release operations before closeout.";
  }

  return record.status === "archived" ? "Confirm archived release operations remain closed." : "Approve release operations closeout.";
}

function createItems(input: {
  generatedAt: string;
  history: BoardReleaseOperationsHistoryReport;
  members: WorkspaceMemberRow[];
}) {
  return input.history.records
    .map<BoardReleaseOperationsReviewQueueItem>((record, index) => {
      const owner = ownerFor({
        index,
        members: input.members,
      });
      const status = queueStatus(record.status);

      return {
        closeoutTransition: closeoutTransition(record.status),
        dueAt: dueAt({
          generatedAt: input.generatedAt,
          status: record.status,
        }),
        historyHash: record.historyHash,
        historyId: record.historyId,
        nextAction: nextAction(record),
        ownerEmail: owner.email || null,
        ownerName: owner.name,
        ownerUserId: owner.userId || null,
        queueId: queueId({
          historyId: record.historyId,
          releasePromotionId: record.releasePromotionId,
        }),
        releasePromotionId: record.releasePromotionId,
        status,
        workspaceId: record.workspaceId,
      };
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || first.dueAt.localeCompare(second.dueAt));
}

function summarize(items: BoardReleaseOperationsReviewQueueItem[]): BoardReleaseOperationsReviewQueueReport["summary"] {
  const blockedCount = items.filter((item) => item.status === "blocked").length;
  const inReviewCount = items.filter((item) => item.status === "in-review").length;
  const readyCount = items.filter((item) => item.status === "ready").length;
  const closedCount = items.filter((item) => item.status === "closed").length;
  const firstAttention = items.find((item) => item.status === "blocked" || item.status === "in-review") ?? null;

  return {
    blockedCount,
    closedCount,
    inReviewCount,
    nextAction: firstAttention?.nextAction ?? "Board release operations review queue is clear.",
    queueCount: items.length,
    readyCount,
    status: items.reduce<BoardReleaseOperationsReviewQueueStatus>((worst, item) => (statusRank[item.status] < statusRank[worst] ? item.status : worst), "closed"),
  };
}

function createCsv(items: BoardReleaseOperationsReviewQueueItem[]) {
  const header = ["queue_id", "release_promotion_id", "status", "owner", "due_at", "closeout_transition", "history_hash", "next_action"];
  const body = items.map((item) =>
    [item.queueId, item.releasePromotionId, item.status, item.ownerName, item.dueAt, item.closeoutTransition, item.historyHash, item.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  items: BoardReleaseOperationsReviewQueueItem[];
  summary: BoardReleaseOperationsReviewQueueReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      items: input.items,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseOperationsReviewQueueReport(input: CreateBoardReleaseOperationsReviewQueueReportInput): BoardReleaseOperationsReviewQueueReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.history.workspaceId;
  const items = createItems({
    generatedAt,
    history: input.history,
    members: input.members,
  });
  const summary = summarize(items);
  const csvContent = createCsv(items);
  const jsonContent = createJson({
    generatedAt,
    items,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-operations-review-queue-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    items,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    summary,
    workspaceId,
  };
}
