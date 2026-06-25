import {
  formatShortcutBindings,
  getShortcutBindingConflict,
  getShortcutCommandForEvent,
  isSafeCustomShortcut,
  normalizeShortcutPreferences,
  setShortcutPreference,
  shortcutBindingFromEvent,
  type SpreadsheetShortcutPreference,
} from "@/features/spreadsheet/keyboard-shortcuts";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function keyEvent({
  altKey = false,
  code,
  ctrlKey = false,
  key,
  metaKey = false,
  shiftKey = false,
}: {
  altKey?: boolean;
  code?: string;
  ctrlKey?: boolean;
  key: string;
  metaKey?: boolean;
  shiftKey?: boolean;
}) {
  return { altKey, code, ctrlKey, key, metaKey, shiftKey };
}

const ctrlB = keyEvent({ code: "KeyB", ctrlKey: true, key: "b" });
const ctrlShiftZ = keyEvent({
  code: "KeyZ",
  ctrlKey: true,
  key: "Z",
  shiftKey: true,
});
const ctrlAltE = keyEvent({
  altKey: true,
  code: "KeyE",
  ctrlKey: true,
  key: "e",
});
const ctrlC = keyEvent({ code: "KeyC", ctrlKey: true, key: "c" });
const ctrlEnter = keyEvent({ ctrlKey: true, key: "Enter" });
const ctrlPageDown = keyEvent({ ctrlKey: true, key: "PageDown" });
const ctrlPageUp = keyEvent({ ctrlKey: true, key: "PageUp" });
const altEqual = keyEvent({ altKey: true, code: "Equal", key: "=" });

assert(
  getShortcutCommandForEvent(ctrlB, []) === "format.bold",
  "default Ctrl+B toggles bold",
);
assert(
  getShortcutCommandForEvent(ctrlShiftZ, []) === "history.redo",
  "default Ctrl+Shift+Z is a redo shortcut",
);
assert(
  getShortcutCommandForEvent(ctrlEnter, []) === "edit.fillSelection",
  "default Ctrl+Enter fills the selected range from the active cell",
);
assert(
  getShortcutCommandForEvent(ctrlPageDown, []) === "workbook.nextSheet",
  "default Ctrl+PageDown switches to the next worksheet",
);
assert(
  getShortcutCommandForEvent(ctrlPageUp, []) === "workbook.previousSheet",
  "default Ctrl+PageUp switches to the previous worksheet",
);
assert(
  getShortcutCommandForEvent(altEqual, []) === "edit.autoSum",
  "default Alt+= inserts AutoSum",
);

let preferences: SpreadsheetShortcutPreference[] = setShortcutPreference(
  [],
  "format.bold",
  shortcutBindingFromEvent(ctrlAltE),
);

assert(
  getShortcutCommandForEvent(ctrlB, preferences) === null,
  "customizing bold removes the old default binding",
);
assert(
  getShortcutCommandForEvent(ctrlAltE, preferences) === "format.bold",
  "customized Ctrl+Alt+E toggles bold",
);

preferences = setShortcutPreference(preferences, "clipboard.copy", null);

assert(
  getShortcutCommandForEvent(ctrlC, preferences) === null,
  "disabled copy shortcut no longer resolves",
);
assert(
  getShortcutBindingConflict(
    "format.bold",
    shortcutBindingFromEvent(ctrlC),
    [],
  )?.command === "clipboard.copy",
  "conflict detection catches another command's shortcut",
);
assert(
  !isSafeCustomShortcut(shortcutBindingFromEvent(keyEvent({ key: "x" }))),
  "plain letter custom shortcuts are rejected",
);
assert(
  !isSafeCustomShortcut(
    shortcutBindingFromEvent(
      keyEvent({ code: "KeyX", key: "X", shiftKey: true }),
    ),
  ),
  "shift-only letter custom shortcuts are rejected",
);
assert(
  normalizeShortcutPreferences(JSON.parse(JSON.stringify(preferences))).length ===
    2,
  "stored shortcut preferences normalize back into command preferences",
);
assert(
  formatShortcutBindings([shortcutBindingFromEvent(ctrlAltE)]) ===
    "Ctrl+Alt+E",
  "shortcut labels are stable for the UI",
);

console.log("Keyboard shortcut checks passed.");
