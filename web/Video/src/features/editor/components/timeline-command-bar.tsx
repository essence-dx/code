"use client";

import { Flag, Maximize2, Pause, Play, Rows3, Scissors, Search, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { TimelineAlignmentControls } from "@/features/editor/components/timeline-alignment-controls";
import { TimelineDurationControls } from "@/features/editor/components/timeline-duration-controls";
import { TimelineMarkerNavigation } from "@/features/editor/components/timeline-marker-navigation";
import { TimelineRippleToggle } from "@/features/editor/components/timeline-ripple-toggle";
import { formatTime } from "@/lib/editor/factory";
import type { TimelineAlignmentMode, TimelineDurationDistributionMode, TimelineMarker } from "@/lib/editor/types";

export type TimelineFilter = "all" | "grouped" | "missing" | "media" | "text" | "review" | "notes";

const timelineSnapIntervals = [0.05, 0.1, 0.25, 0.5, 1, 2];
const timelineFilters: Array<{ value: TimelineFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "grouped", label: "Groups" },
  { value: "missing", label: "Missing" },
  { value: "media", label: "Media" },
  { value: "text", label: "Text" },
  { value: "review", label: "Review" },
  { value: "notes", label: "Notes" },
];

type TimelineCommandBarProps = {
  isPlaying: boolean;
  canSplitSelection: boolean;
  canAlignSelection: boolean;
  canDistributeSelection: boolean;
  sortedMarkersLength: number;
  selectedMarker: TimelineMarker | null;
  timelineQuery: string;
  timelineFilter: TimelineFilter;
  timelineZoom: number;
  minTimelineZoom: number;
  maxTimelineZoom: number;
  trackHeight: number;
  minTrackHeight: number;
  maxTrackHeight: number;
  currentTime: number;
  projectDuration: number;
  snapInterval: number;
  rippleMode: boolean;
  onTogglePlayback: () => void;
  onSplitSelectedLayers: () => void;
  onAddMarker: () => void;
  onGoToMarker: (direction: -1 | 1) => void;
  onAlignSelectedLayers: (mode: TimelineAlignmentMode) => number;
  onDistributeSelectedLayerDurations: (mode: TimelineDurationDistributionMode) => number;
  onUpdateMarker: (markerId: string, patch: Partial<Pick<TimelineMarker, "time" | "label" | "color">>) => void;
  onRemoveMarker: (markerId: string) => void;
  onTimelineQueryChange: (query: string) => void;
  onTimelineFilterChange: (filter: TimelineFilter) => void;
  onTimelineZoomChange: (nextZoom: number) => void;
  onTrackHeightChange: (nextHeight: number) => void;
  onCurrentTimeChange: (time: number) => void;
  onSnapIntervalChange: (seconds: number) => void;
  onRippleModeChange: (enabled: boolean) => void;
};

export function TimelineCommandBar({
  isPlaying,
  canSplitSelection,
  canAlignSelection,
  canDistributeSelection,
  sortedMarkersLength,
  selectedMarker,
  timelineQuery,
  timelineFilter,
  timelineZoom,
  minTimelineZoom,
  maxTimelineZoom,
  trackHeight,
  minTrackHeight,
  maxTrackHeight,
  currentTime,
  projectDuration,
  snapInterval,
  rippleMode,
  onTogglePlayback,
  onSplitSelectedLayers,
  onAddMarker,
  onGoToMarker,
  onAlignSelectedLayers,
  onDistributeSelectedLayerDurations,
  onUpdateMarker,
  onRemoveMarker,
  onTimelineQueryChange,
  onTimelineFilterChange,
  onTimelineZoomChange,
  onTrackHeightChange,
  onCurrentTimeChange,
  onSnapIntervalChange,
  onRippleModeChange,
}: TimelineCommandBarProps) {
  return (
    <div className="flex h-12 items-center gap-3 border-b border-border px-3">
      <Button size="icon" variant="outline" onClick={onTogglePlayback} aria-label={isPlaying ? "Pause" : "Play"}>
        {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
      </Button>
      <Button size="sm" variant="outline" onClick={onSplitSelectedLayers} disabled={!canSplitSelection}>
        <Scissors className="size-4" />
        Split
      </Button>
      <Button size="sm" variant="outline" onClick={onAddMarker}>
        <Flag className="size-4" />
        Marker
      </Button>
      <TimelineMarkerNavigation
        disabled={sortedMarkersLength === 0}
        onPrevious={() => onGoToMarker(-1)}
        onNext={() => onGoToMarker(1)}
      />
      <TimelineAlignmentControls disabled={!canAlignSelection} onAlign={onAlignSelectedLayers} />
      <TimelineDurationControls disabled={!canDistributeSelection} onDistribute={onDistributeSelectedLayerDurations} />
      {selectedMarker ? (
        <div className="hidden min-w-0 items-center gap-1 2xl:flex">
          <Input
            className="h-8 w-28"
            value={selectedMarker.label}
            onChange={(event) => onUpdateMarker(selectedMarker.id, { label: event.target.value })}
            aria-label="Marker label"
          />
          <Input
            className="h-8 w-20"
            type="number"
            min={0}
            max={projectDuration}
            step={0.05}
            value={selectedMarker.time}
            onChange={(event) => onUpdateMarker(selectedMarker.id, { time: event.currentTarget.valueAsNumber })}
            aria-label="Marker time"
          />
          <Input
            className="h-8 w-10 p-1"
            type="color"
            value={selectedMarker.color}
            onChange={(event) => onUpdateMarker(selectedMarker.id, { color: event.target.value })}
            aria-label="Marker color"
          />
          <Button size="icon" variant="ghost" onClick={() => onRemoveMarker(selectedMarker.id)} aria-label="Remove marker">
            <Trash2 className="size-4" />
          </Button>
        </div>
      ) : null}
      <div className="hidden min-w-44 items-center gap-1 xl:flex">
        <Search className="size-4 text-muted-foreground" />
        <Input
          className="h-8 w-36"
          value={timelineQuery}
          onChange={(event) => onTimelineQueryChange(event.target.value)}
          placeholder="Find layers"
          aria-label="Find layers"
        />
      </div>
      <div className="hidden items-center gap-1 2xl:flex">
        {timelineFilters.map((filter) => (
          <Button
            key={filter.value}
            size="sm"
            variant={timelineFilter === filter.value ? "default" : "outline"}
            className="h-8 px-2 text-xs"
            onClick={() => onTimelineFilterChange(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>
      <div className="hidden items-center gap-1 lg:flex">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onTimelineZoomChange(Math.max(minTimelineZoom, timelineZoom - 0.25))}
          disabled={timelineZoom <= minTimelineZoom}
          aria-label="Zoom out"
        >
          <ZoomOut className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => onTimelineZoomChange(1)} aria-label="Fit timeline">
          <Maximize2 className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onTimelineZoomChange(Math.min(maxTimelineZoom, timelineZoom + 0.25))}
          disabled={timelineZoom >= maxTimelineZoom}
          aria-label="Zoom in"
        >
          <ZoomIn className="size-4" />
        </Button>
        <Badge variant="outline">{Math.round(timelineZoom * 100)}%</Badge>
      </div>
      <div className="hidden min-w-28 items-center gap-2 xl:flex">
        <Rows3 className="size-4 text-muted-foreground" />
        <Slider
          className="w-20"
          value={[trackHeight]}
          min={minTrackHeight}
          max={maxTrackHeight}
          step={4}
          onValueChange={([value]) => onTrackHeightChange(value ?? 40)}
          aria-label="Track height"
        />
      </div>
      <div className="w-24 font-mono text-sm">{formatTime(currentTime)}</div>
      <Slider
        className="flex-1"
        value={[currentTime]}
        min={0}
        max={Math.max(projectDuration, 1)}
        step={0.05}
        onValueChange={([value]) => onCurrentTimeChange(value ?? 0)}
      />
      <Badge variant="secondary">{projectDuration.toFixed(1)}s</Badge>
      <Select value={String(snapInterval)} onValueChange={(value) => onSnapIntervalChange(Number(value))}>
        <SelectTrigger className="h-8 w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {timelineSnapIntervals.map((interval) => (
            <SelectItem key={interval} value={String(interval)}>
              Snap {interval}s
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <TimelineRippleToggle enabled={rippleMode} onEnabledChange={onRippleModeChange} />
    </div>
  );
}
