import type {
  CollaborationPeer,
  CollaborationPresenceEvent,
} from "@/features/editor/collaboration-presence";
import type { CanvasView } from "@/features/editor/types";

export type MultiplayerFollowSpotlightStatus =
  | "ready"
  | "review"
  | "blocked";

export type MultiplayerFollowSpotlightCategory =
  | "admin-export"
  | "handoff-timer"
  | "presenter-ownership"
  | "viewport-sync";

export type MultiplayerFollowSpotlightRow = {
  id: string;
  status: MultiplayerFollowSpotlightStatus;
  category: MultiplayerFollowSpotlightCategory;
  label: string;
  detail: string;
  value: string;
  peerId: string | null;
  peerName: string | null;
  recommendation: string;
};

export type MultiplayerFollowSpotlightReport = {
  generatedAt: string;
  status: MultiplayerFollowSpotlightStatus;
  score: number;
  activePeerCount: number;
  activePresenterCount: number;
  presenterStatus: "idle" | "owned" | "conflict";
  presenterConflictCount: number;
  ownerPeerId: string | null;
  ownerName: string | null;
  followedPeerId: string | null;
  followedPeerName: string | null;
  spotlightEventCount: number;
  followEventCount: number;
  handoffTimerSeconds: number | null;
  handoffTimerStatus: MultiplayerFollowSpotlightStatus;
  viewportSyncStatus: MultiplayerFollowSpotlightStatus;
  viewportPanDelta: number | null;
  viewportZoomDelta: number | null;
  adminExportEvidenceCount: number;
  adminExportEvidence: string[];
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: MultiplayerFollowSpotlightRow[];
};

type MultiplayerFollowSpotlightInput = {
  activePageId: string;
  currentView: CanvasView;
  followedPeerId: string | null;
  generatedAt?: string;
  now?: number;
  peers: CollaborationPeer[];
  presenceEvents: CollaborationPresenceEvent[];
  selfId: string;
  selfSpotlight: boolean;
};

type PresenterCandidate = {
  id: string;
  name: string;
  view?: CanvasView;
  activePageId: string;
  updatedAt: number;
  self: boolean;
};

const handoffReviewAfterSeconds = 30 * 60;
const handoffBlockedAfterSeconds = 60 * 60;
const viewportReviewPanDelta = 80;
const viewportBlockedPanDelta = 180;
const viewportReviewZoomDelta = 0.12;
const viewportBlockedZoomDelta = 0.28;

const adminExportEvidence = [
  "bun run admin:multiplayer-presence-smoke",
  "Export Admin > Multiplayer presence JSON.",
  "Export Admin > Multiplayer presence CSV.",
  "Export Admin > Multiplayer presence Markdown.",
];

export function getMultiplayerFollowSpotlightReport({
  activePageId,
  currentView,
  followedPeerId,
  generatedAt = new Date().toISOString(),
  now = Date.now(),
  peers,
  presenceEvents,
  selfId,
  selfSpotlight,
}: MultiplayerFollowSpotlightInput): MultiplayerFollowSpotlightReport {
  const activePresenters = getActivePresenters({
    activePageId,
    currentView,
    now,
    peers,
    selfId,
    selfSpotlight,
  });
  const owner = activePresenters.length === 1 ? activePresenters[0] : null;
  const spotlightEvents = presenceEvents.filter(
    (event) =>
      event.kind === "spotlight-on" || event.kind === "spotlight-off",
  );
  const followEvents = presenceEvents.filter(
    (event) => event.kind === "followed" || event.kind === "unfollowed",
  );
  const handoffTimerSeconds = getHandoffTimerSeconds({
    events: [...spotlightEvents, ...followEvents],
    now,
    owner,
    selfId,
  });
  const handoffTimerStatus = getHandoffTimerStatus(
    handoffTimerSeconds,
    activePresenters.length,
  );
  const viewportSync = getViewportSync({
    activePageId,
    currentView,
    followedPeerId,
    owner,
    peers,
  });
  const presenterStatus =
    activePresenters.length > 1 ? "conflict" : owner ? "owned" : "idle";
  const rows: MultiplayerFollowSpotlightRow[] = [
    getPresenterOwnershipRow({
      activePresenters,
      owner,
      presenterStatus,
      spotlightEventCount: spotlightEvents.length,
    }),
    getHandoffTimerRow({
      handoffTimerSeconds,
      handoffTimerStatus,
      owner,
    }),
    getViewportSyncRow({
      followedPeerId,
      owner,
      viewportSync,
    }),
    getAdminExportRow(),
  ];
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 24 - reviewCount * 8),
    activePeerCount: peers.length,
    activePresenterCount: activePresenters.length,
    presenterStatus,
    presenterConflictCount:
      activePresenters.length > 1 ? activePresenters.length : 0,
    ownerPeerId: owner?.id ?? null,
    ownerName: owner?.name ?? null,
    followedPeerId,
    followedPeerName: viewportSync.followedPeer?.name ?? null,
    spotlightEventCount: spotlightEvents.length,
    followEventCount: followEvents.length,
    handoffTimerSeconds,
    handoffTimerStatus,
    viewportSyncStatus: viewportSync.status,
    viewportPanDelta: viewportSync.panDelta,
    viewportZoomDelta: viewportSync.zoomDelta,
    adminExportEvidenceCount: adminExportEvidence.length,
    adminExportEvidence,
    blockedCount,
    reviewCount,
    readyCount,
    rows,
  };
}

export function getMultiplayerFollowSpotlightCsv(
  report: MultiplayerFollowSpotlightReport,
  rows: MultiplayerFollowSpotlightRow[] = report.rows,
) {
  const header: Array<keyof MultiplayerFollowSpotlightRow> = [
    "id",
    "status",
    "category",
    "label",
    "detail",
    "value",
    "peerId",
    "peerName",
    "recommendation",
  ];

  return [
    [
      "score",
      "status",
      "active_peers",
      "active_presenters",
      "presenter_status",
      "owner",
      "followed_peer",
      "spotlight_events",
      "follow_events",
      "handoff_timer_seconds",
      "handoff_timer_status",
      "viewport_sync_status",
      "viewport_pan_delta",
      "viewport_zoom_delta",
      "admin_export_evidence",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.status,
      report.activePeerCount,
      report.activePresenterCount,
      report.presenterStatus,
      report.ownerName ?? "",
      report.followedPeerName ?? "",
      report.spotlightEventCount,
      report.followEventCount,
      report.handoffTimerSeconds ?? "",
      report.handoffTimerStatus,
      report.viewportSyncStatus,
      report.viewportPanDelta ?? "",
      report.viewportZoomDelta ?? "",
      report.adminExportEvidenceCount,
      report.blockedCount,
      report.reviewCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    header.join(","),
    ...rows.map((row) =>
      header.map((key) => escapeCsvCell(row[key])).join(","),
    ),
  ].join("\n");
}

export function getMultiplayerFollowSpotlightMarkdown(
  report: MultiplayerFollowSpotlightReport,
  rows: MultiplayerFollowSpotlightRow[] = report.rows,
) {
  return [
    "# Multiplayer Follow Spotlight",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Active peers: ${report.activePeerCount}`,
    `Active presenters: ${report.activePresenterCount}`,
    `Presenter status: ${report.presenterStatus}`,
    `Owner: ${report.ownerName ?? "No active presenter"}`,
    `Followed peer: ${report.followedPeerName ?? "none"}`,
    `Spotlight events: ${report.spotlightEventCount}`,
    `Follow events: ${report.followEventCount}`,
    `Handoff timer: ${formatTimer(report.handoffTimerSeconds)} (${report.handoffTimerStatus})`,
    `Viewport sync: ${report.viewportSyncStatus}`,
    `Viewport pan delta: ${formatOptionalNumber(report.viewportPanDelta)}`,
    `Viewport zoom delta: ${formatOptionalNumber(report.viewportZoomDelta)}`,
    "",
    "## Review Rows",
    ...rows.map(
      (row) =>
        `- [${row.status}] ${row.category} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Admin Export Evidence",
    ...report.adminExportEvidence.map((item) => `- ${item}`),
  ].join("\n");
}

export function getMultiplayerFollowSpotlightJson(
  report: MultiplayerFollowSpotlightReport,
  rows: MultiplayerFollowSpotlightRow[] = report.rows,
) {
  return JSON.stringify(
    {
      generatedAt: report.generatedAt,
      summary: {
        score: report.score,
        status: report.status,
        activePeerCount: report.activePeerCount,
        activePresenterCount: report.activePresenterCount,
        presenterStatus: report.presenterStatus,
        presenterConflictCount: report.presenterConflictCount,
        ownerPeerId: report.ownerPeerId,
        ownerName: report.ownerName,
        followedPeerId: report.followedPeerId,
        followedPeerName: report.followedPeerName,
        spotlightEventCount: report.spotlightEventCount,
        followEventCount: report.followEventCount,
        handoffTimerSeconds: report.handoffTimerSeconds,
        handoffTimerStatus: report.handoffTimerStatus,
        viewportSyncStatus: report.viewportSyncStatus,
        viewportPanDelta: report.viewportPanDelta,
        viewportZoomDelta: report.viewportZoomDelta,
        adminExportEvidenceCount: report.adminExportEvidenceCount,
        blockedCount: report.blockedCount,
        reviewCount: report.reviewCount,
      },
      adminExportEvidence: report.adminExportEvidence,
      rows,
    },
    null,
    2,
  );
}

function getActivePresenters({
  activePageId,
  currentView,
  now,
  peers,
  selfId,
  selfSpotlight,
}: {
  activePageId: string;
  currentView: CanvasView;
  now: number;
  peers: CollaborationPeer[];
  selfId: string;
  selfSpotlight: boolean;
}): PresenterCandidate[] {
  const presenters = peers
    .filter((peer) => peer.spotlight)
    .map((peer) => ({
      id: peer.id,
      name: peer.name,
      view: peer.view,
      activePageId: peer.activePageId,
      updatedAt: peer.updatedAt,
      self: false,
    }));

  if (selfSpotlight) {
    presenters.unshift({
      id: selfId,
      name: "You",
      view: currentView,
      activePageId,
      updatedAt: now,
      self: true,
    });
  }

  return presenters;
}

function getHandoffTimerSeconds({
  events,
  now,
  owner,
  selfId,
}: {
  events: CollaborationPresenceEvent[];
  now: number;
  owner: PresenterCandidate | null | undefined;
  selfId: string;
}) {
  const sortedEvents = [...events].sort(
    (first, second) => second.createdAt - first.createdAt,
  );
  const ownerEvent = owner
    ? sortedEvents.find((event) =>
        owner.self
          ? event.peerId === selfId
          : event.peerId === owner.id || event.peerName === owner.name,
      )
    : sortedEvents[0];
  const timerStart = ownerEvent?.createdAt ?? owner?.updatedAt ?? null;

  return timerStart ? Math.max(0, Math.round((now - timerStart) / 1000)) : null;
}

function getHandoffTimerStatus(
  handoffTimerSeconds: number | null,
  activePresenterCount: number,
): MultiplayerFollowSpotlightStatus {
  if (activePresenterCount > 1) {
    return "blocked";
  }

  if (handoffTimerSeconds === null) {
    return "review";
  }

  if (handoffTimerSeconds >= handoffBlockedAfterSeconds) {
    return "blocked";
  }

  if (handoffTimerSeconds >= handoffReviewAfterSeconds) {
    return "review";
  }

  return "ready";
}

function getViewportSync({
  activePageId,
  currentView,
  followedPeerId,
  owner,
  peers,
}: {
  activePageId: string;
  currentView: CanvasView;
  followedPeerId: string | null;
  owner: PresenterCandidate | null | undefined;
  peers: CollaborationPeer[];
}) {
  if (!followedPeerId) {
    return {
      followedPeer: null,
      panDelta: null,
      zoomDelta: null,
      status: owner ? "review" : "ready",
      detail: owner
        ? "A presenter is active, but no collaborator is being followed."
        : "No live presenter requires viewport sync right now.",
    } satisfies ViewportSyncResult;
  }

  const followedPeer = peers.find((peer) => peer.id === followedPeerId);

  if (!followedPeer) {
    return {
      followedPeer: null,
      panDelta: null,
      zoomDelta: null,
      status: "blocked",
      detail: "The followed collaborator is no longer present.",
    } satisfies ViewportSyncResult;
  }

  if (!followedPeer.view) {
    return {
      followedPeer,
      panDelta: null,
      zoomDelta: null,
      status: "review",
      detail: `${followedPeer.name} is followed, but their viewport has not been published.`,
    } satisfies ViewportSyncResult;
  }

  if (followedPeer.activePageId !== activePageId) {
    return {
      followedPeer,
      panDelta: null,
      zoomDelta: null,
      status: "review",
      detail: `${followedPeer.name} is on another page, so the viewport sync is paused.`,
    } satisfies ViewportSyncResult;
  }

  const panDelta = Math.round(
    Math.hypot(currentView.x - followedPeer.view.x, currentView.y - followedPeer.view.y),
  );
  const zoomDelta = roundToHundredth(
    Math.abs(currentView.zoom - followedPeer.view.zoom),
  );
  const status =
    panDelta >= viewportBlockedPanDelta || zoomDelta >= viewportBlockedZoomDelta
      ? "blocked"
      : panDelta >= viewportReviewPanDelta ||
          zoomDelta >= viewportReviewZoomDelta
        ? "review"
        : "ready";

  return {
    followedPeer,
    panDelta,
    zoomDelta,
    status,
    detail:
      status === "ready"
        ? `${followedPeer.name}'s viewport is in sync.`
        : `${followedPeer.name}'s viewport differs by ${panDelta}px pan and ${zoomDelta} zoom.`,
  } satisfies ViewportSyncResult;
}

type ViewportSyncResult = {
  followedPeer: CollaborationPeer | null;
  panDelta: number | null;
  zoomDelta: number | null;
  status: MultiplayerFollowSpotlightStatus;
  detail: string;
};

function getPresenterOwnershipRow({
  activePresenters,
  owner,
  presenterStatus,
  spotlightEventCount,
}: {
  activePresenters: PresenterCandidate[];
  owner: PresenterCandidate | null | undefined;
  presenterStatus: MultiplayerFollowSpotlightReport["presenterStatus"];
  spotlightEventCount: number;
}): MultiplayerFollowSpotlightRow {
  const status: MultiplayerFollowSpotlightStatus =
    presenterStatus === "conflict"
      ? "blocked"
      : presenterStatus === "owned"
        ? "ready"
        : activePresenters.length === 0 && spotlightEventCount === 0
          ? "review"
          : "ready";

  return {
    id: "presenter-ownership",
    status,
    category: "presenter-ownership",
    label: "Presenter ownership",
    detail:
      presenterStatus === "conflict"
        ? `${activePresenters.length} presenters are broadcasting spotlight at once.`
        : owner
          ? `${owner.name} owns the current spotlight presenter state.`
          : "No active presenter owns spotlight right now.",
    value: presenterStatus,
    peerId: owner?.id ?? null,
    peerName: owner?.name ?? null,
    recommendation:
      status === "blocked"
        ? "Stop competing spotlights before starting the review walkthrough."
        : status === "review"
          ? "Start spotlight before a multiplayer handoff so reviewers know who owns the walkthrough."
          : "Presenter ownership is ready for live review.",
  };
}

function getHandoffTimerRow({
  handoffTimerSeconds,
  handoffTimerStatus,
  owner,
}: {
  handoffTimerSeconds: number | null;
  handoffTimerStatus: MultiplayerFollowSpotlightStatus;
  owner: PresenterCandidate | null | undefined;
}): MultiplayerFollowSpotlightRow {
  return {
    id: "handoff-timer",
    status: handoffTimerStatus,
    category: "handoff-timer",
    label: "Handoff timer",
    detail: owner
      ? `${owner.name}'s presenter handoff has been active for ${formatTimer(handoffTimerSeconds)}.`
      : "No presenter handoff timer is active.",
    value: formatTimer(handoffTimerSeconds),
    peerId: owner?.id ?? null,
    peerName: owner?.name ?? null,
    recommendation:
      handoffTimerStatus === "blocked"
        ? "Restart or hand off presenter ownership before relying on this replay evidence."
        : handoffTimerStatus === "review"
          ? "Refresh presenter ownership if the walkthrough has been idle."
          : "Handoff timer is fresh enough for review evidence.",
  };
}

function getViewportSyncRow({
  followedPeerId,
  owner,
  viewportSync,
}: {
  followedPeerId: string | null;
  owner: PresenterCandidate | null | undefined;
  viewportSync: ViewportSyncResult;
}): MultiplayerFollowSpotlightRow {
  return {
    id: "viewport-sync",
    status: viewportSync.status,
    category: "viewport-sync",
    label: "Viewport sync review",
    detail: viewportSync.detail,
    value:
      viewportSync.panDelta === null || viewportSync.zoomDelta === null
        ? followedPeerId
          ? "pending"
          : "not-following"
        : `${viewportSync.panDelta}px / ${viewportSync.zoomDelta}`,
    peerId: viewportSync.followedPeer?.id ?? owner?.id ?? null,
    peerName: viewportSync.followedPeer?.name ?? owner?.name ?? null,
    recommendation:
      viewportSync.status === "blocked"
        ? "Stop following the missing peer or rejoin the collaborator before handoff."
        : viewportSync.status === "review"
          ? "Follow the presenter and confirm page, pan, and zoom before exporting evidence."
          : "Viewport sync is ready for the presenter walkthrough.",
  };
}

function getAdminExportRow(): MultiplayerFollowSpotlightRow {
  return {
    id: "admin-export-evidence",
    status: "ready",
    category: "admin-export",
    label: "Admin export evidence",
    detail: `${adminExportEvidence.length} admin export commands cover follow, spotlight, handoff, and room evidence.`,
    value: `${adminExportEvidence.length} exports`,
    peerId: null,
    peerName: null,
    recommendation:
      "Attach Admin > Multiplayer presence exports to release or handoff review.",
  };
}

function formatTimer(seconds: number | null) {
  if (seconds === null) {
    return "not started";
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (minutes === 0) {
    return `${remainder}s`;
  }

  return `${minutes}m ${remainder}s`;
}

function formatOptionalNumber(value: number | null) {
  return value === null ? "n/a" : value.toLocaleString();
}

function roundToHundredth(value: number) {
  return Math.round(value * 100) / 100;
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

  return `"${text.replaceAll('"', '""')}"`;
}
