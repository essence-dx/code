import type {
  DesignActivityEvent,
  DesignActivityKind,
} from "@/features/editor/types";

export type CommandActionReplayStatus = "ready" | "review" | "blocked";

export type CommandActionReplayCategory =
  | "artifact"
  | "coverage"
  | "release"
  | "scope"
  | "telemetry"
  | "undo";

export type CommandActionUndoPreview = {
  available: boolean;
  scope: "target" | "document" | "none";
  label: string;
  detail: string;
  targetId?: string;
};

export type CommandActionReplayArtifact = {
  id: string;
  schemaVersion: 1;
  eventId: string;
  operationKind: DesignActivityKind;
  operationLabel: string;
  operationDetail?: string;
  actorName: string;
  actorEmail?: string | null;
  targetId?: string;
  capturedAt: string;
  replayCommand: string;
  replaySafety: CommandActionReplayStatus;
  undoPreview: CommandActionUndoPreview;
  telemetry?: {
    area: string;
    command: string;
    durationMs: number;
    thresholdMs: number;
    status: string;
    itemCount?: number;
    detail?: string;
    capturedAt: string;
  };
};

export type CommandActionReplayRow = {
  id: string;
  status: CommandActionReplayStatus;
  category: CommandActionReplayCategory;
  label: string;
  detail: string;
  eventIds: string[];
  targetIds: string[];
  metric: number;
  recommendation: string;
};

export type CommandActionReplayReport = {
  status: CommandActionReplayStatus;
  score: number;
  eventCount: number;
  artifactCount: number;
  releaseSafeArtifactCount: number;
  replayableEventCount: number;
  telemetryEventCount: number;
  missingTelemetryCount: number;
  failedCommandCount: number;
  slowCommandCount: number;
  scopedUndoPreviewCount: number;
  unscopedUndoPreviewCount: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: CommandActionReplayRow[];
  artifacts: CommandActionReplayArtifact[];
};

const mutationKinds = new Set<DesignActivityKind>([
  "branch",
  "comment",
  "component",
  "extension",
  "import",
  "library",
  "page",
  "version",
]);

export function getCommandActionReplayReport(
  events: DesignActivityEvent[],
): CommandActionReplayReport {
  const artifacts = events.map(createReplayArtifact);
  const telemetryEvents = events.filter((event) => event.telemetry);
  const missingTelemetryEvents = events.filter((event) => !event.telemetry);
  const failedEvents = telemetryEvents.filter(
    (event) => event.telemetry?.status === "failed",
  );
  const slowEvents = telemetryEvents.filter((event) => isSlowTelemetry(event));
  const unscopedUndoArtifacts = artifacts.filter(
    (artifact) =>
      mutationKinds.has(artifact.operationKind) &&
      artifact.undoPreview.scope !== "target",
  );
  const scopedUndoPreviewCount = artifacts.filter(
    (artifact) => artifact.undoPreview.scope === "target",
  ).length;
  const releaseSafeArtifactCount = artifacts.filter(
    (artifact) => artifact.replaySafety === "ready",
  ).length;
  const rows = [
    ...getCoverageRows(events, artifacts),
    ...getTelemetryRows(missingTelemetryEvents, failedEvents, slowEvents),
    ...getUndoScopeRows(unscopedUndoArtifacts),
    ...getArtifactRows(artifacts, releaseSafeArtifactCount),
  ];
  const completedRows =
    rows.length > 0 ? rows : [getReadyRow(events.length, artifacts.length)];
  const blockedCount = completedRows.filter(
    (row) => row.status === "blocked",
  ).length;
  const reviewCount = completedRows.filter(
    (row) => row.status === "review",
  ).length;
  const readyCount = completedRows.filter(
    (row) => row.status === "ready",
  ).length;
  const score = clampScore(
    100 -
      blockedCount * 24 -
      reviewCount * 7 -
      missingTelemetryEvents.length * 2,
  );

  return {
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score,
    eventCount: events.length,
    artifactCount: artifacts.length,
    releaseSafeArtifactCount,
    replayableEventCount: artifacts.length,
    telemetryEventCount: telemetryEvents.length,
    missingTelemetryCount: missingTelemetryEvents.length,
    failedCommandCount: failedEvents.length,
    slowCommandCount: slowEvents.length,
    scopedUndoPreviewCount,
    unscopedUndoPreviewCount: unscopedUndoArtifacts.length,
    blockedCount,
    reviewCount,
    readyCount,
    rows: completedRows,
    artifacts,
  };
}

export function getCommandActionReplayCsv(
  report: CommandActionReplayReport,
) {
  return [
    [
      "captured_at",
      "event_id",
      "operation_kind",
      "operation_label",
      "actor_name",
      "target_id",
      "replay_command",
      "replay_safety",
      "undo_scope",
      "undo_available",
      "telemetry_area",
      "telemetry_command",
      "telemetry_duration_ms",
      "telemetry_status",
    ],
    ...report.artifacts.map((artifact) => [
      artifact.capturedAt,
      artifact.eventId,
      artifact.operationKind,
      artifact.operationLabel,
      artifact.actorName,
      artifact.targetId ?? "",
      artifact.replayCommand,
      artifact.replaySafety,
      artifact.undoPreview.scope,
      String(artifact.undoPreview.available),
      artifact.telemetry?.area ?? "",
      artifact.telemetry?.command ?? "",
      artifact.telemetry?.durationMs ?? "",
      artifact.telemetry?.status ?? "",
    ]),
  ]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
}

export function getCommandActionReplayMarkdown(
  report: CommandActionReplayReport,
) {
  return [
    "# Command Action Replay",
    "",
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Events: ${report.eventCount}`,
    `Replay artifacts: ${report.artifactCount}`,
    `Release-safe artifacts: ${report.releaseSafeArtifactCount}`,
    `Scoped undo previews: ${report.scopedUndoPreviewCount}`,
    `Missing telemetry: ${report.missingTelemetryCount}`,
    `Failed commands: ${report.failedCommandCount}`,
    "",
    "## Diagnostics",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Replay Artifacts",
    ...(report.artifacts.length > 0
      ? report.artifacts.slice(0, 40).map((artifact) => {
          const telemetry = artifact.telemetry
            ? `${artifact.telemetry.area}/${artifact.telemetry.command} ${artifact.telemetry.durationMs}ms`
            : "no telemetry";

          return `- ${artifact.replayCommand}: ${artifact.operationKind} "${artifact.operationLabel}" (${artifact.replaySafety}, ${artifact.undoPreview.scope} undo, ${telemetry})`;
        })
      : ["- No replay artifacts captured."]),
  ].join("\n");
}

export function getCommandActionReplayBundleJson(
  report: CommandActionReplayReport,
) {
  return JSON.stringify(
    {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      summary: {
        status: report.status,
        score: report.score,
        eventCount: report.eventCount,
        artifactCount: report.artifactCount,
        releaseSafeArtifactCount: report.releaseSafeArtifactCount,
        scopedUndoPreviewCount: report.scopedUndoPreviewCount,
        missingTelemetryCount: report.missingTelemetryCount,
        failedCommandCount: report.failedCommandCount,
      },
      diagnostics: report.rows,
      artifacts: report.artifacts,
    },
    null,
    2,
  );
}

function createReplayArtifact(
  event: DesignActivityEvent,
): CommandActionReplayArtifact {
  const undoPreview = getUndoPreview(event);
  const replaySafety = getReplaySafety(event, undoPreview);

  return {
    id: `replay-${event.id}`,
    schemaVersion: 1,
    eventId: event.id,
    operationKind: event.kind,
    operationLabel: event.label,
    operationDetail: event.detail,
    actorName: event.actorName,
    actorEmail: event.actorEmail,
    targetId: event.targetId,
    capturedAt: event.createdAt,
    replayCommand: getReplayCommand(event),
    replaySafety,
    undoPreview,
    telemetry: event.telemetry
      ? {
          area: event.telemetry.area,
          command: event.telemetry.command,
          durationMs: event.telemetry.durationMs,
          thresholdMs: event.telemetry.thresholdMs,
          status: event.telemetry.status,
          itemCount: event.telemetry.itemCount,
          detail: event.telemetry.detail,
          capturedAt: event.telemetry.capturedAt,
        }
      : undefined,
  };
}

function getCoverageRows(
  events: DesignActivityEvent[],
  artifacts: CommandActionReplayArtifact[],
) {
  if (events.length === 0) {
    return [
      {
        id: "command-action-replay-empty",
        status: "review",
        category: "coverage",
        label: "No command activity captured",
        detail:
          "The document has no activity events to convert into replay artifacts yet.",
        eventIds: [],
        targetIds: [],
        metric: 0,
        recommendation:
          "Run canvas, import, export, component, and collaboration commands before release signoff.",
      } satisfies CommandActionReplayRow,
    ];
  }

  if (artifacts.length === 0) {
    return [
      {
        id: "command-action-replay-artifacts-missing",
        status: "blocked",
        category: "artifact",
        label: "Replay artifacts missing",
        detail:
          "Activity exists, but no typed replay artifacts were produced for release review.",
        eventIds: events.map((event) => event.id),
        targetIds: [],
        metric: events.length,
        recommendation:
          "Keep every activity event convertible into a schema-versioned replay artifact.",
      } satisfies CommandActionReplayRow,
    ];
  }

  return [];
}

function getTelemetryRows(
  missingTelemetryEvents: DesignActivityEvent[],
  failedEvents: DesignActivityEvent[],
  slowEvents: DesignActivityEvent[],
) {
  const rows: CommandActionReplayRow[] = [];

  if (failedEvents.length > 0) {
    rows.push({
      id: "command-action-replay-failed",
      status: "blocked",
      category: "telemetry",
      label: "Failed replay source commands",
      detail: `${failedEvents.length} command${failedEvents.length === 1 ? "" : "s"} failed before artifact capture.`,
      eventIds: failedEvents.map((event) => event.id),
      targetIds: getTargetIds(failedEvents),
      metric: failedEvents.length,
      recommendation:
        "Fix failed commands before trusting replay bundles for release evidence.",
    });
  }

  if (slowEvents.length > 0) {
    const worstDuration = Math.max(
      ...slowEvents.map((event) => event.telemetry?.durationMs ?? 0),
    );

    rows.push({
      id: "command-action-replay-slow",
      status: slowEvents.some(isBlockedSlowTelemetry) ? "blocked" : "review",
      category: "telemetry",
      label: "Slow replay source commands",
      detail: `${slowEvents.length} command${slowEvents.length === 1 ? "" : "s"} exceeded the latency budget before replay artifact capture.`,
      eventIds: slowEvents.map((event) => event.id),
      targetIds: getTargetIds(slowEvents),
      metric: worstDuration,
      recommendation:
        "Review the slowest actions before promoting replay diagnostics into a release bundle.",
    });
  }

  if (missingTelemetryEvents.length > 0) {
    rows.push({
      id: "command-action-replay-telemetry-gaps",
      status: "review",
      category: "telemetry",
      label: "Replay telemetry gaps",
      detail: `${missingTelemetryEvents.length} activity event${missingTelemetryEvents.length === 1 ? "" : "s"} can replay, but lack command timing evidence.`,
      eventIds: missingTelemetryEvents.map((event) => event.id),
      targetIds: getTargetIds(missingTelemetryEvents),
      metric: missingTelemetryEvents.length,
      recommendation:
        "Attach command telemetry to more editor actions so replay bundles prove performance and success state.",
    });
  }

  return rows;
}

function getUndoScopeRows(artifacts: CommandActionReplayArtifact[]) {
  if (artifacts.length === 0) {
    return [];
  }

  return [
    {
      id: "command-action-replay-unscoped-undo",
      status: "review",
      category: "undo",
      label: "Unscoped undo previews",
      detail: `${artifacts.length} mutating artifact${artifacts.length === 1 ? "" : "s"} need target ids before a scoped undo preview is release-safe.`,
      eventIds: artifacts.map((artifact) => artifact.eventId),
      targetIds: [],
      metric: artifacts.length,
      recommendation:
        "Capture target ids on mutation events so replay review can preview exact undo scope.",
    } satisfies CommandActionReplayRow,
  ];
}

function getArtifactRows(
  artifacts: CommandActionReplayArtifact[],
  releaseSafeArtifactCount: number,
) {
  if (artifacts.length === 0) {
    return [];
  }

  return [
    {
      id: "command-action-replay-artifacts-ready",
      status: releaseSafeArtifactCount === artifacts.length ? "ready" : "review",
      category: "artifact",
      label: "Typed replay artifacts generated",
      detail: `${artifacts.length} schema-versioned artifact${artifacts.length === 1 ? "" : "s"} generated, with ${releaseSafeArtifactCount} release-safe for replay handoff.`,
      eventIds: artifacts.map((artifact) => artifact.eventId),
      targetIds: artifacts.flatMap((artifact) =>
        artifact.targetId ? [artifact.targetId] : [],
      ),
      metric: artifacts.length,
      recommendation:
        "Export the JSON bundle when the activity stream needs release or support replay evidence.",
    } satisfies CommandActionReplayRow,
  ];
}

function getReadyRow(
  eventCount: number,
  artifactCount: number,
): CommandActionReplayRow {
  return {
    id: "command-action-replay-ready",
    status: "ready",
    category: "release",
    label: "Command action replay ready",
    detail: `${eventCount} events are covered by ${artifactCount} typed replay artifacts.`,
    eventIds: [],
    targetIds: [],
    metric: artifactCount,
    recommendation:
      "Keep replay bundle exports attached to release and support handoffs.",
  };
}

function getReplaySafety(
  event: DesignActivityEvent,
  undoPreview: CommandActionUndoPreview,
): CommandActionReplayStatus {
  if (event.telemetry?.status === "failed") {
    return "blocked";
  }

  if (isBlockedSlowTelemetry(event)) {
    return "blocked";
  }

  if (!event.telemetry || undoPreview.scope === "document") {
    return "review";
  }

  return "ready";
}

function getUndoPreview(event: DesignActivityEvent): CommandActionUndoPreview {
  if (event.kind === "export") {
    return {
      available: false,
      scope: "none",
      label: "Export-only action",
      detail: "Exports are replay evidence and do not mutate the document.",
    };
  }

  if (event.targetId) {
    return {
      available: true,
      scope: "target",
      label: "Scoped undo available",
      detail: `Undo preview can be scoped to ${event.kind} target ${event.targetId}.`,
      targetId: event.targetId,
    };
  }

  return {
    available: false,
    scope: "document",
    label: "Document-level fallback",
    detail:
      "This mutating action lacks a target id, so undo review cannot prove exact scope.",
  };
}

function getReplayCommand(event: DesignActivityEvent) {
  const normalizedLabel = event.label
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");

  return `replay:${event.kind}:${normalizedLabel || event.id}`;
}

function isSlowTelemetry(event: DesignActivityEvent) {
  const telemetry = event.telemetry;

  return Boolean(telemetry && telemetry.durationMs > telemetry.thresholdMs);
}

function isBlockedSlowTelemetry(event: DesignActivityEvent) {
  const telemetry = event.telemetry;

  return Boolean(
    telemetry && telemetry.durationMs > Math.max(telemetry.thresholdMs * 2, 250),
  );
}

function getTargetIds(events: DesignActivityEvent[]) {
  return Array.from(
    new Set(
      events.flatMap((event) => (event.targetId ? [event.targetId] : [])),
    ),
  );
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function escapeCsvCell(value: boolean | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
