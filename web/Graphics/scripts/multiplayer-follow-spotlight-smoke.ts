import { readFileSync } from "node:fs";
import {
  getMultiplayerFollowSpotlightCsv,
  getMultiplayerFollowSpotlightJson,
  getMultiplayerFollowSpotlightMarkdown,
  getMultiplayerFollowSpotlightReport,
} from "../src/features/editor/multiplayer-follow-spotlight";
import type {
  CollaborationPeer,
  CollaborationPresenceEvent,
} from "../src/features/editor/collaboration-presence";

const now = Date.parse("2026-05-19T09:00:00.000Z");
const presenter = peer("peer-presenter", "Priya Presenter", true, {
  x: 120,
  y: 80,
  zoom: 0.88,
});
const reviewer = peer("peer-reviewer", "Rin Reviewer", false, {
  x: 126,
  y: 84,
  zoom: 0.9,
});
const readyEvents: CollaborationPresenceEvent[] = [
  event("spotlight-on", presenter, now - 120_000, "Started presenter walkthrough."),
  event("followed", presenter, now - 90_000, "Reviewer followed Priya Presenter."),
];
const readyReport = getMultiplayerFollowSpotlightReport({
  activePageId: "page-a",
  currentView: { x: 124, y: 82, zoom: 0.89 },
  followedPeerId: presenter.id,
  now,
  peers: [presenter, reviewer],
  presenceEvents: readyEvents,
  selfId: "self",
  selfSpotlight: false,
});
const conflictReport = getMultiplayerFollowSpotlightReport({
  activePageId: "page-a",
  currentView: { x: 0, y: 0, zoom: 1 },
  followedPeerId: "missing-peer",
  now,
  peers: [
    presenter,
    peer("peer-conflict", "Casey Conflict", true, undefined, "page-b"),
  ],
  presenceEvents: [
    ...readyEvents,
    event("spotlight-on", presenter, now - 5_400_000, "Old presenter handoff."),
  ],
  selfId: "self",
  selfSpotlight: true,
});
const markdown = getMultiplayerFollowSpotlightMarkdown(readyReport);
const csv = getMultiplayerFollowSpotlightCsv(readyReport);
const json = JSON.parse(getMultiplayerFollowSpotlightJson(readyReport)) as {
  rows: unknown[];
  adminExportEvidence: string[];
  summary: {
    presenterStatus: string;
    handoffTimerSeconds: number | null;
    viewportSyncStatus: string;
    adminExportEvidenceCount: number;
  };
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const extensionsSource = readFileSync(
  "src/features/editor/components/extensions-panel.tsx",
  "utf8",
);
const workspaceSidebarSource = readFileSync(
  "src/features/editor/components/workspace-sidebar.tsx",
  "utf8",
);
const workspaceSource = readFileSync(
  "src/features/editor/components/editor-workspace.tsx",
  "utf8",
);
const adminTypesSource = readFileSync(
  "src/features/admin/admin-multiplayer-presence-types.ts",
  "utf8",
);
const adminExportSource = readFileSync(
  "src/features/admin/admin-multiplayer-presence-export.ts",
  "utf8",
);

assert(readyReport.status === "ready", "Owned presenter fixture should be ready.");
assert(readyReport.presenterStatus === "owned", "Presenter ownership should be owned.");
assert(readyReport.ownerPeerId === presenter.id, "Presenter owner should be identified.");
assert(readyReport.handoffTimerSeconds !== null && readyReport.handoffTimerSeconds > 0, "Handoff timer should be measured.");
assert(readyReport.viewportSyncStatus === "ready", "Followed viewport should be in sync.");
assert(readyReport.adminExportEvidenceCount >= 3, "Admin export evidence should be listed.");
assert(
  readyReport.rows.some((row) => row.category === "presenter-ownership"),
  "Rows should include presenter ownership evidence.",
);
assert(
  readyReport.rows.some((row) => row.category === "handoff-timer"),
  "Rows should include handoff timer evidence.",
);
assert(
  readyReport.rows.some((row) => row.category === "viewport-sync"),
  "Rows should include viewport sync review.",
);
assert(
  readyReport.rows.some((row) => row.category === "admin-export"),
  "Rows should include admin export evidence.",
);
assert(conflictReport.status === "blocked", "Competing spotlights should block release.");
assert(conflictReport.presenterConflictCount >= 1, "Conflict count should include all active presenters.");
assert(conflictReport.viewportSyncStatus === "blocked", "Missing followed peer should block viewport sync.");
assert(markdown.includes("Multiplayer Follow Spotlight"), "Markdown should include the report title.");
assert(markdown.includes("Admin Export Evidence"), "Markdown should list admin export evidence.");
assert(markdown.includes("Handoff timer"), "Markdown should include handoff timer text.");
assert(csv.includes("presenter-ownership"), "CSV should include presenter ownership rows.");
assert(json.rows.length === readyReport.rows.length, "JSON should preserve all rows.");
assert(json.adminExportEvidence.length === readyReport.adminExportEvidence.length, "JSON should preserve admin export evidence.");
assert(json.summary.presenterStatus === "owned", "JSON summary should include presenter status.");
assert(json.summary.handoffTimerSeconds === readyReport.handoffTimerSeconds, "JSON summary should include the handoff timer.");
assert(json.summary.viewportSyncStatus === "ready", "JSON summary should include viewport sync status.");
assert(json.summary.adminExportEvidenceCount === readyReport.adminExportEvidenceCount, "JSON summary should include admin evidence count.");
assert(
  /MultiplayerFollowSpotlightPanel/.test(extensionsSource) &&
    /getMultiplayerFollowSpotlightReport/.test(extensionsSource),
  "Extensions should wire the multiplayer follow/spotlight panel and report.",
);
assert(
  /collaborationPresence/.test(workspaceSidebarSource) &&
    /collaborationPresence/.test(workspaceSource),
  "Live collaboration state should be passed into Extensions.",
);
assert(
  /handoff-timers/.test(adminTypesSource) &&
    /presenterHandoffAgeMinutes/.test(adminExportSource),
  "Admin multiplayer exports should include handoff timer evidence.",
);
assert(
  packageJson.scripts["editor:multiplayer-follow-spotlight-smoke"]?.includes(
    "multiplayer-follow-spotlight-smoke",
  ),
  "Targeted multiplayer follow/spotlight smoke command should be listed.",
);

console.log(
  `Multiplayer follow/spotlight smoke passed: ${readyReport.score} score, ${readyReport.handoffTimerSeconds}s handoff timer.`,
);

function peer(
  id: string,
  name: string,
  spotlight: boolean,
  view?: CollaborationPeer["view"],
  activePageId = "page-a",
): CollaborationPeer {
  return {
    id,
    name,
    email: `${id}@example.com`,
    color: "#14b8a6",
    cursor: { x: 160, y: 120, pageId: activePageId },
    view,
    activePageId,
    spotlight,
    updatedAt: now - 30_000,
  };
}

function event(
  kind: CollaborationPresenceEvent["kind"],
  eventPeer: CollaborationPeer,
  createdAt: number,
  detail: string,
): CollaborationPresenceEvent {
  return {
    id: `${kind}-${eventPeer.id}-${createdAt}`,
    kind,
    peerId: eventPeer.id,
    peerName: eventPeer.name,
    peerEmail: eventPeer.email,
    color: eventPeer.color,
    detail,
    createdAt,
  };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}
