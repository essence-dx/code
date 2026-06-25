import { readFileSync } from "node:fs";
import {
  getPresentationPresenterControlsCsv,
  getPresentationPresenterControlsJson,
  getPresentationPresenterControlsMarkdown,
  getPresentationPresenterControlsReport,
} from "../src/features/editor/presentation-presenter-controls";
import type {
  DesignComment,
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "../src/features/editor/types";

const now = "2026-05-18T22:20:00.000Z";

const coverSlide: DesignPage = {
  id: "slide-cover",
  name: "Slides deck / Cover",
  background: "#020617",
  prototypeStart: true,
  layers: [
    frame("slide-cover-frame", "Slide 01 / Cover", 0, 0, 1920, 1080),
    speakerNoteLayer(
      "slide-cover-speaker-notes",
      "Speaker notes / Cover",
      "Speaker notes: Open with the product promise and rehearse 75s.",
      "slide-cover-frame",
      120,
      760,
      760,
      140,
    ),
    {
      ...button("slide-cover-next", "Next slide", "slide-cover-frame", 1560, 900, 220, 72),
      prototype: {
        action: "navigate",
        durationMs: 220,
        targetPageId: "slide-metrics",
        transition: "slide-left",
        trigger: "click",
      },
    },
  ],
  comments: [
    noteComment(
      "comment-cover-note",
      "Presenter note: Mention the customer story before the dashboard reveal.",
    ),
  ],
};

const metricsSlide: DesignPage = {
  id: "slide-metrics",
  name: "Slides deck / Metrics",
  background: "#0f172a",
  layers: [
    frame("slide-metrics-frame", "Slide 02 / Metrics", 0, 0, 1920, 1080),
    speakerNoteLayer(
      "slide-metrics-speaker-notes",
      "Speaker notes / Metrics",
      "Speaker notes: Spend 90 seconds on adoption, churn, and review cadence.",
      "slide-metrics-frame",
      120,
      760,
      820,
      140,
    ),
    {
      ...button("slide-metrics-prototype", "Open embedded prototype", "slide-metrics-frame", 1350, 880, 360, 72),
      prototype: {
        action: "navigate",
        durationMs: 300,
        targetPageId: "prototype-demo",
        transition: "dissolve",
        trigger: "click",
      },
    },
  ],
};

const prototypeDemo: DesignPage = {
  id: "prototype-demo",
  name: "Prototype demo",
  background: "#f8fafc",
  layers: [
    frame("prototype-demo-frame", "Demo frame", 0, 0, 1440, 900),
    button("prototype-demo-back", "Back to metrics", "prototype-demo-frame", 96, 760, 260, 72),
  ],
};

const document: DesignDocument = {
  version: 1,
  activePageId: coverSlide.id,
  pages: [coverSlide, metricsSlide, prototypeDemo],
  variables: {},
  components: {},
  activityEvents: [
    {
      id: "activity-rehearsal-cover",
      kind: "extension",
      actorName: "Presenter Lead",
      actorEmail: "presenter@example.com",
      label: "Captured timed rehearsal packet",
      detail: "Cover and Metrics slides rehearsed for 165 seconds with speaker notes.",
      createdAt: now,
    },
    {
      id: "activity-viewer-handoff",
      kind: "export",
      actorName: "Presenter Lead",
      actorEmail: "presenter@example.com",
      label: "Exported viewer handoff packet",
      detail:
        "Viewer handoff includes slide navigator, speaker notes summary, timed rehearsal packet, and public prototype route.",
      createdAt: now,
    },
  ],
  updatedAt: now,
};

const report = getPresentationPresenterControlsReport({
  document,
  generatedAt: now,
  shareToken: "presenter-token",
});

assert(report.status === "ready", "Presentation presenter controls fixture should be ready.");
assert(report.score >= 95, "Ready presenter controls fixture should keep a high score.");
assert(report.slideNavigatorCount >= 2, "Slide navigator evidence should be counted.");
assert(report.speakerNoteCount >= 2, "Speaker notes should be counted.");
assert(report.timedRehearsalPacketCount >= 2, "Timed rehearsal packets should be counted.");
assert(report.viewerHandoffExportCount >= 1, "Viewer handoff exports should be counted.");
assert(report.rows.some((row) => row.category === "slide-navigator"), "Rows should include slide navigator controls.");
assert(report.rows.some((row) => row.category === "speaker-notes"), "Rows should include speaker notes.");
assert(report.rows.some((row) => row.category === "timed-rehearsal"), "Rows should include timed rehearsal packets.");
assert(report.rows.some((row) => row.category === "viewer-handoff"), "Rows should include viewer handoff exports.");
assert(
  report.presenterControls.some((control) => control.kind === "slide-navigator" && control.status === "ready"),
  "Presenter controls should expose a ready slide navigator.",
);
assert(
  report.viewerHandoffExports.some((handoff) => handoff.route === "/share/presenter-token/prototype"),
  "Viewer handoff export should include the public prototype route.",
);

const markdown = getPresentationPresenterControlsMarkdown(report);
const csv = getPresentationPresenterControlsCsv(report);
const json = JSON.parse(getPresentationPresenterControlsJson(report)) as {
  slideNavigator: unknown[];
  speakerNotes: unknown[];
  timedRehearsalPackets: unknown[];
  viewerHandoffExports: unknown[];
  rows: unknown[];
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

assert(markdown.includes("Presentation Presenter Controls"), "Markdown should include a clear title.");
assert(markdown.includes("slide navigator"), "Markdown should mention slide navigator.");
assert(markdown.includes("speaker notes"), "Markdown should mention speaker notes.");
assert(markdown.includes("timed rehearsal packets"), "Markdown should mention timed rehearsal packets.");
assert(markdown.includes("viewer handoff exports"), "Markdown should mention viewer handoff exports.");
assert(csv.includes("viewer-handoff"), "CSV should include viewer handoff rows.");
assert(json.slideNavigator.length === report.slideNavigator.length, "JSON should preserve slide navigator rows.");
assert(json.speakerNotes.length === report.speakerNotes.length, "JSON should preserve speaker notes.");
assert(
  json.timedRehearsalPackets.length === report.timedRehearsalPackets.length,
  "JSON should preserve timed rehearsal packets.",
);
assert(
  json.viewerHandoffExports.length === report.viewerHandoffExports.length,
  "JSON should preserve viewer handoff exports.",
);
assert(json.rows.length === report.rows.length, "JSON should preserve review rows.");
assert(
  packageJson.scripts["editor:presentation-presenter-controls-smoke"]?.includes(
    "presentation-presenter-controls-smoke",
  ),
  "Targeted smoke command should be listed.",
);

console.log(
  `Presentation presenter controls smoke passed: ${report.score} score, ${report.viewerHandoffExportCount} handoff export(s).`,
);

function frame(
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
): DesignLayer {
  return {
    id,
    type: "frame",
    name,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: "#ffffff",
    stroke: "#cbd5e1",
    strokeWidth: 1,
    cornerRadius: 24,
  };
}

function speakerNoteLayer(
  id: string,
  name: string,
  text: string,
  parentId: string,
  x: number,
  y: number,
  width: number,
  height: number,
): DesignLayer {
  return {
    id,
    type: "sticky",
    name,
    parentId,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: "#fef3c7",
    stroke: "#f59e0b",
    strokeWidth: 1,
    cornerRadius: 14,
    text,
    fontFamily: "Inter",
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1.25,
    letterSpacing: 0,
    textAlign: "left",
    textColor: "#1f2937",
  };
}

function button(
  id: string,
  name: string,
  parentId: string,
  x: number,
  y: number,
  width: number,
  height: number,
): DesignLayer {
  return {
    id,
    type: "text",
    name,
    parentId,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: "#2563eb",
    stroke: "transparent",
    strokeWidth: 0,
    cornerRadius: 16,
    fontFamily: "Inter",
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: 0,
    text: name,
    textAlign: "center",
    textColor: "#ffffff",
  };
}

function noteComment(id: string, text: string): DesignComment {
  return {
    id,
    x: 120,
    y: 120,
    text,
    resolved: false,
    createdAt: now,
    updatedAt: now,
  };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}
