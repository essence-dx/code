"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { InspectorCaptionSection } from "@/features/editor/components/inspector-caption-section";
import { InspectorLayerHeader } from "@/features/editor/components/inspector-layer-header";
import { InspectorLayerReviewSection } from "@/features/editor/components/inspector-layer-review-section";
import { InspectorLayerStatusSection } from "@/features/editor/components/inspector-layer-status-section";
import { InspectorMediaSection } from "@/features/editor/components/inspector-media-section";
import { InspectorMotionEffectsSection } from "@/features/editor/components/inspector-motion-effects-section";
import { InspectorTextSection } from "@/features/editor/components/inspector-text-section";
import { InspectorTimingSection } from "@/features/editor/components/inspector-timing-section";
import { ProjectReviewQueue } from "@/features/editor/components/project-review-queue";
import { useEditorStore } from "@/features/editor/state/editor-store";
import type { LayerStyle, LayerTransform } from "@/lib/editor/types";

export function InspectorPanel() {
  const project = useEditorStore((state) => state.project);
  const mediaAssets = useEditorStore((state) => state.mediaAssets);
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds);
  const currentTime = useEditorStore((state) => state.currentTime);
  const selectLayer = useEditorStore((state) => state.selectLayer);
  const updateLayer = useEditorStore((state) => state.updateLayer);
  const updateSelectedLayersBounds = useEditorStore((state) => state.updateSelectedLayersBounds);
  const removeSelectedLayers = useEditorStore((state) => state.removeSelectedLayers);
  const duplicateSelectedLayers = useEditorStore((state) => state.duplicateSelectedLayers);
  const isolateSelectedLayers = useEditorStore((state) => state.isolateSelectedLayers);
  const showAllLayers = useEditorStore((state) => state.showAllLayers);
  const setSelectedLayersHidden = useEditorStore((state) => state.setSelectedLayersHidden);
  const setSelectedLayersLocked = useEditorStore((state) => state.setSelectedLayersLocked);
  const groupSelectedLayers = useEditorStore((state) => state.groupSelectedLayers);
  const ungroupSelectedLayers = useEditorStore((state) => state.ungroupSelectedLayers);
  const selectLayerGroup = useEditorStore((state) => state.selectLayerGroup);
  const moveLayerTrack = useEditorStore((state) => state.moveLayerTrack);
  const centerSelectedLayers = useEditorStore((state) => state.centerSelectedLayers);
  const fitSelectedLayersToCanvas = useEditorStore((state) => state.fitSelectedLayersToCanvas);
  const addBlurredBackgroundForSelectedMediaLayers = useEditorStore((state) => state.addBlurredBackgroundForSelectedMediaLayers);
  const extractAudioFromSelectedVideoLayers = useEditorStore((state) => state.extractAudioFromSelectedVideoLayers);
  const replaceSelectedVideoAudio = useEditorStore((state) => state.replaceSelectedVideoAudio);
  const createFreezeFramesFromSelectedVideoLayers = useEditorStore((state) => state.createFreezeFramesFromSelectedVideoLayers);
  const layer = project.layers.find((item) => item.id === selectedLayerId);
  const selectedLayers = selectedLayerIds.length ? project.layers.filter((item) => selectedLayerIds.includes(item.id)) : layer ? [layer] : [];
  const editableSelectionCount = selectedLayers.filter((item) => !item.locked).length;
  const hasHiddenLayers = project.layers.some((item) => item.hidden);
  const selectedHasGroup = selectedLayers.some((item) => item.groupId);

  if (!layer) {
    return (
      <ScrollArea className="min-h-0" aria-label="Review queue">
        <section className="p-4" aria-labelledby="review-queue-title">
          <h2 id="review-queue-title" className="text-sm font-medium">
            Review queue
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Layer notes and handoff states.</p>
          <ProjectReviewQueue project={project} mediaAssets={mediaAssets} onSelect={(layerId) => selectLayer(layerId)} />
        </section>
      </ScrollArea>
    );
  }

  const patchTransform = (patch: Partial<LayerTransform>) => updateLayer(layer.id, { transform: { ...layer.transform, ...patch } });
  const patchStyle = (patch: Partial<LayerStyle>) => updateLayer(layer.id, { style: { ...layer.style, ...patch } });
  const layerAsset = layer.assetId ? mediaAssets.find((asset) => asset.id === layer.assetId) : undefined;
  const audioAssets = mediaAssets.filter((asset) => asset.type === "audio");

  return (
    <ScrollArea className="min-h-0" aria-label="Layer inspector">
      <section className="space-y-5 p-4" aria-label={`${layer.name} inspector`}>
        <InspectorLayerHeader
          layer={layer}
          selectedLayers={selectedLayers}
          editableSelectionCount={editableSelectionCount}
          hasHiddenLayers={hasHiddenLayers}
          onIsolateSelectedLayers={isolateSelectedLayers}
          onShowAllLayers={showAllLayers}
          onDuplicateSelectedLayers={duplicateSelectedLayers}
          onRemoveSelectedLayers={removeSelectedLayers}
        />
        <InspectorTextSection layer={layer} onUpdateLayer={updateLayer} />
        {layer.kind === "subtitle" ? <InspectorCaptionSection layer={layer} /> : null}
        <InspectorLayerReviewSection layer={layer} onUpdateLayer={updateLayer} />
        <InspectorTimingSection
          layer={layer}
          selectedLayers={selectedLayers}
          onUpdateLayer={updateLayer}
          onUpdateSelectionBounds={updateSelectedLayersBounds}
        />
        <InspectorMediaSection
          layer={layer}
          asset={layerAsset}
          audioAssets={audioAssets}
          onUpdateLayer={updateLayer}
          onExtractAudio={extractAudioFromSelectedVideoLayers}
          onReplaceAudio={replaceSelectedVideoAudio}
          onCreateFreezeFrames={createFreezeFramesFromSelectedVideoLayers}
        />
        <InspectorMotionEffectsSection
          layer={layer}
          layers={project.layers}
          asset={layerAsset}
          currentTime={currentTime}
          editableSelectionCount={editableSelectionCount}
          onUpdateLayer={updateLayer}
          onPatchTransform={patchTransform}
          onPatchStyle={patchStyle}
          onCenterSelectedLayers={centerSelectedLayers}
          onFitSelectedLayersToCanvas={fitSelectedLayersToCanvas}
          onAddBlurredBackgroundForSelectedMediaLayers={addBlurredBackgroundForSelectedMediaLayers}
        />
        <Separator />
        <InspectorLayerStatusSection
          layer={layer}
          selectedLayers={selectedLayers}
          selectedHasGroup={selectedHasGroup}
          onSetSelectedLayersHidden={setSelectedLayersHidden}
          onSetSelectedLayersLocked={setSelectedLayersLocked}
          onGroupSelectedLayers={groupSelectedLayers}
          onUngroupSelectedLayers={ungroupSelectedLayers}
          onSelectLayerGroup={selectLayerGroup}
          onMoveLayerTrack={moveLayerTrack}
          onUpdateLayer={updateLayer}
        />
      </section>
    </ScrollArea>
  );
}
