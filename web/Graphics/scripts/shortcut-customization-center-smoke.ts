import {
  createShortcutCustomizationCenterExport,
  getShortcutCustomizationCenterMarkdown,
  getShortcutCustomizationCenterReport,
  parseShortcutCustomizationCenterImport,
} from "../src/features/editor/shortcut-customization-center";
import type { CommandPaletteCommand } from "../src/features/editor/components/command-palette";
import type { ToolShortcutPreferences } from "../src/features/editor/shortcut-preferences";

const toolShortcuts: ToolShortcutPreferences = {
  select: "v",
  hand: "v",
  pen: "p",
  pencil: "b",
  cutter: "x",
  measure: "m",
  frame: "f",
  rectangle: "r",
  ellipse: "o",
  text: "t",
  sticky: "n",
  comment: "m",
};

const commands: CommandPaletteCommand[] = [
  {
    id: "tool-select",
    label: "Select tool",
    detail: "Switch to selection",
    shortcut: "V",
    run: noop,
  },
  {
    id: "tool-hand",
    label: "Pan tool",
    detail: "Move around the canvas",
    shortcut: "V",
    run: noop,
  },
  {
    id: "tool-comment",
    label: "Comment tool",
    detail: "Pin feedback on the canvas",
    shortcut: "M",
    run: noop,
  },
  {
    id: "save",
    label: "Save",
    detail: "Persist the current file",
    shortcut: "Ctrl S",
    run: noop,
  },
  {
    id: "duplicate",
    label: "Duplicate selection",
    detail: "Duplicate selected layers",
    shortcut: "Ctrl D",
    run: noop,
  },
  {
    id: "delete-selection",
    label: "Delete selection",
    detail: "Remove selected layers",
    shortcut: "Delete",
    run: noop,
  },
];

const report = getShortcutCustomizationCenterReport({
  commands,
  toolShortcuts,
});

assert(report.status === "blocked", "Conflicting scoped shortcuts should block the center.");
assert(report.bindingCount >= 6, "Command palette shortcuts should become binding evidence.");
assert(report.scopeCount >= 4, "The center should group shortcut evidence by scope.");
assert(report.overrideCount === 2, "Hand and comment should be counted as tool overrides.");
assert(report.conflictCount >= 2, "Tool and command-palette collisions should be detected.");
assert(report.commandPaletteEvidenceCount === 6, "Every command with a shortcut should be counted.");
assert(report.exportReady === false, "Conflicted shortcuts should not be export-ready.");
assert(
  report.rows.some((row) => row.scope === "tool" && row.status === "blocked"),
  "Tool scope row should surface shortcut conflicts.",
);
assert(
  report.rows.some(
    (row) => row.scope === "command-palette" && row.status === "blocked",
  ),
  "Command palette row should reflect duplicate command evidence.",
);
assert(
  report.commandPaletteEvidence.some(
    (item) =>
      item.commandId === "tool-hand" &&
      item.shortcut === "v" &&
      item.override === true,
  ),
  "Command palette evidence should link tool commands to customized shortcuts.",
);

const exported = createShortcutCustomizationCenterExport(report);

assert(exported.version === 1, "Export should be versioned.");
assert(exported.bindings.length === report.bindingCount, "Export should include bindings.");
assert(exported.conflicts.length === report.conflictCount, "Export should include conflicts.");

const importPreview = parseShortcutCustomizationCenterImport(
  JSON.stringify({
    version: 1,
    toolShortcuts: {
      select: "v",
      hand: "h",
      rectangle: "r",
      ellipse: "r",
      laser: "l",
    },
  }),
  toolShortcuts,
  commands,
);

assert(importPreview.skippedShortcutKeys.includes("laser"), "Unknown imported shortcuts should be skipped.");
assert(
  importPreview.conflicts.some((conflict) => conflict.shortcut === "r"),
  "Imported shortcut collisions should be reported.",
);
assert(importPreview.report.status === "blocked", "Import preview should expose blocked state.");

const markdown = getShortcutCustomizationCenterMarkdown(report);

assert(
  markdown.includes("Shortcut Customization Center"),
  "Markdown export should include a clear title.",
);
assert(markdown.includes("collision detection"), "Markdown should include collision detection evidence.");
assert(markdown.includes("per-scope overrides"), "Markdown should include scoped override evidence.");
assert(markdown.includes("command palette evidence"), "Markdown should include command palette evidence.");

console.log(
  `Shortcut customization center smoke passed: ${report.bindingCount} bindings, ${report.conflictCount} conflicts.`,
);

function noop() {}

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}
