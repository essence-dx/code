import type {
  DesignActivityEvent,
  DesignActivityKind,
} from "@/features/editor/types";
import { getOperationConflictRows } from "@/features/editor/activity-operation-conflicts";

export type ActivityConflictReviewStatus = "ready" | "review" | "blocked";

export type ActivityConflictReviewKind =
  | "burst"
  | "comment"
  | "destructive"
  | "export"
  | "import"
  | "operation"
  | "target"
  | "version";

export type ActivityConflictReviewRow = {
  id: string;
  status: ActivityConflictReviewStatus;
  kind: ActivityConflictReviewKind;
  label: string;
  detail: string;
  eventCount: number;
  targetId?: string;
  actorNames: string[];
  latestActivityAt?: string;
  operationLabels?: string[];
  eventIds?: string[];
  resolutionHint?: string;
};

export type ActivityConflictReviewReport = {
  score: number;
  eventCount: number;
  actorCount: number;
  operationConflictCount: number;
  targetConflictCount: number;
  burstCount: number;
  destructiveCount: number;
  staleExportCount: number;
  importAfterExportCount: number;
  versionAfterExportCount: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  latestActivityAt: string | null;
  rows: ActivityConflictReviewRow[];
};

const rapidTargetWindowMs = 5 * 60 * 1000;
const recentBurstWindowMs = 15 * 60 * 1000;
const recentBurstReviewCount = 10;
const recentBurstBlockedCount = 18;
const targetChangeReviewCount = 3;
const destructiveLabels = [
  "clear",
  "delete",
  "detach",
  "import",
  "remove",
  "restore",
];
const handoffKinds = new Set<DesignActivityKind>([
  "branch",
  "component",
  "comment",
  "import",
  "library",
  "page",
  "version",
]);

export function getActivityConflictReview(
  events: DesignActivityEvent[],
): ActivityConflictReviewReport {
  const sortedEvents = [...events].sort(
    (first, second) =>
      getActivityTime(second.createdAt) - getActivityTime(first.createdAt),
  );
  const rows: ActivityConflictReviewRow[] = [];
  const latestEvent = sortedEvents[0];
  const latestExport = sortedEvents.find((event) => event.kind === "export");
  const latestImport = sortedEvents.find((event) => event.kind === "import");
  const latestVersion = sortedEvents.find((event) => event.kind === "version");
  const latestExportTime = latestExport
    ? getActivityTime(latestExport.createdAt)
    : null;

  rows.push(...getOperationConflictRows(sortedEvents));
  rows.push(...getTargetConflictRows(sortedEvents));

  const burstEvents = getRecentWindowEvents(
    sortedEvents,
    recentBurstWindowMs,
    latestEvent?.createdAt,
  );

  if (burstEvents.length >= recentBurstReviewCount) {
    rows.push({
      id: "recent-activity-burst",
      status:
        burstEvents.length >= recentBurstBlockedCount ? "blocked" : "review",
      kind: "burst",
      label: "Activity burst needs review",
      detail: `${burstEvents.length} events happened within ${formatMinutes(recentBurstWindowMs)}.`,
      eventCount: burstEvents.length,
      actorNames: getActorNames(burstEvents),
      latestActivityAt: burstEvents[0]?.createdAt,
    });
  }

  const destructiveEvents = sortedEvents.filter(isDestructiveEvent);

  if (destructiveEvents.length > 0) {
    const recentDestructiveEvents = destructiveEvents.slice(0, 6);

    rows.push({
      id: "destructive-activity",
      status:
        recentDestructiveEvents.some((event) => event.kind === "import") ||
        recentDestructiveEvents.length >= 3
          ? "blocked"
          : "review",
      kind: "destructive",
      label: "Destructive activity recorded",
      detail: recentDestructiveEvents
        .map((event) => `${event.label}${event.detail ? ` (${event.detail})` : ""}`)
        .join("; "),
      eventCount: destructiveEvents.length,
      actorNames: getActorNames(destructiveEvents),
      latestActivityAt: destructiveEvents[0]?.createdAt,
    });
  }

  if (latestExport && latestExportTime !== null) {
    const changesAfterExport = sortedEvents.filter(
      (event) =>
        getActivityTime(event.createdAt) > latestExportTime &&
        isHandoffChangeEvent(event),
    );

    if (changesAfterExport.length > 0) {
      rows.push({
        id: "stale-export",
        status: "review",
        kind: "export",
        label: "Latest export is stale",
        detail: `${changesAfterExport.length} handoff event${changesAfterExport.length === 1 ? "" : "s"} happened after the latest export.`,
        eventCount: changesAfterExport.length,
        actorNames: getActorNames(changesAfterExport),
        latestActivityAt: changesAfterExport[0]?.createdAt,
      });
    }
  }

  if (
    latestImport &&
    latestExport &&
    getActivityTime(latestImport.createdAt) > getActivityTime(latestExport.createdAt)
  ) {
    rows.push({
      id: "import-after-export",
      status: "review",
      kind: "import",
      label: "Import happened after export",
      detail: "The latest export no longer reflects the current imported document state.",
      eventCount: 1,
      actorNames: [latestImport.actorName],
      latestActivityAt: latestImport.createdAt,
    });
  }

  if (
    latestVersion &&
    latestExport &&
    getActivityTime(latestVersion.createdAt) >
      getActivityTime(latestExport.createdAt)
  ) {
    rows.push({
      id: "version-after-export",
      status: "blocked",
      kind: "version",
      label: "Version action happened after export",
      detail: "Export again after version merge, restore, or snapshot work.",
      eventCount: 1,
      actorNames: [latestVersion.actorName],
      latestActivityAt: latestVersion.createdAt,
    });
  }

  rows.push(...getCommentRiskRows(sortedEvents));

  if (rows.length === 0) {
    rows.push({
      id: "activity-conflicts-ready",
      status: "ready",
      kind: "target",
      label: events.length > 0 ? "No conflict patterns" : "No activity yet",
      detail:
        events.length > 0
          ? "Recent activity has no stale export, destructive, burst, operation, or repeated-target review items."
          : "Activity conflict review will update after document work starts.",
      eventCount: events.length,
      actorNames: getActorNames(events),
      latestActivityAt: latestEvent?.createdAt,
    });
  }

  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const operationConflictCount = rows.filter((row) => row.kind === "operation")
    .length;
  const targetConflictCount = rows.filter((row) => row.kind === "target").length;
  const burstCount = rows.filter((row) => row.kind === "burst").length;
  const staleExportCount = rows.filter((row) => row.kind === "export").length;
  const importAfterExportCount = rows.filter((row) => row.kind === "import")
    .length;
  const versionAfterExportCount = rows.filter((row) => row.kind === "version")
    .length;

  return {
    score: Math.max(0, 100 - blockedCount * 20 - reviewCount * 7),
    eventCount: events.length,
    actorCount: getActorNames(events).length,
    operationConflictCount,
    targetConflictCount,
    burstCount,
    destructiveCount: destructiveEvents.length,
    staleExportCount,
    importAfterExportCount,
    versionAfterExportCount,
    blockedCount,
    reviewCount,
    readyCount,
    latestActivityAt: latestEvent?.createdAt ?? null,
    rows,
  };
}

export function getActivityConflictReviewCsv(
  report: ActivityConflictReviewReport,
  rows: ActivityConflictReviewRow[] = report.rows,
) {
  const header: Array<keyof ActivityConflictReviewRow> = [
    "id",
    "status",
    "kind",
    "label",
    "detail",
    "eventCount",
    "targetId",
    "actorNames",
    "latestActivityAt",
    "operationLabels",
    "eventIds",
    "resolutionHint",
  ];

  return [
    [
      "score",
      "events",
      "actors",
      "operation_conflicts",
      "target_conflicts",
      "bursts",
      "destructive_events",
      "stale_exports",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.eventCount,
      report.actorCount,
      report.operationConflictCount,
      report.targetConflictCount,
      report.burstCount,
      report.destructiveCount,
      report.staleExportCount,
      report.blockedCount,
      report.reviewCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    header.join(","),
    ...rows.map((row) =>
      header
        .map((key) =>
          escapeCsvCell(
            Array.isArray(row[key]) ? row[key].join("; ") : row[key],
          ),
        )
        .join(","),
    ),
  ].join("\n");
}

export function getActivityConflictReviewMarkdown(
  report: ActivityConflictReviewReport,
  rows: ActivityConflictReviewRow[] = report.rows,
) {
  return [
    "# Activity Conflict Review",
    "",
    `Score: ${report.score}`,
    `Events: ${report.eventCount}`,
    `Actors: ${report.actorCount}`,
    `Operation conflicts: ${report.operationConflictCount}`,
    `Target conflicts: ${report.targetConflictCount}`,
    `Activity bursts: ${report.burstCount}`,
    `Destructive events: ${report.destructiveCount}`,
    `Stale exports: ${report.staleExportCount}`,
    `Last activity: ${report.latestActivityAt ?? "No activity"}`,
    "",
    "## Review Queue",
    ...(rows.length > 0
      ? rows.map(
          (row) =>
            `- [${row.status}] ${row.label}: ${row.detail}${row.targetId ? ` (target ${row.targetId})` : ""}${row.resolutionHint ? ` Hint: ${row.resolutionHint}` : ""}`,
        )
      : ["- No activity conflict review rows."]),
  ].join("\n");
}

function getTargetConflictRows(events: DesignActivityEvent[]) {
  const rows: ActivityConflictReviewRow[] = [];
  const groups = new Map<string, DesignActivityEvent[]>();

  for (const event of events) {
    if (!event.targetId || event.kind === "export") {
      continue;
    }

    groups.set(event.targetId, [...(groups.get(event.targetId) ?? []), event]);
  }

  for (const [targetId, targetEvents] of groups) {
    const conflictWindow = getFirstDenseWindow(
      targetEvents,
      rapidTargetWindowMs,
      targetChangeReviewCount,
    );

    if (!conflictWindow) {
      continue;
    }

    const actors = getActorNames(conflictWindow);
    const hasDestructiveAction = conflictWindow.some(isDestructiveEvent);

    rows.push({
      id: `target-conflict-${targetId}`,
      status: actors.length > 1 || hasDestructiveAction ? "blocked" : "review",
      kind: "target",
      label: "Repeated target changes",
      detail: `${conflictWindow.length} activity events touched this target within ${formatMinutes(rapidTargetWindowMs)}.`,
      eventCount: conflictWindow.length,
      targetId,
      actorNames: actors,
      latestActivityAt: conflictWindow[0]?.createdAt,
    });
  }

  return rows.slice(0, 8);
}

function getCommentRiskRows(events: DesignActivityEvent[]) {
  const commentDeletes = events.filter(
    (event) =>
      event.kind === "comment" &&
      /delete|remove|clear/i.test(`${event.label} ${event.detail ?? ""}`),
  );

  if (commentDeletes.length === 0) {
    return [];
  }

  return [
    {
      id: "comment-history-risk",
      status: "review",
      kind: "comment",
      label: "Comment history changed",
      detail: `${commentDeletes.length} comment deletion or assignment-clearing event${commentDeletes.length === 1 ? "" : "s"} may affect review traceability.`,
      eventCount: commentDeletes.length,
      actorNames: getActorNames(commentDeletes),
      latestActivityAt: commentDeletes[0]?.createdAt,
    } satisfies ActivityConflictReviewRow,
  ];
}

function getFirstDenseWindow(
  events: DesignActivityEvent[],
  windowMs: number,
  minCount: number,
) {
  const chronologicalEvents = [...events].sort(
    (first, second) =>
      getActivityTime(first.createdAt) - getActivityTime(second.createdAt),
  );

  for (let index = 0; index < chronologicalEvents.length; index += 1) {
    const start = getActivityTime(chronologicalEvents[index]?.createdAt);
    const windowEvents = chronologicalEvents.filter((event) => {
      const time = getActivityTime(event.createdAt);

      return time >= start && time <= start + windowMs;
    });

    if (windowEvents.length >= minCount) {
      return windowEvents.sort(
        (first, second) =>
          getActivityTime(second.createdAt) - getActivityTime(first.createdAt),
      );
    }
  }

  return null;
}

function getRecentWindowEvents(
  events: DesignActivityEvent[],
  windowMs: number,
  latestCreatedAt?: string,
) {
  if (!latestCreatedAt) {
    return [];
  }

  const latestTime = getActivityTime(latestCreatedAt);

  return events.filter(
    (event) => latestTime - getActivityTime(event.createdAt) <= windowMs,
  );
}

function isDestructiveEvent(event: DesignActivityEvent) {
  const text = `${event.kind} ${event.label} ${event.detail ?? ""}`.toLowerCase();

  return destructiveLabels.some((label) => text.includes(label));
}

function isHandoffChangeEvent(event: DesignActivityEvent) {
  return handoffKinds.has(event.kind);
}

function getActorNames(events: DesignActivityEvent[]) {
  return Array.from(
    new Set(events.map((event) => event.actorName.trim()).filter(Boolean)),
  );
}

function getActivityTime(value?: string) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}

function formatMinutes(value: number) {
  return `${Math.round(value / 60000)} minutes`;
}

function escapeCsvCell(
  value: boolean | number | string | null | undefined,
) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}
