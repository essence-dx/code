import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    get length() {
      return storage.size;
    },
    clear: () => storage.clear(),
    getItem: (key: string) => storage.get(key) ?? null,
    key: (index: number) => [...storage.keys()][index] ?? null,
    removeItem: (key: string) => {
      storage.delete(key);
    },
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  } satisfies Storage,
  configurable: true,
});

const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (String(args[0]).includes("[zustand persist middleware] Unable to update item")) return;
  originalWarn(...args);
};

const { useEditorStore } = await import("../src/features/editor/state/editor-store");

useEditorStore.getState().createNewProject("Control regression project", "16:9");

let state = useEditorStore.getState();
assert.equal(state.isPlaying, false);
state.setCurrentTime(state.project.duration);
state.togglePlayback();

state = useEditorStore.getState();
assert.equal(state.isPlaying, true);
assert.equal(state.currentTime, 0);

state.togglePlayback();
state = useEditorStore.getState();
assert.equal(state.isPlaying, false);

state.addTextLayer();
state = useEditorStore.getState();
assert.equal(state.project.layers.length, 1);
assert.equal(state.past.length, 1);

state.undo();
state = useEditorStore.getState();
assert.equal(state.project.layers.length, 0);
assert.equal(state.future.length, 1);

state.redo();
state = useEditorStore.getState();
assert.equal(state.project.layers.length, 1);
assert.equal(state.past.length, 1);
assert.equal(state.future.length, 0);

const job = state.queueExport("json", "project-bundle");
state = useEditorStore.getState();
assert.equal(state.exportJobs.find((item) => item.id === job.id)?.status, "queued");

state.updateExportJob(job.id, { status: "cancelled", progress: 100 });
state = useEditorStore.getState();
assert.equal(state.exportJobs.find((item) => item.id === job.id)?.status, "cancelled");
assert.equal(state.exportJobs.find((item) => item.id === job.id)?.progress, 100);

state.removeExportJob(job.id);
state = useEditorStore.getState();
assert.equal(state.exportJobs.some((item) => item.id === job.id), false);

const editorShell = read("src/features/editor/components/editor-shell.tsx");
assert.match(editorShell, /window\.setTimeout\(\(\) => \{/);
assert.match(editorShell, /void trySaveLocalProject\(project, mediaAssets\);/);
assert.match(editorShell, /window\.clearTimeout\(timeout\)/);

const shortcuts = read("src/features/editor/hooks/use-editor-shortcuts.ts");
assert.match(shortcuts, /commandKey && key === "s"/);
assert.match(shortcuts, /void trySaveLocalProject\(project, mediaAssets\);/);
assert.match(shortcuts, /commandKey && key === "z"[\s\S]*?state\.undo\(\)/);
assert.match(shortcuts, /commandKey && key === "y"[\s\S]*?state\.redo\(\)/);
assert.match(shortcuts, /event\.code === "Space"[\s\S]*?state\.togglePlayback\(\)/);

const topbar = read("src/features/editor/components/project-topbar.tsx");
assert.match(topbar, /<LocalSaveButton project=\{project\} mediaAssets=\{mediaAssets\} \/>/);
assert.match(topbar, /disabled=\{!canUndo\}/);
assert.match(topbar, /disabled=\{!canRedo\}/);

const timelineCommandBar = read("src/features/editor/components/timeline-command-bar.tsx");
assert.match(timelineCommandBar, /onClick=\{onTogglePlayback\}/);
assert.match(timelineCommandBar, /aria-label=\{isPlaying \? "Pause" : "Play"\}/);

const playbackClock = read("src/features/editor/hooks/use-playback-clock.ts");
assert.match(playbackClock, /state\.setCurrentTime\(nextTime\)/);
assert.match(playbackClock, /nextTime >= duration[\s\S]*?state\.setPlayback\(false\)/);

const exportPanel = read("src/features/editor/components/export-panel.tsx");
assert.match(exportPanel, /const controller = new AbortController\(\)/);
assert.match(exportPanel, /controllerRef\.current\?\.abort\(\)/);
assert.match(exportPanel, /cancelBrowserRender\(\)/);
assert.match(exportPanel, /updateExportJob\(activeJobId, \{ status: "cancelled", progress: 100 \}\)/);

console.warn = originalWarn;
console.log("Editor control regression checks passed.");
