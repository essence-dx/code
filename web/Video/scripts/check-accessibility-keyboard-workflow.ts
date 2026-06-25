import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboardShell = read("src/features/dashboard/components/dashboard-page-shell.tsx");
const dashboardOverview = read("src/features/dashboard/components/dashboard-overview-section.tsx");
const dashboardLibrary = read("src/features/dashboard/components/dashboard-library-section.tsx");
const editorShell = read("src/features/editor/components/editor-shell.tsx");
const editorShortcuts = read("src/features/editor/hooks/use-editor-shortcuts.ts");
const inspectorPanel = read("src/features/editor/components/inspector-panel.tsx");
const mediaBin = read("src/features/editor/components/media-bin.tsx");
const mediaBinImport = read("src/features/editor/components/media-bin-import-controls.tsx");
const releaseReadinessCard = read("src/features/settings/components/release-readiness-card.tsx");
const timelinePanel = read("src/features/editor/components/timeline-panel.tsx");
const timelineTrackList = read("src/features/editor/components/timeline-track-list.tsx");
const lightweight = read("scripts/check-lightweight.mjs");
const packageJson = read("package.json");

assert.match(dashboardShell, /aria-label="Project dashboard"/);
assert.match(dashboardShell, /aria-labelledby="dashboard-projects-title"/);
assert.match(dashboardShell, /aria-label="Dashboard actions"/);
assert.match(dashboardOverview, /aria-label="Project overview"/);
assert.match(dashboardLibrary, /aria-label="Project libraries"/);

assert.match(editorShell, /aria-label="Essence Studio editor"/);
assert.match(editorShell, /aria-label="Editor workspace"/);
assert.match(editorShell, /aria-label="Preview and timeline workspace"/);
assert.match(editorShell, /aria-label="Inspector and assistant"/);
assert.match(editorShell, /aria-label="AI assistant"/);

assert.match(mediaBin, /aria-label="Media library"/);
assert.match(mediaBin, /aria-label="Media assets"/);
assert.match(mediaBin, /role="listitem"/);
assert.match(mediaBin, /role="status"/);
assert.match(mediaBinImport, /aria-label="Import media files"/);
assert.match(mediaBinImport, /aria-label="Reconnect selected media file"/);
assert.match(mediaBinImport, /aria-label="Batch reconnect missing media files"/);
assert.match(mediaBinImport, /aria-label="Import desktop media files"/);
assert.match(mediaBinImport, /aria-label="Import media from URL"/);

assert.match(inspectorPanel, /aria-label="Review queue"/);
assert.match(inspectorPanel, /aria-labelledby="review-queue-title"/);
assert.match(inspectorPanel, /aria-label="Layer inspector"/);
assert.match(inspectorPanel, /aria-label=\{`\$\{layer\.name\} inspector`\}/);

assert.match(timelinePanel, /aria-label="Timeline editor"/);
assert.match(timelinePanel, /aria-label="Timeline tracks"/);
assert.match(timelineTrackList, /role="group"/);
assert.match(timelineTrackList, /role="list"/);
assert.match(timelineTrackList, /role="button"/);
assert.match(timelineTrackList, /tabIndex=\{0\}/);
assert.match(timelineTrackList, /aria-label=\{timelineLayerAriaLabel\(layer\)\}/);
assert.match(timelineTrackList, /aria-pressed=\{isSelected\}/);
assert.match(timelineTrackList, /onKeyDown=\{\(event\) =>/);

assert.match(editorShortcuts, /event\.code === "Space"/);
assert.match(editorShortcuts, /togglePlayback\(\)/);
assert.match(editorShortcuts, /trySaveLocalProject/);
assert.match(editorShortcuts, /undo\(\)/);
assert.match(editorShortcuts, /redo\(\)/);
assert.match(editorShortcuts, /duplicateSelectedLayers\(\)/);
assert.match(editorShortcuts, /removeSelectedLayers\(\)/);
assert.match(editorShortcuts, /nudgeSelectedLayers/);

assert.match(releaseReadinessCard, /aria-label="Save release evidence snapshot"/);
assert.match(releaseReadinessCard, /aria-label=\{`Show \$\{releaseEvidenceFilterLabel\(filter\)\.toLowerCase\(\)\} release evidence`\}/);
assert.match(releaseReadinessCard, /aria-pressed=\{releaseEvidenceHistoryFilter === filter\}/);
assert.match(releaseReadinessCard, /aria-label=\{`Pin release evidence from \$\{formatEvidenceTime\(entry\.savedAt\)\}`\}/);
assert.match(releaseReadinessCard, /aria-label=\{`Re-verify release evidence from \$\{formatEvidenceTime\(entry\.savedAt\)\}`\}/);
assert.match(releaseReadinessCard, /aria-label="Clear release proof"/);

assert.match(packageJson, /check:accessibility-keyboard-workflow/);
assert.match(lightweight, /check:accessibility-keyboard-workflow/);

console.log("Accessibility and keyboard workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
