import type { DesignActivityEvent } from "@/features/editor/types";
import type { ActivityConflictReviewRow } from "@/features/editor/activity-conflict-review";

const simultaneousOperationWindowMs = 2 * 60 * 1000;
const maxOperationConflictRows = 8;
const minimumOperationConflictEvents = 2;

type OperationWindow = {
  events: DesignActivityEvent[];
  actorNames: string[];
  operationLabels: string[];
  operationFamilies: string[];
  score: number;
};

const operationFamilies = [
  {
    label: "Geometry",
    pattern: /align|bounds|distribut|frame|guide|layout|move|nudge|position|resize|rotate|scale|snap/i,
  },
  {
    label: "Style",
    pattern: /blend|blur|color|effect|fill|font|gradient|opacity|shadow|stroke|text style|typography/i,
  },
  {
    label: "Structure",
    pattern: /add|boolean|component|delete|detach|duplicate|group|import|instance|layer|mask|paste|remove|reorder|restore|ungroup/i,
  },
  {
    label: "Content",
    pattern: /assignment|comment|copy|mention|rename|reply|text|version/i,
  },
  {
    label: "Handoff",
    pattern: /code connect|dev mode|export|handoff|prototype|resource|share|snapshot/i,
  },
];

export function getOperationConflictRows(
  events: DesignActivityEvent[],
): ActivityConflictReviewRow[] {
  const groups = groupEventsByTarget(events.filter(isReviewableOperationEvent));
  const rows: ActivityConflictReviewRow[] = [];

  for (const [targetId, targetEvents] of groups) {
    const operationWindow = getBestOperationWindow(targetEvents);

    if (!operationWindow) {
      continue;
    }

    const latestEvents = [...operationWindow.events].sort(
      (first, second) =>
        getActivityTime(second.createdAt) - getActivityTime(first.createdAt),
    );
    const hasDestructiveAction = latestEvents.some(isDestructiveOperation);
    const status =
      hasDestructiveAction ||
      operationWindow.actorNames.length > 1 ||
      operationWindow.operationFamilies.length >= 3
        ? "blocked"
        : "review";

    rows.push({
      id: `operation-conflict-${targetId}`,
      status,
      kind: "operation",
      label:
        operationWindow.actorNames.length > 1
          ? "Simultaneous collaborator operations"
          : "Rapid operation sequence",
      detail: getOperationConflictDetail(operationWindow),
      eventCount: operationWindow.events.length,
      targetId,
      actorNames: operationWindow.actorNames,
      latestActivityAt: latestEvents[0]?.createdAt,
      operationLabels: operationWindow.operationLabels,
      eventIds: latestEvents.map((event) => event.id),
      resolutionHint: getOperationResolutionHint(
        operationWindow,
        hasDestructiveAction,
      ),
    });
  }

  return rows
    .sort((first, second) => {
      const statusScore =
        getStatusWeight(second.status) - getStatusWeight(first.status);

      if (statusScore !== 0) {
        return statusScore;
      }

      return (
        getActivityTime(second.latestActivityAt) -
        getActivityTime(first.latestActivityAt)
      );
    })
    .slice(0, maxOperationConflictRows);
}

function groupEventsByTarget(events: DesignActivityEvent[]) {
  const groups = new Map<string, DesignActivityEvent[]>();

  for (const event of events) {
    if (!event.targetId) {
      continue;
    }

    groups.set(event.targetId, [...(groups.get(event.targetId) ?? []), event]);
  }

  return groups;
}

function getBestOperationWindow(events: DesignActivityEvent[]) {
  const chronologicalEvents = [...events].sort(
    (first, second) =>
      getActivityTime(first.createdAt) - getActivityTime(second.createdAt),
  );
  let bestWindow: OperationWindow | null = null;

  for (let index = 0; index < chronologicalEvents.length; index += 1) {
    const startTime = getActivityTime(chronologicalEvents[index]?.createdAt);
    const windowEvents = chronologicalEvents.filter((event) => {
      const eventTime = getActivityTime(event.createdAt);

      return (
        eventTime >= startTime &&
        eventTime <= startTime + simultaneousOperationWindowMs
      );
    });

    if (windowEvents.length < minimumOperationConflictEvents) {
      continue;
    }

    const operationLabels = getOperationLabels(windowEvents);
    const actorNames = getActorNames(windowEvents);

    if (operationLabels.length < 2 && actorNames.length < 2) {
      continue;
    }

    const operationFamilies = getOperationFamilies(windowEvents);
    const score =
      windowEvents.length +
      operationLabels.length * 4 +
      actorNames.length * 3 +
      operationFamilies.length * 2 +
      (windowEvents.some(isDestructiveOperation) ? 6 : 0);
    const operationWindow = {
      events: windowEvents,
      actorNames,
      operationLabels,
      operationFamilies,
      score,
    };

    if (!bestWindow || operationWindow.score > bestWindow.score) {
      bestWindow = operationWindow;
    }
  }

  return bestWindow;
}

function getOperationConflictDetail(operationWindow: OperationWindow) {
  const families =
    operationWindow.operationFamilies.length > 0
      ? operationWindow.operationFamilies.join(", ")
      : "mixed";
  const operations = operationWindow.operationLabels.slice(0, 4).join(", ");

  return `${operationWindow.events.length} ${families.toLowerCase()} operation${operationWindow.events.length === 1 ? "" : "s"} touched the same target within ${formatMinutes(simultaneousOperationWindowMs)}: ${operations}.`;
}

function getOperationResolutionHint(
  operationWindow: OperationWindow,
  hasDestructiveAction: boolean,
) {
  if (hasDestructiveAction) {
    return "Review the final layer state against version history before exporting or branching.";
  }

  if (operationWindow.actorNames.length > 1) {
    return "Confirm the intended last-writer result with the listed collaborators before handoff.";
  }

  return "Check the operation order and keep the current activity row with the design handoff.";
}

function getOperationLabels(events: DesignActivityEvent[]) {
  return Array.from(new Set(events.map(getOperationLabel))).slice(0, 6);
}

function getOperationFamilies(events: DesignActivityEvent[]) {
  const text = events
    .map((event) => `${event.kind} ${event.label} ${event.detail ?? ""}`)
    .join(" ");

  return operationFamilies
    .filter((family) => family.pattern.test(text))
    .map((family) => family.label);
}

function getOperationLabel(event: DesignActivityEvent) {
  const text = event.label.trim() || event.kind;

  return text.length > 48 ? `${text.slice(0, 45)}...` : text;
}

function getActorNames(events: DesignActivityEvent[]) {
  return Array.from(
    new Set(events.map((event) => event.actorName.trim()).filter(Boolean)),
  );
}

function isReviewableOperationEvent(event: DesignActivityEvent) {
  return Boolean(event.targetId) && event.kind !== "export";
}

function isDestructiveOperation(event: DesignActivityEvent) {
  return /clear|delete|detach|import|remove|restore/i.test(
    `${event.kind} ${event.label} ${event.detail ?? ""}`,
  );
}

function getStatusWeight(status: ActivityConflictReviewRow["status"]) {
  if (status === "blocked") {
    return 2;
  }

  return status === "review" ? 1 : 0;
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
