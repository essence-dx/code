import { readFileSync } from "node:fs";
import {
  getAccessibilityKeyboardAuthoringReviewCsv,
  getAccessibilityKeyboardAuthoringReviewJson,
  getAccessibilityKeyboardAuthoringReviewMarkdown,
  getAccessibilityKeyboardAuthoringReviewReport,
} from "../src/features/editor/accessibility-keyboard-authoring-review";
import type { CommandPaletteCommand } from "../src/features/editor/components/command-palette";
import { getProductionDeploySmokeReport } from "../src/features/editor/production-deploy-smoke";
import { defaultToolShortcutPreferences } from "../src/features/editor/shortcut-preferences";
import type {
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "../src/features/editor/types";

const now = "2026-05-18T13:00:00.000Z";

const page: DesignPage = {
  id: "page-accessible",
  name: "Accessible launch surface",
  background: "#ffffff",
  prototypeStart: true,
  layers: [
    textLayer("headline", "Launch headline", "Accessible launch", 64, 64, 360, 56),
    imageLayer("hero-image", "Product preview image", 64, 152, 320, 220),
    {
      ...textLayer("primary-action", "Open prototype button", "Open prototype", 64, 420, 180, 56),
      prototype: {
        trigger: "click",
        action: "navigate",
        targetPageId: "page-accessible",
        transition: "instant",
        durationMs: 0,
      },
    },
  ],
};

const document: DesignDocument = {
  version: 1,
  activePageId: page.id,
  pages: [page],
  variables: {},
  components: {},
  activityEvents: [
    {
      id: "activity-accessibility-handoff",
      kind: "extension",
      actorName: "QA Lead",
      actorEmail: "qa@example.com",
      label: "Exported accessibility keyboard handoff",
      detail: "Ready for public route release review.",
      createdAt: now,
    },
  ],
  updatedAt: now,
};

const commands: CommandPaletteCommand[] = [
  command("save-file", "Save file", "Persist the current file", "Ctrl S"),
  command("zoom-to-fit", "Zoom to fit", "Fit the canvas in view", "Shift 1"),
  command("duplicate-selection", "Duplicate selection", "Duplicate selected layers", "Ctrl D"),
  command("open-command-palette", "Command palette", "Run editor commands", "Ctrl K"),
];

const productionDeploySmoke = getProductionDeploySmokeReport({
  activePage: page,
  baseUrl: "https://figma.example.com",
  document,
  generatedAt: now,
  shareToken: "accessible-public-token",
});

const report = getAccessibilityKeyboardAuthoringReviewReport({
  activePage: page,
  commandPaletteCommands: commands,
  document,
  generatedAt: now,
  productionDeploySmoke,
  toolShortcuts: defaultToolShortcutPreferences,
});

assert(report.status === "ready", "Accessible authoring review should be ready.");
assert(report.score >= 95, "Ready authoring review should keep a high score.");
assert(report.surfaceCount === 5, "Editor, admin, share, prototype, and embed surfaces should be reviewed.");
assert(report.readySurfaceCount === 5, "All fixture surfaces should be ready.");
assert(report.keyboardReviewCount >= 4, "Keyboard authoring checks should be represented.");
assert(report.shortcutConflictCount === 0, "Default shortcuts should not collide.");
assert(report.commandPaletteEvidenceCount === commands.length, "Command palette shortcuts should be counted.");
assert(report.routeSmokeSurfaceCount === 5, "Each target surface should include route smoke evidence.");
assert(
  report.surfaceReviews.some(
    (surface) => surface.surface === "public-prototype" && surface.status === "ready",
  ),
  "Prototype surface should be reviewed as ready.",
);
assert(
  report.keyboardReviews.some(
    (review) => review.id === "prototype-keyboard-fallbacks" && review.status === "ready",
  ),
  "Prototype keyboard fallback review should be ready.",
);
assert(
  report.rows.some(
    (row) => row.category === "route-keyboard-smoke" && row.status === "ready",
  ),
  "Route keyboard smoke rows should be ready.",
);

const markdown = getAccessibilityKeyboardAuthoringReviewMarkdown(report);
const csv = getAccessibilityKeyboardAuthoringReviewCsv(report);
const json = JSON.parse(getAccessibilityKeyboardAuthoringReviewJson(report)) as {
  keyboardReviews: unknown[];
  surfaceReviews: unknown[];
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

assert(markdown.includes("Accessibility Keyboard Authoring Review"), "Markdown should include a clear title.");
assert(markdown.includes("editor surface"), "Markdown should include editor surface evidence.");
assert(markdown.includes("admin surface"), "Markdown should include admin surface evidence.");
assert(markdown.includes("public share"), "Markdown should include public share evidence.");
assert(markdown.includes("public prototype"), "Markdown should include public prototype evidence.");
assert(markdown.includes("public embed"), "Markdown should include public embed evidence.");
assert(markdown.includes("keyboard authoring"), "Markdown should include keyboard authoring evidence.");
assert(csv.includes("surface-accessibility"), "CSV should include surface accessibility rows.");
assert(json.surfaceReviews.length === 5, "JSON should preserve surface reviews.");
assert(json.keyboardReviews.length >= 4, "JSON should preserve keyboard reviews.");
assert(
  packageJson.scripts["editor:accessibility-keyboard-authoring-review-smoke"]?.includes(
    "accessibility-keyboard-authoring-review-smoke",
  ),
  "Targeted smoke command should be listed.",
);

console.log(
  `Accessibility keyboard authoring review smoke passed: ${report.readySurfaceCount}/${report.surfaceCount} surfaces, score ${report.score}.`,
);

function command(
  id: string,
  label: string,
  detail: string,
  shortcut: string,
): CommandPaletteCommand {
  return {
    id,
    label,
    detail,
    shortcut,
    run: noop,
  };
}

function textLayer(
  id: string,
  name: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
): DesignLayer {
  return {
    id,
    type: "text",
    name,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: "transparent",
    stroke: "transparent",
    strokeWidth: 0,
    cornerRadius: 0,
    text,
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1.35,
    letterSpacing: 0,
    textAlign: "left",
    textColor: "#111827",
  };
}

function imageLayer(
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
): DesignLayer {
  return {
    id,
    type: "image",
    name,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: "#e5e7eb",
    stroke: "transparent",
    strokeWidth: 0,
    cornerRadius: 16,
    imageSrc: "data:image/png;base64,fixture",
    imageAlt: "Product preview showing an accessible design surface.",
  };
}

function noop() {}

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}
