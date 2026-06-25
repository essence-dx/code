import type {
  DesignActivityEvent,
  DesignComment,
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";

export type PresentationPresenterControlsStatus =
  | "blocked"
  | "ready"
  | "review";

export type PresentationPresenterControlsRowCategory =
  | "slide-navigator"
  | "speaker-notes"
  | "timed-rehearsal"
  | "viewer-handoff";

export type PresentationPresenterControlKind =
  PresentationPresenterControlsRowCategory;

export type PresentationPresenterControl = {
  id: string;
  status: PresentationPresenterControlsStatus;
  kind: PresentationPresenterControlKind;
  label: string;
  detail: string;
  evidence: string;
  recommendation: string;
  metric: number;
};

export type PresentationSlideNavigatorItem = {
  id: string;
  status: PresentationPresenterControlsStatus;
  index: number;
  pageId: string;
  pageName: string;
  frameIds: string[];
  frameNames: string[];
  label: string;
  detail: string;
  evidence: string;
};

export type PresentationSpeakerNote = {
  id: string;
  status: PresentationPresenterControlsStatus;
  pageId: string;
  pageName: string;
  source: "comment" | "layer";
  sourceId: string;
  text: string;
  estimatedSeconds: number | null;
};

export type PresentationTimedRehearsalPacket = {
  id: string;
  status: PresentationPresenterControlsStatus;
  pageId: string | null;
  pageName: string;
  source: "activity" | "speaker-note";
  sourceId: string;
  durationSeconds: number;
  label: string;
  detail: string;
  evidence: string;
};

export type PresentationViewerHandoffExport = {
  id: string;
  status: PresentationPresenterControlsStatus;
  route: string;
  sourceId: string;
  label: string;
  detail: string;
  evidence: string;
};

export type PresentationPresenterControlsRow = {
  id: string;
  status: PresentationPresenterControlsStatus;
  category: PresentationPresenterControlsRowCategory;
  label: string;
  detail: string;
  evidence: string;
  recommendation: string;
  layerIds: string[];
  metric: number;
};

export type PresentationPresenterControlsReport = {
  generatedAt: string;
  status: PresentationPresenterControlsStatus;
  score: number;
  slideNavigatorCount: number;
  speakerNoteCount: number;
  timedRehearsalPacketCount: number;
  viewerHandoffExportCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  presenterControls: PresentationPresenterControl[];
  slideNavigator: PresentationSlideNavigatorItem[];
  speakerNotes: PresentationSpeakerNote[];
  timedRehearsalPackets: PresentationTimedRehearsalPacket[];
  viewerHandoffExports: PresentationViewerHandoffExport[];
  rows: PresentationPresenterControlsRow[];
};

const statusRank: Record<PresentationPresenterControlsStatus, number> = {
  blocked: 0,
  review: 1,
  ready: 2,
};

const noteSignalPattern = /\b(speaker|presenter|talk\s*track|notes?)\b/i;
const rehearsalSignalPattern = /\b(rehears|timed?|duration|seconds?|minutes?|mins?)\b/i;
const handoffSignalPattern =
  /\b(viewer\s+handoff|presentation\s+handoff|handoff\s+packet|exported\s+viewer|viewer\s+export)\b/i;

export function getPresentationPresenterControlsReport({
  document,
  generatedAt = new Date().toISOString(),
  shareToken,
}: {
  document: DesignDocument;
  generatedAt?: string;
  shareToken?: string;
}): PresentationPresenterControlsReport {
  const slideNavigator = getSlideNavigator(document.pages);
  const speakerNotes = getSpeakerNotes(document.pages);
  const timedRehearsalPackets = getTimedRehearsalPackets({
    activityEvents: document.activityEvents ?? [],
    speakerNotes,
  });
  const viewerHandoffExports = getViewerHandoffExports({
    activityEvents: document.activityEvents ?? [],
    shareToken,
    slideNavigator,
    speakerNotes,
    timedRehearsalPackets,
  });
  const presenterControls = getPresenterControls({
    slideNavigator,
    speakerNotes,
    timedRehearsalPackets,
    viewerHandoffExports,
  });
  const rows = presenterControls.map(getPresenterControlRow).sort(sortRows);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 16 - reviewCount * 5),
    slideNavigatorCount: slideNavigator.length,
    speakerNoteCount: speakerNotes.length,
    timedRehearsalPacketCount: timedRehearsalPackets.length,
    viewerHandoffExportCount: viewerHandoffExports.length,
    readyCount,
    reviewCount,
    blockedCount,
    presenterControls,
    slideNavigator,
    speakerNotes,
    timedRehearsalPackets,
    viewerHandoffExports,
    rows,
  };
}

export function getPresentationPresenterControlsJson(
  report: PresentationPresenterControlsReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getPresentationPresenterControlsCsv(
  report: PresentationPresenterControlsReport,
) {
  return [
    [
      "id",
      "status",
      "category",
      "label",
      "metric",
      "layer_ids",
      "evidence",
      "detail",
      "recommendation",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.status,
        row.category,
        row.label,
        row.metric,
        row.layerIds.join(" "),
        row.evidence,
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    "section,slideNavigator",
    ["pageId", "status", "index", "frameIds", "evidence"].join(","),
    ...report.slideNavigator.map((item) =>
      [
        item.pageId,
        item.status,
        item.index,
        item.frameIds.join(" "),
        item.evidence,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    "section,speakerNotes",
    ["pageId", "status", "source", "sourceId", "estimatedSeconds", "text"].join(
      ",",
    ),
    ...report.speakerNotes.map((note) =>
      [
        note.pageId,
        note.status,
        note.source,
        note.sourceId,
        note.estimatedSeconds ?? "",
        note.text,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    "section,timedRehearsalPackets",
    ["id", "status", "pageId", "durationSeconds", "evidence"].join(","),
    ...report.timedRehearsalPackets.map((packet) =>
      [
        packet.id,
        packet.status,
        packet.pageId ?? "",
        packet.durationSeconds,
        packet.evidence,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    "section,viewerHandoffExports",
    ["id", "status", "route", "sourceId", "evidence"].join(","),
    ...report.viewerHandoffExports.map((handoff) =>
      [
        handoff.id,
        handoff.status,
        handoff.route,
        handoff.sourceId,
        handoff.evidence,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getPresentationPresenterControlsMarkdown(
  report: PresentationPresenterControlsReport,
) {
  return [
    "# Presentation Presenter Controls",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Slide navigator: ${report.slideNavigatorCount}`,
    `Speaker notes: ${report.speakerNoteCount}`,
    `Timed rehearsal packets: ${report.timedRehearsalPacketCount}`,
    `Viewer handoff exports: ${report.viewerHandoffExportCount}`,
    "",
    "This packet covers slide navigator controls, speaker notes, timed rehearsal packets, and viewer handoff exports.",
    "",
    "## slide navigator",
    "",
    ...report.slideNavigator.map(
      (item) =>
        `- [${item.status}] ${item.label}: ${item.detail} Evidence: ${item.evidence}.`,
    ),
    "",
    "## speaker notes",
    "",
    ...(report.speakerNotes.length > 0
      ? report.speakerNotes.map(
          (note) =>
            `- [${note.status}] ${note.pageName} / ${note.source}: ${note.text}`,
        )
      : ["- No speaker notes detected."]),
    "",
    "## timed rehearsal packets",
    "",
    ...(report.timedRehearsalPackets.length > 0
      ? report.timedRehearsalPackets.map(
          (packet) =>
            `- [${packet.status}] ${packet.label}: ${packet.detail} Evidence: ${packet.evidence}.`,
        )
      : ["- No timed rehearsal packets detected."]),
    "",
    "## viewer handoff exports",
    "",
    ...(report.viewerHandoffExports.length > 0
      ? report.viewerHandoffExports.map(
          (handoff) =>
            `- [${handoff.status}] ${handoff.label} (${handoff.route}): ${handoff.detail} Evidence: ${handoff.evidence}.`,
        )
      : ["- No viewer handoff exports detected."]),
  ].join("\n");
}

function getSlideNavigator(
  pages: DesignPage[],
): PresentationSlideNavigatorItem[] {
  return pages
    .map((page, pageIndex) => ({
      page,
      pageIndex,
      frameLayers: getSlideFrameLayers(page),
    }))
    .filter(
      ({ page, frameLayers }) => isDeckPage(page) || frameLayers.length > 0,
    )
    .map(({ page, pageIndex, frameLayers }, itemIndex) => {
      const status =
        frameLayers.length > 0 || isDeckPage(page) ? "ready" : "review";

      return {
        id: `slide-navigator:${page.id}`,
        status,
        index: itemIndex + 1,
        pageId: page.id,
        pageName: page.name,
        frameIds: frameLayers.map((layer) => layer.id),
        frameNames: frameLayers.map((layer) => layer.name),
        label: `Slide ${itemIndex + 1}`,
        detail: `${page.name} is available in presenter navigation at document position ${pageIndex + 1}.`,
        evidence:
          frameLayers.map((layer) => layer.name).join(" | ") ||
          "Deck-like page name",
      } satisfies PresentationSlideNavigatorItem;
    });
}

function getSpeakerNotes(pages: DesignPage[]): PresentationSpeakerNote[] {
  return pages.flatMap((page) => [
    ...page.layers
      .filter(isSpeakerNoteLayer)
      .map((layer) =>
        getSpeakerNoteFromLayer({
          layer,
          page,
        }),
      ),
    ...(page.comments ?? [])
      .filter(isSpeakerNoteComment)
      .map((comment) =>
        getSpeakerNoteFromComment({
          comment,
          page,
        }),
      ),
  ]);
}

function getTimedRehearsalPackets({
  activityEvents,
  speakerNotes,
}: {
  activityEvents: DesignActivityEvent[];
  speakerNotes: PresentationSpeakerNote[];
}): PresentationTimedRehearsalPacket[] {
  const notePackets = speakerNotes
    .filter(
      (note): note is PresentationSpeakerNote & { estimatedSeconds: number } =>
        note.estimatedSeconds !== null,
    )
    .map((note) => ({
      id: `timed-rehearsal:speaker-note:${note.sourceId}`,
      status: "ready" as const,
      pageId: note.pageId,
      pageName: note.pageName,
      source: "speaker-note" as const,
      sourceId: note.sourceId,
      durationSeconds: note.estimatedSeconds,
      label: `${note.pageName} rehearsal`,
      detail: `${note.pageName} has a ${formatDuration(note.estimatedSeconds)} presenter timing target from speaker notes.`,
      evidence: note.text,
    }));
  const activityPackets = activityEvents
    .map((event) => ({
      event,
      text: `${event.label} ${event.detail ?? ""}`,
      durationSeconds: parseDurationSeconds(
        `${event.label} ${event.detail ?? ""}`,
      ),
    }))
    .filter(
      (
        item,
      ): item is {
        event: DesignActivityEvent;
        text: string;
        durationSeconds: number;
      } =>
        rehearsalSignalPattern.test(item.text) &&
        item.durationSeconds !== null,
    )
    .map(({ event, text, durationSeconds }) => ({
      id: `timed-rehearsal:activity:${event.id}`,
      status: "ready" as const,
      pageId: event.targetId ?? null,
      pageName: "Presentation",
      source: "activity" as const,
      sourceId: event.id,
      durationSeconds,
      label: event.label,
      detail: `Activity captured a ${formatDuration(durationSeconds)} timed rehearsal packet.`,
      evidence: text.trim(),
    }));

  return [...notePackets, ...activityPackets].sort(
    (first, second) => second.durationSeconds - first.durationSeconds,
  );
}

function getViewerHandoffExports({
  activityEvents,
  shareToken,
  slideNavigator,
  speakerNotes,
  timedRehearsalPackets,
}: {
  activityEvents: DesignActivityEvent[];
  shareToken: string | undefined;
  slideNavigator: PresentationSlideNavigatorItem[];
  speakerNotes: PresentationSpeakerNote[];
  timedRehearsalPackets: PresentationTimedRehearsalPacket[];
}): PresentationViewerHandoffExport[] {
  const route = `/share/${shareToken?.trim() || ":token"}/prototype`;

  return activityEvents
    .filter((event) =>
      handoffSignalPattern.test(`${event.label} ${event.detail ?? ""}`),
    )
    .map((event) => ({
      id: `viewer-handoff:${event.id}`,
      status:
        slideNavigator.length > 0 &&
        speakerNotes.length > 0 &&
        timedRehearsalPackets.length > 0
          ? "ready"
          : "review",
      route,
      sourceId: event.id,
      label: event.label,
      detail: `${slideNavigator.length} slide navigator item${slideNavigator.length === 1 ? "" : "s"}, ${speakerNotes.length} speaker note${speakerNotes.length === 1 ? "" : "s"}, and ${timedRehearsalPackets.length} timed rehearsal packet${timedRehearsalPackets.length === 1 ? "" : "s"} are attached to the viewer handoff.`,
      evidence: event.detail ?? event.label,
    }));
}

function getPresenterControls({
  slideNavigator,
  speakerNotes,
  timedRehearsalPackets,
  viewerHandoffExports,
}: {
  slideNavigator: PresentationSlideNavigatorItem[];
  speakerNotes: PresentationSpeakerNote[];
  timedRehearsalPackets: PresentationTimedRehearsalPacket[];
  viewerHandoffExports: PresentationViewerHandoffExport[];
}): PresentationPresenterControl[] {
  return [
    {
      id: "presenter-control:slide-navigator",
      status:
        slideNavigator.length >= 2
          ? "ready"
          : slideNavigator.length > 0
            ? "review"
            : "blocked",
      kind: "slide-navigator",
      label: "Slide navigator",
      detail: `${slideNavigator.length} slide navigator item${slideNavigator.length === 1 ? "" : "s"} are available for presenter mode.`,
      evidence:
        slideNavigator.map((item) => `${item.index}. ${item.pageName}`).join(" | ") ||
        "No deck slides detected",
      recommendation:
        "Keep deck pages ordered and frame-backed so presenters can jump without exposing editor UI.",
      metric: slideNavigator.length,
    },
    {
      id: "presenter-control:speaker-notes",
      status:
        speakerNotes.length >= Math.max(1, Math.min(2, slideNavigator.length))
          ? "ready"
          : speakerNotes.length > 0
            ? "review"
            : "blocked",
      kind: "speaker-notes",
      label: "Speaker notes",
      detail: `${speakerNotes.length} speaker note${speakerNotes.length === 1 ? "" : "s"} are attached to the presentation.`,
      evidence:
        speakerNotes
          .slice(0, 4)
          .map((note) => `${note.pageName}:${note.source}`)
          .join(" | ") || "No speaker notes detected",
      recommendation:
        "Add presenter-only notes to important slides before rehearsing or sharing viewer handoff.",
      metric: speakerNotes.length,
    },
    {
      id: "presenter-control:timed-rehearsal",
      status:
        timedRehearsalPackets.length >= Math.max(1, Math.min(2, slideNavigator.length))
          ? "ready"
          : timedRehearsalPackets.length > 0
            ? "review"
            : "blocked",
      kind: "timed-rehearsal",
      label: "Timed rehearsal packets",
      detail: `${timedRehearsalPackets.length} timed rehearsal packet${timedRehearsalPackets.length === 1 ? "" : "s"} are available.`,
      evidence:
        timedRehearsalPackets
          .slice(0, 4)
          .map((packet) => `${packet.label}:${formatDuration(packet.durationSeconds)}`)
          .join(" | ") || "No rehearsal timings detected",
      recommendation:
        "Capture timings from speaker notes or activity before final presenter handoff.",
      metric: timedRehearsalPackets.length,
    },
    {
      id: "presenter-control:viewer-handoff",
      status:
        viewerHandoffExports.length > 0
          ? viewerHandoffExports.every((handoff) => handoff.status === "ready")
            ? "ready"
            : "review"
          : "blocked",
      kind: "viewer-handoff",
      label: "Viewer handoff exports",
      detail: `${viewerHandoffExports.length} viewer handoff export${viewerHandoffExports.length === 1 ? "" : "s"} are captured.`,
      evidence:
        viewerHandoffExports
          .map((handoff) => `${handoff.label}:${handoff.route}`)
          .join(" | ") || "No viewer handoff export activity",
      recommendation:
        "Export a viewer-safe packet after notes and rehearsal timings are ready.",
      metric: viewerHandoffExports.length,
    },
  ];
}

function getPresenterControlRow(
  control: PresentationPresenterControl,
): PresentationPresenterControlsRow {
  return {
    id: control.id,
    status: control.status,
    category: control.kind,
    label: control.label,
    detail: control.detail,
    evidence: control.evidence,
    recommendation: control.recommendation,
    layerIds: [],
    metric: control.metric,
  };
}

function getSpeakerNoteFromLayer({
  layer,
  page,
}: {
  layer: DesignLayer;
  page: DesignPage;
}): PresentationSpeakerNote {
  const text = getLayerText(layer);

  return {
    id: `speaker-note:layer:${layer.id}`,
    status: text.length >= 20 ? "ready" : "review",
    pageId: page.id,
    pageName: page.name,
    source: "layer",
    sourceId: layer.id,
    text: cleanSpeakerNoteText(text),
    estimatedSeconds: parseDurationSeconds(text),
  };
}

function getSpeakerNoteFromComment({
  comment,
  page,
}: {
  comment: DesignComment;
  page: DesignPage;
}): PresentationSpeakerNote {
  return {
    id: `speaker-note:comment:${comment.id}`,
    status: comment.text.trim().length >= 20 ? "ready" : "review",
    pageId: page.id,
    pageName: page.name,
    source: "comment",
    sourceId: comment.id,
    text: cleanSpeakerNoteText(comment.text),
    estimatedSeconds: parseDurationSeconds(comment.text),
  };
}

function isSpeakerNoteLayer(layer: DesignLayer) {
  if (!layer.visible || (layer.type !== "text" && layer.type !== "sticky")) {
    return false;
  }

  return noteSignalPattern.test(`${layer.name} ${getLayerText(layer)}`);
}

function isSpeakerNoteComment(comment: DesignComment) {
  return noteSignalPattern.test(comment.text);
}

function getLayerText(layer: DesignLayer) {
  return typeof layer.text === "string" ? layer.text.trim() : "";
}

function getSlideFrameLayers(page: DesignPage) {
  return page.layers.filter(
    (layer) => layer.visible && layer.type === "frame" && isSlideFrame(layer),
  );
}

function isDeckPage(page: DesignPage) {
  return /\b(deck|presentation|slide|slides)\b/i.test(page.name);
}

function isSlideFrame(layer: DesignLayer) {
  if (layer.height <= 0) {
    return false;
  }

  const ratio = layer.width / layer.height;

  return Math.abs(ratio - 16 / 9) <= 0.08 || Math.abs(ratio - 4 / 3) <= 0.08;
}

function parseDurationSeconds(text: string): number | null {
  const secondsMatch = text.match(/\b(\d{1,4})\s*(?:seconds?|secs?|s)\b/i);

  if (secondsMatch) {
    return Number(secondsMatch[1]);
  }

  const minutesMatch = text.match(/\b(\d{1,3})(?:\.(\d))?\s*(?:minutes?|mins?|m)\b/i);

  if (minutesMatch) {
    const whole = Number(minutesMatch[1]);
    const decimal = minutesMatch[2] ? Number(`0.${minutesMatch[2]}`) : 0;

    return Math.round((whole + decimal) * 60);
  }

  return null;
}

function cleanSpeakerNoteText(text: string) {
  return text
    .trim()
    .replace(/^(speaker|presenter)\s+notes?\s*:\s*/i, "")
    .replace(/^talk\s*track\s*:\s*/i, "");
}

function formatDuration(seconds: number) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
}

function sortRows(
  first: PresentationPresenterControlsRow,
  second: PresentationPresenterControlsRow,
) {
  if (first.status !== second.status) {
    return statusRank[first.status] - statusRank[second.status];
  }

  if (first.category !== second.category) {
    return first.category.localeCompare(second.category);
  }

  return first.label.localeCompare(second.label);
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
