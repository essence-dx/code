import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createProject } from "../src/lib/editor/factory";
import { snapTime } from "../src/lib/editor/timeline";
import { createTimelineRulerTicks } from "../src/lib/editor/timeline-ruler";
import { syncedProjectPayloadSchema } from "../src/lib/projects/project-sync-schema";

const project = createProject("Timeline precision check", "16:9");

assert.equal(project.snapInterval, 0.25);
assert.equal(project.rippleMode, false);
assert.equal(snapTime(1.13, true, 0.5), 1);
assert.equal(snapTime(1.26, true, 0.5), 1.5);

assert.equal(syncedProjectPayloadSchema.safeParse({ project: { ...project, snapInterval: 0.1, rippleMode: true }, mediaAssets: [] }).success, true);
assert.equal(syncedProjectPayloadSchema.safeParse({ project: { ...project, snapInterval: 0.01 }, mediaAssets: [] }).success, false);

const ticks = createTimelineRulerTicks(30, 720);
assert.equal(ticks[0]?.time, 0);
assert.equal(ticks.at(-1)?.time, 30);
assert.ok(ticks.some((tick) => tick.kind === "major" && tick.time > 0 && tick.time < 30));
assert.ok(ticks.every((tick) => tick.percent >= 0 && tick.percent <= 100));

const projectPlaybackSlice = readFileSync(new URL("../src/features/editor/state/editor-project-playback-slice.ts", import.meta.url), "utf8");
assert.match(projectPlaybackSlice, /setTimelineSnapInterval/);
assert.match(projectPlaybackSlice, /setTimelineRippleMode/);

const store = readFileSync(new URL("../src/features/editor/state/editor-store.ts", import.meta.url), "utf8");
const timelineEditSlice = readFileSync(new URL("../src/features/editor/state/editor-timeline-edit-slice.ts", import.meta.url), "utf8");
assert.match(store, /createEditorTimelineEditSlice\(set, get,/);
assert.match(timelineEditSlice, /alignSelectedLayers/);
assert.match(timelineEditSlice, /distributeSelectedLayerDurations/);
assert.match(timelineEditSlice, /rippleMoveBoundary/);

const panel = readFileSync(new URL("../src/features/editor/components/timeline-panel.tsx", import.meta.url), "utf8");
const commandBar = readFileSync(new URL("../src/features/editor/components/timeline-command-bar.tsx", import.meta.url), "utf8");
const markerRail = readFileSync(new URL("../src/features/editor/components/timeline-marker-rail.tsx", import.meta.url), "utf8");
const trackList = readFileSync(new URL("../src/features/editor/components/timeline-track-list.tsx", import.meta.url), "utf8");
const timelineDrag = readFileSync(new URL("../src/features/editor/hooks/use-timeline-drag.ts", import.meta.url), "utf8");
assert.match(panel, /TimelineRuler/);
assert.match(panel, /TimelineCommandBar/);
assert.match(panel, /TimelineMarkerRail/);
assert.match(panel, /TimelineTrackList/);
assert.match(commandBar, /TimelineMarkerNavigation/);
assert.match(commandBar, /TimelineAlignmentControls/);
assert.match(commandBar, /TimelineDurationControls/);
assert.match(commandBar, /TimelineRippleToggle/);
assert.match(markerRail, /currentTime \/ safeDuration/);
assert.match(markerRail, /onSelectMarker\(marker\)/);
assert.match(trackList, /WaveformBars/);
assert.match(trackList, /getTrackLaneSummary/);
assert.match(timelineDrag, /beginTimelineDrag/);
assert.match(timelineDrag, /trim-start/);

console.log("Timeline precision workflow checks passed.");
