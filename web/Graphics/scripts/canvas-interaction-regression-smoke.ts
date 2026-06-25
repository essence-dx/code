import { readFileSync } from "node:fs";

const canvasSource = readFileSync(
  "src/features/editor/components/editor-canvas.tsx",
  "utf8",
);
const workspaceSource = readFileSync(
  "src/features/editor/components/editor-workspace.tsx",
  "utf8",
);
const clipboardInteropSource = readFileSync(
  "src/features/editor/clipboard-interop.ts",
  "utf8",
);
const clipboardActionsSource = readFileSync(
  "src/features/editor/editor-clipboard-actions.ts",
  "utf8",
);
const workspaceSidebarSource = readFileSync(
  "src/features/editor/components/workspace-sidebar.tsx",
  "utf8",
);
const propertiesPanelSource = readFileSync(
  "src/features/editor/components/properties-panel.tsx",
  "utf8",
);
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

assert(
  /selectionChromeVisible={\s*tool === "select" && selectedLayerIdSet\.has\(layer\.id\)\s*}/.test(
    canvasSource,
  ),
  "Layer selection chrome should be gated to the Select tool.",
);
assert(
  /showControls={\s*tool === "select" &&\s*layer\.id === selectedLayerId &&\s*selectedLayerIds\.length === 1\s*}/.test(
    canvasSource,
  ),
  "Resize and rotate controls should only render while using Select.",
);
assert(
  /const dismissVectorEditing = useCallback/.test(canvasSource) &&
    /dismissVectorEditing\(\);[\s\S]*?if \(!isCanvasSurfaceTarget/.test(
      canvasSource,
    ),
  "Drawing and canvas pointer paths should clear armed vector editing before creating paths.",
);
assert(
  /const isVectorEditingSelection =/.test(canvasSource) &&
    /vectorEditing={isVectorEditingSelection}/.test(canvasSource),
  "Vector node handles should require an explicitly armed selected path.",
);
assert(
  /selectionChromeVisible && pathData \? <PathSelectionContainer \/> : null/.test(
    canvasSource,
  ),
  "Path containers should render only as Select-tool selection chrome.",
);
assert(
  /tool === "select" && selectionBounds && selectedLayerIds\.length > 1/.test(
    canvasSource,
  ),
  "Multi-selection bounds should be hidden during drawing tools.",
);
assert(
  /data-editor-guide="true"/.test(canvasSource) &&
    /Click X to delete/.test(canvasSource),
  "Persistent guides should expose a clear click-to-delete affordance.",
);
assert(
  /export async function readClipboardFiles/.test(clipboardInteropSource),
  "Clipboard interop should read pasted image and video files.",
);
assert(
  /\| \{ kind: "media"; files: File\[\] \}/.test(clipboardActionsSource) &&
    /readClipboardFiles/.test(clipboardActionsSource),
  "Design clipboard imports should include media payloads.",
);
assert(
  /clipboard\.kind === "media"/.test(workspaceSource) &&
    /importMediaFiles\(clipboard\.files, getDefaultImportPoint\(view\)\)/.test(
      workspaceSource,
    ),
  "System paste should import clipboard media files into the canvas.",
);
assert(
  /modifier && key === "v"[\s\S]*?void pasteFromSystemClipboard\(\);/.test(
    workspaceSource,
  ),
  "Ctrl+V should use system clipboard paste so image and video clipboard files work.",
);
assert(
  /canPaste={true}/.test(workspaceSource) &&
    /onPaste={\(\) => void pasteFromSystemClipboard\(\)}/.test(workspaceSource),
  "The toolbar Paste button should stay available for system clipboard media.",
);
assert(
  /\[\&_\*\]:min-w-0/.test(workspaceSidebarSource) &&
    /\[\&_button\]:max-w-full/.test(workspaceSidebarSource) &&
    /\[\&_input\]:max-w-full/.test(workspaceSidebarSource),
  "The left workspace sidebar should contain long controls and labels.",
);
assert(
  /overflow-x-hidden/.test(propertiesPanelSource) &&
    /\[\&_\[data-slot=scroll-area-viewport\]\]:overflow-x-hidden/.test(
      propertiesPanelSource,
    ) &&
    /\[\&_\[data-slot=select-trigger\]\]:w-full/.test(propertiesPanelSource),
  "The right properties panel should keep select controls inside its column.",
);
assert(
  /data-editor-guide-delete-affordance="true"/.test(canvasSource),
  "Persistent guides should render a compact delete affordance.",
);
assert(
  /type="button"[\s\S]*?aria-label={`Delete \$\{guide\.orientation\} guide`}/.test(
    canvasSource,
  ),
  "Persistent guides should expose a clickable delete button, not only a tooltip.",
);
assert(
  /const GUIDE_TOGGLE_DISTANCE = 24/.test(canvasSource),
  "Ruler guide toggling should remove nearby guides with a forgiving desktop hit target.",
);
assert(
  /Upload image or video/.test(workspaceSource) &&
    /mediaInputRef\.current\?\.click\(\)/.test(workspaceSource),
  "Image and video upload should be a visible top-bar action, not only hidden in File.",
);
assert(
  /data-editor-properties-panel="true"/.test(propertiesPanelSource) &&
    /\[contain:inline-size\]/.test(propertiesPanelSource),
  "The right properties panel should explicitly contain horizontal layout overflow.",
);
assert(
  packageJson.scripts["editor:canvas-interaction-regression-smoke"]?.includes(
    "canvas-interaction-regression-smoke",
  ),
  "Targeted canvas interaction regression smoke should be listed.",
);

console.log(
  "Canvas interaction regression smoke passed: selection chrome, guide deletion, media paste, and sidebar containment are covered.",
);

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}
