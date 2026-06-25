"use client";

import type { CSSProperties, MutableRefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChromaKeyPreviewMedia } from "@/features/editor/components/chroma-key-preview-media";
import { useEditorStore } from "@/features/editor/state/editor-store";
import type { MediaAsset, SubtitleCue, TimelineLayer } from "@/lib/editor/types";
import { layerAudioGainAtTime } from "@/lib/audio/mix";
import { formatTime } from "@/lib/editor/factory";
import { hasCanvasMediaEffects } from "@/lib/editor/chroma-key";
import { hasActiveCrop, mediaObjectFit, normalizeLayerCrop } from "@/lib/editor/framing";
import { transformScaleForFlips } from "@/lib/editor/motion";
import { keyframedLayerOpacity } from "@/lib/editor/keyframes";
import { layerPlaybackRateAtProjectTime, layerRequiresTimelineSeeking, layerSourceTimeAtProjectTime, normalizeLayerSpeed } from "@/lib/editor/speed";
import { preferredSocialFormatForCanvas, type SocialSafeZoneInsets } from "@/lib/editor/social-format-presets";
import { trackedLayerTransform } from "@/lib/editor/tracking";
import { layerTransitionFrame, transitionClipPath } from "@/lib/editor/transitions";
import { normalizeLayerVisualStyle, visualEffectsBoxShadow, visualEffectsFilter } from "@/lib/editor/visual-effects";

export function PreviewCanvas() {
  const project = useEditorStore((state) => state.project);
  const mediaAssets = useEditorStore((state) => state.mediaAssets);
  const currentTime = useEditorStore((state) => state.currentTime);
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);
  const showSafeZones = useEditorStore((state) => state.showSafeZones);
  const selectLayer = useEditorStore((state) => state.selectLayer);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const activeLayers = useMemo(
    () =>
      project.layers
        .filter((layer) => !layer.hidden && currentTime >= layer.start && currentTime <= layer.start + layer.duration)
        .sort((a, b) => a.track - b.track),
    [currentTime, project.layers],
  );

  return (
    <section
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/20 p-4 md:p-6"
      data-editor-region="preview-stage"
      tabIndex={-1}
    >
      <div
        className="relative max-h-[min(100%,72vh)] max-w-full overflow-hidden rounded-md border border-border bg-background shadow-2xl"
        style={{ aspectRatio: `${project.width}/${project.height}`, width: "min(100%, 1040px)" }}
        onPointerLeave={() => setHoveredLayerId(null)}
      >
        <div className="absolute inset-0" style={{ background: project.background }} />
        {activeLayers.map((layer) => (
          <LayerPreview
            key={layer.id}
            layer={layer}
            asset={mediaAssets.find((asset) => asset.id === layer.assetId)}
            currentTime={currentTime}
            projectLayers={project.layers}
            projectSize={{ width: project.width, height: project.height }}
            isPlaying={isPlaying}
            selected={selectedLayerId === layer.id}
            hovered={hoveredLayerId === layer.id}
            onSelect={() => selectLayer(layer.id)}
            onHover={() => setHoveredLayerId(layer.id)}
          />
        ))}
        {activeLayers.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">00:00 canvas</div>
        ) : null}
        {showSafeZones ? (
          <SafeZoneOverlay aspectRatio={project.aspectRatio} socialFormatId={project.socialFormatId} width={project.width} height={project.height} />
        ) : null}
      </div>
    </section>
  );
}

function SafeZoneOverlay({
  aspectRatio,
  socialFormatId,
  width,
  height,
}: {
  aspectRatio: string;
  socialFormatId?: string;
  width: number;
  height: number;
}) {
  const safeZones = preferredSocialFormatForCanvas({ aspectRatio, socialFormatId, width, height }).safeZones;

  return (
    <div className="pointer-events-none absolute inset-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      <div className="absolute border border-dashed border-border" style={safeZoneInsetStyle(safeZones.action.insets)}>
        <span className="absolute left-2 top-2 rounded-sm bg-background/80 px-1.5 py-0.5 text-foreground">{safeZones.action.label}</span>
      </div>
      <div className="absolute border border-dashed border-primary/60" style={safeZoneInsetStyle(safeZones.title.insets)}>
        <span className="absolute right-2 top-2 rounded-sm bg-background/80 px-1.5 py-0.5 text-primary">{safeZones.title.label}</span>
      </div>
      <div className="absolute left-1/3 top-0 h-full border-l border-border/60" />
      <div className="absolute left-2/3 top-0 h-full border-l border-border/60" />
      <div className="absolute left-0 top-1/3 w-full border-t border-border/60" />
      <div className="absolute left-0 top-2/3 w-full border-t border-border/60" />
    </div>
  );
}

function safeZoneInsetStyle(insets: SocialSafeZoneInsets) {
  return {
    top: `${insets.top * 100}%`,
    right: `${insets.right * 100}%`,
    bottom: `${insets.bottom * 100}%`,
    left: `${insets.left * 100}%`,
  };
}

function LayerPreview({
  layer,
  asset,
  currentTime,
  projectLayers,
  projectSize,
  isPlaying,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  layer: TimelineLayer;
  asset?: MediaAsset;
  currentTime: number;
  projectLayers: TimelineLayer[];
  projectSize: { width: number; height: number };
  isPlaying: boolean;
  selected: boolean;
  hovered: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const assetUrl = asset?.objectUrl;
  const localTime = Math.max(0, layerSourceTimeAtProjectTime(layer, currentTime));
  const transform = trackedLayerTransform(layer, projectLayers, currentTime, projectSize);
  const transformScale = transformScaleForFlips(transform);
  const transitionFrame = layerTransitionFrame(layer, currentTime);
  const visualStyle = { ...normalizeLayerVisualStyle(layer.style), opacity: keyframedLayerOpacity(layer, currentTime) };
  const style = {
    left: `${transform.x * 100}%`,
    top: `${transform.y * 100}%`,
    width: `${transform.width}px`,
    height: `${transform.height}px`,
    opacity: visualStyle.opacity * transitionFrame.opacity,
    transform: `translate(-50%, -50%) translate(${transitionFrame.offsetXRatio * transform.width}px, ${transitionFrame.offsetYRatio * transform.height}px) rotate(${transform.rotation}deg) scale(${transformScale.scaleX * transitionFrame.scale}, ${transformScale.scaleY * transitionFrame.scale})`,
    clipPath: transitionClipPath(transitionFrame.clip),
    filter: visualEffectsFilter(visualStyle),
    border: visualStyle.borderWidth ? `${visualStyle.borderWidth}px solid ${visualStyle.stroke}` : undefined,
    boxShadow: visualEffectsBoxShadow(visualStyle),
    boxSizing: "border-box",
  } satisfies CSSProperties;

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !assetUrl || (layer.kind !== "video" && layer.kind !== "audio")) return;

    const speed = normalizeLayerSpeed(layer.speed, layer.playbackRate);
    const needsTimelineSeeking = layerRequiresTimelineSeeking(layer);
    media.playbackRate = layerPlaybackRateAtProjectTime(layer, currentTime);
    (media as HTMLMediaElement & { preservesPitch?: boolean }).preservesPitch = speed.preservePitch;
    media.muted = layer.muted;
    media.volume = layerAudioGainAtTime(layer, currentTime);

    const targetTime = Number.isFinite(media.duration) ? Math.min(localTime, media.duration) : localTime;
    const seekTolerance = needsTimelineSeeking ? 0.04 : 0.2;
    if (Number.isFinite(targetTime) && Math.abs(media.currentTime - targetTime) > seekTolerance) {
      try {
        media.currentTime = Math.max(0, targetTime);
      } catch {
        // Some codecs reject seeks until metadata is ready. The next clock tick will retry.
      }
    }

    if (isPlaying && !speed.reversed) {
      void media.play().catch(() => undefined);
      return;
    }

    media.pause();
  }, [assetUrl, currentTime, isPlaying, layer, localTime]);

  return (
    <button
      type="button"
      className={`absolute overflow-hidden rounded-[var(--layer-radius)] border text-left outline-none transition-[border-color,box-shadow,filter] ${layerCursorClassName(layer)} ${
        selected
          ? "border-primary ring-2 ring-primary/40"
          : hovered
            ? "border-primary/80 ring-2 ring-primary/20"
            : "border-transparent"
      }`}
      style={{ ...style, ["--layer-radius" as string]: `${layer.style.radius}px` }}
      aria-label={`${layer.name} layer`}
      aria-pressed={selected}
      title={layer.name}
      onPointerEnter={onHover}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onClick={onSelect}
    >
      {isMissingMedia(layer, asset) ? (
        <MissingMediaLayer name={asset?.name ?? layer.name} />
      ) : (
        <LayerContent layer={layer} assetUrl={assetUrl} localTime={localTime} isPlaying={isPlaying} mediaRef={mediaRef} />
      )}
    </button>
  );
}

function MissingMediaLayer({ name }: { name: string }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-1 bg-destructive/10 px-3 text-center text-xs font-medium text-destructive">
      <span className="line-clamp-2">{name}</span>
      <span className="text-[10px] uppercase tracking-wide text-destructive/80">Reconnect media</span>
    </div>
  );
}

function LayerContent({
  layer,
  assetUrl,
  localTime,
  isPlaying,
  mediaRef,
}: {
  layer: TimelineLayer;
  assetUrl: string | undefined;
  localTime: number;
  isPlaying: boolean;
  mediaRef: MutableRefObject<HTMLMediaElement | null>;
}) {
  if ((layer.kind === "video" || layer.kind === "image") && assetUrl && hasCanvasMediaEffects(layer)) {
    return <ChromaKeyPreviewMedia layer={layer} assetUrl={assetUrl} localTime={localTime} isPlaying={isPlaying} mediaRef={mediaRef} />;
  }

  if (layer.kind === "video" && assetUrl) {
    return (
      <video
        ref={(node) => {
          mediaRef.current = node;
        }}
        src={assetUrl}
        className={mediaElementClassName(layer)}
        style={mediaElementStyle(layer)}
        muted={layer.muted}
        playsInline
        preload="metadata"
      />
    );
  }

  if (layer.kind === "image" && assetUrl) {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={assetUrl} alt={layer.name} className={mediaElementClassName(layer)} style={mediaElementStyle(layer)} />;
  }

  if (layer.kind === "audio") {
    return (
      <>
        {assetUrl ? (
          <audio
            ref={(node) => {
              mediaRef.current = node;
            }}
            src={assetUrl}
            muted={layer.muted}
            preload="metadata"
          />
        ) : null}
        <div className="flex size-full items-center justify-center bg-muted text-sm font-medium text-muted-foreground">
          {layer.muted ? "Muted audio" : "Audio"}
        </div>
      </>
    );
  }

  if (layer.kind === "subtitle") {
    const text = activeCueText(layer.cues, localTime) ?? "Caption";
    return (
      <div
        className="flex size-full items-center justify-center px-4 text-center"
        style={{
          color: layer.style.fill,
          background: layer.style.background,
          fontFamily: layer.style.fontFamily,
          fontSize: layer.style.fontSize,
          fontWeight: layer.style.fontWeight,
        }}
      >
        {text}
      </div>
    );
  }

  if (layer.kind === "shape") {
    return <div className="size-full" style={{ background: layer.style.background || layer.style.fill }} />;
  }

  if (layer.kind === "progress") {
    return <ProgressOverlay layer={layer} localTime={localTime} />;
  }

  if (layer.kind === "timer") {
    return <TimerOverlay layer={layer} localTime={localTime} />;
  }

  return (
    <div
      className="flex size-full items-center justify-center px-4 text-center"
      style={{
        color: layer.style.fill,
        background: layer.style.background,
        fontFamily: layer.style.fontFamily,
        fontSize: layer.style.fontSize,
        fontWeight: layer.style.fontWeight,
      }}
    >
      {layer.text ?? layer.name}
    </div>
  );
}

function ProgressOverlay({ layer, localTime }: { layer: TimelineLayer; localTime: number }) {
  const progress = layer.duration > 0 ? Math.min(1, Math.max(0, localTime / layer.duration)) : 0;

  return (
    <div className="flex size-full items-center" style={{ background: layer.style.background }}>
      <div
        className="h-full"
        style={{
          width: `${progress * 100}%`,
          background: layer.style.fill,
          borderRadius: layer.style.radius,
        }}
      />
    </div>
  );
}

function TimerOverlay({ layer, localTime }: { layer: TimelineLayer; localTime: number }) {
  const seconds = layer.text === "elapsed" ? localTime : layer.duration - localTime;

  return (
    <div
      className="flex size-full items-center justify-center px-3 text-center"
      style={{
        color: layer.style.fill,
        background: layer.style.background,
        fontFamily: layer.style.fontFamily,
        fontSize: layer.style.fontSize,
        fontWeight: layer.style.fontWeight,
      }}
    >
      {formatTime(seconds)}
    </div>
  );
}

function activeCueText(cues: SubtitleCue[] | undefined, localTime: number) {
  return cues?.find((cue) => localTime >= cue.start && localTime <= cue.end)?.text;
}

function mediaElementClassName(layer: TimelineLayer) {
  return hasActiveCrop(layer.transform.crop) ? "absolute" : "size-full";
}

function mediaElementStyle(layer: TimelineLayer): CSSProperties {
  const crop = normalizeLayerCrop(layer.transform.crop);
  const cropped = hasActiveCrop(layer.transform.crop);

  return {
    objectFit: mediaObjectFit(layer.transform),
    ...(cropped
      ? {
          left: `${-(crop.x / crop.width) * 100}%`,
          top: `${-(crop.y / crop.height) * 100}%`,
          width: `${100 / crop.width}%`,
          height: `${100 / crop.height}%`,
        }
      : undefined),
  };
}

function isMissingMedia(layer: TimelineLayer, asset?: MediaAsset) {
  return ["audio", "image", "video"].includes(layer.kind) && Boolean(layer.assetId) && !asset?.objectUrl;
}

function layerCursorClassName(layer: TimelineLayer) {
  if (layer.locked) return "cursor-not-allowed";
  if (layer.kind === "text" || layer.kind === "subtitle" || layer.kind === "timer") return "cursor-text";
  return "cursor-grab active:cursor-grabbing";
}
