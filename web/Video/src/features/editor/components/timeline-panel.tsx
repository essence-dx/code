"use client";

import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditorStore } from "@/features/editor/state/editor-store";
import type { MediaAsset, TimelineLayer } from "@/lib/editor/types";
import { TimelineCommandBar, type TimelineFilter } from "@/features/editor/components/timeline-command-bar";
import { TimelineMarkerRail } from "@/features/editor/components/timeline-marker-rail";
import { TimelineRuler } from "@/features/editor/components/timeline-ruler";
import { TimelineTrackList, getLayerLaneKind, trackLaneMetadata } from "@/features/editor/components/timeline-track-list";
import { useTimelineDrag } from "@/features/editor/hooks/use-timeline-drag";

const BASE_TIMELINE_WIDTH = 720;
const TIMELINE_LABEL_WIDTH = 72;
const TIMELINE_GAP = 8;
const TIMELINE_PADDING = 12;
const MIN_TIMELINE_ZOOM = 0.75;
const MAX_TIMELINE_ZOOM = 3;
const MIN_TRACK_HEIGHT = 32;
const MAX_TRACK_HEIGHT = 72;

export function TimelinePanel() {
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [trackHeight, setTrackHeight] = useState(40);
  const [timelineQuery, setTimelineQuery] = useState("");
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const project = useEditorStore((state) => state.project);
  const mediaAssets = useEditorStore((state) => state.mediaAssets);
  const currentTime = useEditorStore((state) => state.currentTime);
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);
  const setTimelineSnapInterval = useEditorStore((state) => state.setTimelineSnapInterval);
  const setTimelineRippleMode = useEditorStore((state) => state.setTimelineRippleMode);
  const addTimelineMarker = useEditorStore((state) => state.addTimelineMarker);
  const updateTimelineMarker = useEditorStore((state) => state.updateTimelineMarker);
  const removeTimelineMarker = useEditorStore((state) => state.removeTimelineMarker);
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const togglePlayback = useEditorStore((state) => state.togglePlayback);
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds);
  const selectLayer = useEditorStore((state) => state.selectLayer);
  const selectLayerRange = useEditorStore((state) => state.selectLayerRange);
  const splitSelectedLayers = useEditorStore((state) => state.splitSelectedLayers);
  const updateSelectedLayerTiming = useEditorStore((state) => state.updateSelectedLayerTiming);
  const alignSelectedLayers = useEditorStore((state) => state.alignSelectedLayers);
  const distributeSelectedLayerDurations = useEditorStore((state) => state.distributeSelectedLayerDurations);
  const pushHistorySnapshot = useEditorStore((state) => state.pushHistorySnapshot);
  const assetById = useMemo(() => new Map(mediaAssets.map((asset) => [asset.id, asset])), [mediaAssets]);
  const visibleLayers = useMemo(
    () => filterTimelineLayers(project.layers, assetById, timelineQuery, timelineFilter),
    [assetById, project.layers, timelineFilter, timelineQuery],
  );
  const tracks = groupTracks(visibleLayers);
  const markers = useMemo(() => project.markers ?? [], [project.markers]);
  const sortedMarkers = useMemo(() => [...markers].sort((a, b) => a.time - b.time), [markers]);
  const snapInterval = project.snapInterval ?? 0.25;
  const selectedMarker = markers.find((marker) => marker.id === selectedMarkerId) ?? null;
  const timelineWidth = Math.round(BASE_TIMELINE_WIDTH * timelineZoom);
  const timelineLeft = TIMELINE_PADDING + TIMELINE_LABEL_WIDTH + TIMELINE_GAP;
  const timelineMinWidth = timelineLeft + timelineWidth + TIMELINE_PADDING;
  const layerHeight = Math.max(24, trackHeight - 8);
  const layerTop = Math.max(4, (trackHeight - layerHeight) / 2);
  const trackStep = trackHeight + 8;
  const canSplitSelection = project.layers.some(
    (layer) => selectedLayerIds.includes(layer.id) && !layer.locked && currentTime > layer.start && currentTime < layer.start + layer.duration,
  );
  const canAlignSelection = project.layers.some((layer) => selectedLayerIds.includes(layer.id) && !layer.locked);
  const canDistributeSelection = project.layers.filter((layer) => selectedLayerIds.includes(layer.id) && !layer.locked).length >= 2;
  const { beginTimelineDrag, updateTimelineDrag, endTimelineDrag } = useTimelineDrag({
    projectDuration: project.duration,
    snapInterval,
    trackStep,
    onSelectLayer: selectTimelineLayer,
    onPushHistorySnapshot: pushHistorySnapshot,
    onUpdateLayerTiming: updateSelectedLayerTiming,
  });

  function selectTimelineLayer(event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }, layerId: string) {
    if (event.shiftKey) {
      selectLayerRange(layerId);
      return;
    }

    selectLayer(layerId, event.ctrlKey || event.metaKey);
  }

  function addMarker() {
    const marker = addTimelineMarker(currentTime);
    setSelectedMarkerId(marker.id);
  }

  function removeMarker(markerId: string) {
    removeTimelineMarker(markerId);
    setSelectedMarkerId((current) => (current === markerId ? null : current));
  }

  function goToTimelineMarker(direction: -1 | 1) {
    if (!sortedMarkers.length) return;

    const marker =
      direction < 0
        ? [...sortedMarkers].reverse().find((item) => item.time < currentTime - 0.001) ?? sortedMarkers.at(-1)
        : sortedMarkers.find((item) => item.time > currentTime + 0.001) ?? sortedMarkers[0];
    if (!marker) return;

    setSelectedMarkerId(marker.id);
    setCurrentTime(marker.time);
  }

  return (
    <section className="h-[260px] border-t border-border bg-card" aria-label="Timeline editor">
      <TimelineCommandBar
        isPlaying={isPlaying}
        canSplitSelection={canSplitSelection}
        canAlignSelection={canAlignSelection}
        canDistributeSelection={canDistributeSelection}
        sortedMarkersLength={sortedMarkers.length}
        selectedMarker={selectedMarker}
        timelineQuery={timelineQuery}
        timelineFilter={timelineFilter}
        timelineZoom={timelineZoom}
        minTimelineZoom={MIN_TIMELINE_ZOOM}
        maxTimelineZoom={MAX_TIMELINE_ZOOM}
        trackHeight={trackHeight}
        minTrackHeight={MIN_TRACK_HEIGHT}
        maxTrackHeight={MAX_TRACK_HEIGHT}
        currentTime={currentTime}
        projectDuration={project.duration}
        snapInterval={snapInterval}
        rippleMode={Boolean(project.rippleMode)}
        onTogglePlayback={togglePlayback}
        onSplitSelectedLayers={splitSelectedLayers}
        onAddMarker={addMarker}
        onGoToMarker={goToTimelineMarker}
        onAlignSelectedLayers={alignSelectedLayers}
        onDistributeSelectedLayerDurations={distributeSelectedLayerDurations}
        onUpdateMarker={updateTimelineMarker}
        onRemoveMarker={removeMarker}
        onTimelineQueryChange={setTimelineQuery}
        onTimelineFilterChange={setTimelineFilter}
        onTimelineZoomChange={setTimelineZoom}
        onTrackHeightChange={setTrackHeight}
        onCurrentTimeChange={setCurrentTime}
        onSnapIntervalChange={setTimelineSnapInterval}
        onRippleModeChange={setTimelineRippleMode}
      />
      <ScrollArea className="h-[208px]" role="region" aria-label="Timeline tracks">
        <div className="relative p-3" style={{ minWidth: timelineMinWidth }}>
          <TimelineRuler duration={project.duration} labelWidth={TIMELINE_LABEL_WIDTH} width={timelineWidth} />
          <TimelineMarkerRail
            markers={markers}
            selectedMarkerId={selectedMarkerId}
            currentTime={currentTime}
            duration={project.duration}
            timelineLeft={timelineLeft}
            timelineWidth={timelineWidth}
            labelWidth={TIMELINE_LABEL_WIDTH}
            onSelectMarker={(marker) => {
              setSelectedMarkerId(marker.id);
              setCurrentTime(marker.time);
            }}
          />
          {project.layers.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground" role="status">
              Add media, text, captions, or shapes.
            </div>
          ) : null}
          {project.layers.length > 0 && tracks.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground" role="status">
              No layers match the current timeline filter.
            </div>
          ) : null}
          <TimelineTrackList
            tracks={tracks}
            assetById={assetById}
            selectedLayerIds={selectedLayerIds}
            duration={project.duration}
            timelineWidth={timelineWidth}
            labelWidth={TIMELINE_LABEL_WIDTH}
            trackHeight={trackHeight}
            layerHeight={layerHeight}
            layerTop={layerTop}
            onSelectTimelineLayer={selectTimelineLayer}
            onBeginDrag={beginTimelineDrag}
            onUpdateDrag={updateTimelineDrag}
            onEndDrag={endTimelineDrag}
          />
        </div>
      </ScrollArea>
    </section>
  );
}

function groupTracks(layers: TimelineLayer[]) {
  const grouped = new Map<number, TimelineLayer[]>();
  for (const layer of layers) {
    grouped.set(layer.track, [...(grouped.get(layer.track) ?? []), layer]);
  }
  return [...grouped.entries()].sort(([a], [b]) => a - b);
}

function filterTimelineLayers(
  layers: TimelineLayer[],
  assetById: Map<string, MediaAsset>,
  rawQuery: string,
  filter: TimelineFilter,
) {
  const query = rawQuery.trim().toLowerCase();

  return layers.filter((layer) => {
    const asset = layer.assetId ? assetById.get(layer.assetId) : undefined;
    if (filter === "grouped" && !layer.groupId) return false;
    if (filter === "missing" && (!layer.assetId || asset?.objectUrl)) return false;
    if (filter === "media" && !["video", "image", "audio"].includes(layer.kind)) return false;
    if (filter === "text" && ["video", "image", "audio"].includes(layer.kind)) return false;
    if (filter === "review" && (!layer.reviewStatus || layer.reviewStatus === "none")) return false;
    if (filter === "notes" && !layer.notes?.trim()) return false;
    if (!query) return true;

    return searchableLayerText(layer, asset).includes(query);
  });
}

function searchableLayerText(
  layer: TimelineLayer,
  asset: MediaAsset | undefined,
) {
  return [
    layer.name,
    layer.kind,
    trackLaneMetadata[getLayerLaneKind(layer)].label,
    layer.notes ?? "",
    layer.reviewStatus ?? "",
    layer.groupId ? "group grouped" : "",
    asset?.name ?? "",
    asset?.source ?? "",
    asset && !asset.objectUrl ? "missing" : "",
  ]
    .join(" ")
    .toLowerCase();
}
