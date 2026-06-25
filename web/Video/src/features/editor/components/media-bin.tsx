"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MediaAssetCard } from "@/features/editor/components/media-asset-card";
import { MediaBinBatchActions } from "@/features/editor/components/media-bin-batch-actions";
import { MediaBinCollectionControls } from "@/features/editor/components/media-bin-collection-controls";
import { MediaBinImportControls } from "@/features/editor/components/media-bin-import-controls";
import { MediaBinStatusPanels } from "@/features/editor/components/media-bin-status-panels";
import { SelfHostedMediaImportDialog } from "@/features/editor/components/self-hosted-media-import-dialog";
import { SelfHostedMediaUploadDialog } from "@/features/editor/components/self-hosted-media-upload-dialog";
import { StockAssetBrowser, type StockImportOptions } from "@/features/editor/components/stock-asset-browser";
import type { MediaPanelMessage } from "@/features/editor/components/media-bin-types";
import { useEditorStore } from "@/features/editor/state/editor-store";
import { reconnectBrowserMedia, saveBrowserMedia } from "@/lib/media/browser-media-store";
import { desktopImportFailureMessage, desktopImportResultMessage } from "@/lib/media/desktop-media";
import { importTauriMedia } from "@/lib/media/tauri-media";
import { assertClientApiRuntime, clientApiUrl, isClientApiUnavailableError, useIsDesktopRuntime } from "@/lib/runtime/client-api";
import { RecordingControls, type RecordingResultSettings } from "@/features/editor/components/recording-controls";
import { RecordingTakeReview } from "@/features/editor/components/recording-take-review";
import { CreationPanel } from "@/features/editor/components/creation-panel";
import type { MediaFilter } from "@/features/editor/components/media-filters";
import { recordingLayerOptions, type RecordingMode } from "@/lib/editor/recording-layouts";
import { createMediaHealthReport, summarizeMissingMediaImpact } from "@/lib/media/media-health";
import type { StockAsset } from "@/lib/stock/stock-assets";
import {
  stockAttributionNote,
  stockAudioCollectionName,
  stockAudioLayerName,
  stockAudioLayerPatch,
  stockAudioRoleFromAsset,
} from "@/lib/stock/audio-library";
import {
  createSelfHostedMediaAsset,
  selfHostedMediaImportFailureMessage,
  type SelfHostedMediaImportInput,
} from "@/lib/media/self-hosted-media";
import {
  selfHostedUploadFailureMessage,
  uploadMediaAssetToSelfHostedStorage,
  type SelfHostedMediaUploadInput,
} from "@/lib/media/self-hosted-upload";
import {
  saveSelfHostedUploadHistoryEntry,
  verifySelfHostedUploadPublicUrl,
  type SelfHostedUploadVerificationResult,
} from "@/lib/media/self-hosted-upload-history";

export function MediaBin() {
  const inputRef = useRef<HTMLInputElement>(null);
  const reconnectInputRef = useRef<HTMLInputElement>(null);
  const batchReconnectInputRef = useRef<HTMLInputElement>(null);
  const mediaAssets = useEditorStore((state) => state.mediaAssets);
  const favoriteMediaAssetIds = useEditorStore((state) => state.favoriteMediaAssetIds);
  const project = useEditorStore((state) => state.project);
  const currentTime = useEditorStore((state) => state.currentTime);
  const addMediaAsset = useEditorStore((state) => state.addMediaAsset);
  const toggleFavoriteMediaAsset = useEditorStore((state) => state.toggleFavoriteMediaAsset);
  const createMediaCollection = useEditorStore((state) => state.createMediaCollection);
  const removeMediaCollection = useEditorStore((state) => state.removeMediaCollection);
  const toggleMediaAssetCollection = useEditorStore((state) => state.toggleMediaAssetCollection);
  const removeMediaAsset = useEditorStore((state) => state.removeMediaAsset);
  const restoreLastRemovedMedia = useEditorStore((state) => state.restoreLastRemovedMedia);
  const lastRemovedMedia = useEditorStore((state) => state.lastRemovedMedia);
  const addLayerFromAsset = useEditorStore((state) => state.addLayerFromAsset);
  const [isImporting, setIsImporting] = useState(false);
  const [reconnectAssetId, setReconnectAssetId] = useState<string | null>(null);
  const [mediaMessage, setMediaMessage] = useState<MediaPanelMessage | null>(null);
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [activeCollectionId, setActiveCollectionId] = useState("all");
  const [collectionName, setCollectionName] = useState("");
  const [isSelfHostedImportOpen, setIsSelfHostedImportOpen] = useState(false);
  const [uploadAssetId, setUploadAssetId] = useState<string | null>(null);
  const [renamePrefix, setRenamePrefix] = useState("");
  const canImportDesktopFiles = useIsDesktopRuntime();
  const mediaCollections = project.mediaCollections ?? [];
  const activeCollection = mediaCollections.find((collection) => collection.id === activeCollectionId);
  const recordedTakesCollection = mediaCollections.find((collection) => collection.name.trim().toLowerCase() === "recorded takes");
  const mediaHealth = useMemo(() => createMediaHealthReport(project, mediaAssets, favoriteMediaAssetIds), [favoriteMediaAssetIds, mediaAssets, project]);
  const mediaHealthByAssetId = useMemo(() => new Map(mediaHealth.assets.map((item) => [item.asset.id, item])), [mediaHealth]);
  const missingImpactSummary = useMemo(() => summarizeMissingMediaImpact(mediaHealth), [mediaHealth]);
  const missingAssetCount = mediaHealth.missingAssets;
  const missingIssueCount = mediaHealth.missingAssets + mediaHealth.missingReferenceCount;
  const favoriteMediaAssetIdsSet = useMemo(() => new Set(favoriteMediaAssetIds), [favoriteMediaAssetIds]);
  const favoriteAssetCount = mediaHealth.favoriteAssets;
  const unusedAssetCount = mediaHealth.unusedAssets;
  const activeCollectionAssetIds = useMemo(() => new Set(activeCollection?.assetIds ?? []), [activeCollection]);
  const recordedTakeAssets = useMemo(() => {
    const recordedTakeIds = new Set(recordedTakesCollection?.assetIds ?? []);
    return mediaAssets.filter((asset) => recordedTakeIds.has(asset.id) && (asset.type === "video" || asset.type === "audio"));
  }, [mediaAssets, recordedTakesCollection]);
  const uploadAsset = useMemo(() => mediaAssets.find((asset) => asset.id === uploadAssetId) ?? null, [mediaAssets, uploadAssetId]);
  const filteredMediaAssets = useMemo(
    () =>
      mediaAssets.filter((asset) => {
        const assetHealth = mediaHealthByAssetId.get(asset.id);
        const isUsed = (assetHealth?.linkedLayerCount ?? 0) > 0;
        if (mediaFilter === "available") return Boolean(asset.objectUrl);
        if (mediaFilter === "favorites") return favoriteMediaAssetIdsSet.has(asset.id);
        if (mediaFilter === "collection") return Boolean(activeCollection) && activeCollectionAssetIds.has(asset.id);
        if (mediaFilter === "missing") return !asset.objectUrl;
        if (mediaFilter === "recoverable") return Boolean(assetHealth?.isRecoverable);
        if (mediaFilter === "used") return isUsed;
        if (mediaFilter === "unused") return !isUsed;
        return true;
      }),
    [activeCollection, activeCollectionAssetIds, favoriteMediaAssetIdsSet, mediaAssets, mediaFilter, mediaHealthByAssetId],
  );

  async function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setIsImporting(true);
    setMediaMessage(null);
    let importedCount = 0;
    let failedCount = 0;

    try {
      for (const file of files) {
        try {
          addMediaAsset(await saveBrowserMedia(file));
          importedCount += 1;
        } catch {
          failedCount += 1;
        }
      }

      const message = mediaImportResultMessage(importedCount, failedCount);
      setMediaMessage(message ? { tone: failedCount > 0 ? "destructive" : "default", text: message } : null);
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  }

  async function importDesktopFiles() {
    setIsImporting(true);
    setMediaMessage(null);
    try {
      const { assets, failedCount } = await importTauriMedia();
      assets.forEach(addMediaAsset);
      const message = desktopImportResultMessage(assets.length, failedCount);
      setMediaMessage(message ? { tone: "destructive", text: message } : null);
    } catch (error) {
      setMediaMessage({ tone: "destructive", text: desktopImportFailureMessage(error) });
    } finally {
      setIsImporting(false);
    }
  }

  async function importStockAsset(asset: StockAsset, options: StockImportOptions = {}) {
    setIsImporting(true);
    setMediaMessage(null);

    try {
      assertClientApiRuntime();
      const params = new URLSearchParams({ title: asset.title });
      const response = await fetch(clientApiUrl(`/api/stock/download?${params}`), { credentials: "include" });
      if (!response.ok) {
        setMediaMessage({ tone: "destructive", text: await stockDownloadFailureMessage(response) });
        return;
      }

      const blob = await response.blob();
      const importedAsset = await saveBrowserMedia(new File([blob], asset.name, { type: asset.mimeType || blob.type }));
      addMediaAsset(importedAsset);

      if (importedAsset.type === "audio") {
        ensureStockAudioCollection(importedAsset.id);
      }

      const layerId =
        importedAsset.type === "audio" && options.addToTimeline
          ? addLayerFromAsset(importedAsset.id, {
              ...stockAudioLayerPatch(stockAudioRoleFromAsset(asset, options.audioRole)),
              start: currentTime,
              track: nextRecordingTrack(project.layers),
              duration: Math.max(1, importedAsset.duration || 5),
              name: stockAudioLayerName(asset, stockAudioRoleFromAsset(asset, options.audioRole)),
              notes: stockAttributionNote(asset),
            })
          : null;

      setMediaMessage({ tone: layerId === null && options.addToTimeline ? "destructive" : "default", text: stockImportResultMessage(asset, layerId, options) });
    } catch (error) {
      setMediaMessage({ tone: "destructive", text: stockImportExceptionMessage(error) });
    } finally {
      setIsImporting(false);
    }
  }

  async function importSelfHostedMedia(input: SelfHostedMediaImportInput) {
    setIsImporting(true);
    setMediaMessage(null);

    try {
      const asset = await createSelfHostedMediaAsset(input);
      addMediaAsset(asset);
      setMediaMessage({ tone: "default", text: `${asset.name} linked from your storage.` });
      return true;
    } catch (error) {
      setMediaMessage({ tone: "destructive", text: selfHostedMediaImportFailureMessage(error) });
      return false;
    } finally {
      setIsImporting(false);
    }
  }

  async function uploadToSelfHostedStorage(input: SelfHostedMediaUploadInput) {
    const asset = uploadAsset;
    if (!asset) return false;

    setIsImporting(true);
    setMediaMessage(null);

    try {
      const uploadedAsset = await uploadMediaAssetToSelfHostedStorage(asset, input);
      const verification = await verifySelfHostedUploadPublicUrl(uploadedAsset.storageKey);
      saveSelfHostedUploadHistoryEntry({
        ...verification,
        assetId: uploadedAsset.id,
        assetName: uploadedAsset.name,
      });
      addMediaAsset(uploadedAsset);
      setMediaMessage({
        tone: verification.status === "failed" ? "destructive" : "default",
        text: selfHostedUploadResultMessage(uploadedAsset.name, verification),
      });
      return true;
    } catch (error) {
      setMediaMessage({ tone: "destructive", text: selfHostedUploadFailureMessage(error) });
      return false;
    } finally {
      setIsImporting(false);
    }
  }

  async function reconnectMissingMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const asset = mediaAssets.find((item) => item.id === reconnectAssetId);
    if (!file || !asset) {
      event.target.value = "";
      return;
    }

    setIsImporting(true);
    setMediaMessage(null);

    try {
      addMediaAsset(await reconnectBrowserMedia(asset, file));
      const remainingMissingCount = mediaAssets.filter((item) => !item.objectUrl && item.id !== asset.id).length;
      setMediaMessage({ tone: "default", text: reconnectResultMessage(asset.name, remainingMissingCount) });
    } catch {
      setMediaMessage({ tone: "destructive", text: "Selected file could not reconnect this media item." });
    } finally {
      setIsImporting(false);
      setReconnectAssetId(null);
      event.target.value = "";
    }
  }

  async function reconnectMissingMediaBatch(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const missingAssets = mediaAssets.filter((asset) => !asset.objectUrl);
    setIsImporting(true);
    setMediaMessage(null);
    let reconnectedCount = 0;
    let failedCount = 0;
    let unmatchedCount = 0;

    try {
      for (const asset of missingAssets) {
        const file = findReconnectFile(asset.name, files);
        if (!file) {
          unmatchedCount += 1;
          continue;
        }

        try {
          addMediaAsset(await reconnectBrowserMedia(asset, file));
          reconnectedCount += 1;
        } catch {
          failedCount += 1;
        }
      }

      setMediaMessage({
        tone: failedCount > 0 || reconnectedCount === 0 ? "destructive" : "default",
        text: batchReconnectResultMessage(reconnectedCount, failedCount, unmatchedCount),
      });
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  }

  function startReconnect(assetId: string) {
    setReconnectAssetId(assetId);
    reconnectInputRef.current?.click();
  }

  function removeAsset(assetId: string) {
    const result = removeMediaAsset(assetId);
    setMediaMessage(
      result.removedAsset
        ? { tone: "default", text: mediaRemovalResultMessage(result.removedLayerCount) }
        : { tone: "destructive", text: "Media item could not be removed." },
    );
  }

  function restoreRemovedAsset() {
    const assetName = lastRemovedMedia?.asset.name ?? "Media";
    const restored = restoreLastRemovedMedia();
    setMediaMessage(
      restored
        ? { tone: "default", text: `${assetName} restored to this project.` }
        : { tone: "destructive", text: "Removed media could not be restored." },
    );
  }

  function addCollection() {
    const collection = createMediaCollection(collectionName);
    if (!collection) {
      setMediaMessage({ tone: "destructive", text: "Enter a collection name." });
      return;
    }

    setCollectionName("");
    setActiveCollectionId(collection.id);
    setMediaMessage({ tone: "default", text: `${collection.name} collection created.` });
  }

  function removeActiveCollection() {
    if (!activeCollection) return;
    removeMediaCollection(activeCollection.id);
    setActiveCollectionId("all");
    setMediaMessage({ tone: "default", text: `${activeCollection.name} collection removed.` });
  }

  function toggleAssetCollection(assetId: string) {
    if (!activeCollection) return;
    const added = toggleMediaAssetCollection(activeCollection.id, assetId);
    setMediaMessage({
      tone: "default",
      text: added ? "Media added to this collection." : "Media removed from this collection.",
    });
  }

  function addRecordedMedia(asset: Parameters<typeof addMediaAsset>[0], mode: RecordingMode, settings: RecordingResultSettings) {
    addMediaAsset(asset);
    ensureRecordedTakesCollection(asset.id);

    const layerOptions = recordingLayerOptions({
      asset,
      mode,
      preset: settings.timelinePreset,
      project,
      start: currentTime,
      track: nextRecordingTrack(project.layers),
      notes: settings.notes,
    });

    if (!layerOptions) {
      setMediaMessage({ tone: "default", text: `${asset.name} saved to recorded takes.` });
      return;
    }

    const layerId = addLayerFromAsset(asset.id, layerOptions);
    setMediaMessage({
      tone: layerId ? "default" : "destructive",
      text: layerId ? "Recording added to the timeline." : "Recording saved, but could not be added to the timeline.",
    });
  }

  function ensureRecordedTakesCollection(assetId: string) {
    const collection =
      mediaCollections.find((item) => item.name.trim().toLowerCase() === "recorded takes") ?? createMediaCollection("Recorded takes");
    if (!collection || collection.assetIds.includes(assetId)) return;
    toggleMediaAssetCollection(collection.id, assetId);
  }

  function ensureStockAudioCollection(assetId: string) {
    const collection =
      mediaCollections.find((item) => item.name.trim().toLowerCase() === stockAudioCollectionName.toLowerCase()) ??
      createMediaCollection(stockAudioCollectionName);
    if (!collection || collection.assetIds.includes(assetId)) return;
    toggleMediaAssetCollection(collection.id, assetId);
  }

  function promoteRecordedTake(asset: Parameters<typeof addMediaAsset>[0], preset: RecordingResultSettings["timelinePreset"]) {
    const layerOptions = recordingLayerOptions({
      asset,
      mode: asset.type === "audio" ? "voiceover" : "screen-camera",
      preset,
      project,
      start: currentTime,
      track: nextRecordingTrack(project.layers),
      notes: "Promoted from take review.",
    });

    if (!layerOptions) {
      setMediaMessage({ tone: "destructive", text: "Selected take could not be promoted." });
      return;
    }

    const layerId = addLayerFromAsset(asset.id, layerOptions);
    if (layerId && !favoriteMediaAssetIdsSet.has(asset.id)) toggleFavoriteMediaAsset(asset.id);
    setMediaMessage({
      tone: layerId ? "default" : "destructive",
      text: layerId ? `${asset.name} promoted to timeline.` : "Selected take could not be promoted.",
    });
  }

  function assignFilteredAssetsToActiveCollection() {
    if (!activeCollection || filteredMediaAssets.length === 0) return;

    let assignedCount = 0;
    for (const asset of filteredMediaAssets) {
      if (activeCollectionAssetIds.has(asset.id)) continue;
      if (toggleMediaAssetCollection(activeCollection.id, asset.id)) {
        assignedCount += 1;
      }
    }

    setMediaMessage({
      tone: "default",
      text:
        assignedCount > 0
          ? `${assignedCount} ${assignedCount === 1 ? "item" : "items"} added to ${activeCollection.name}.`
          : `Filtered media is already in ${activeCollection.name}.`,
    });
  }

  function prefixRenameFilteredAssets() {
    const prefix = cleanBatchRenamePrefix(renamePrefix);
    if (!prefix || filteredMediaAssets.length === 0) return;

    const now = new Date().toISOString();
    for (const asset of filteredMediaAssets) {
      addMediaAsset({
        ...asset,
        name: prefixMediaAssetName(prefix, asset.name),
        createdAt: asset.createdAt || now,
      });
    }

    setRenamePrefix("");
    setMediaMessage({
      tone: "default",
      text: `${filteredMediaAssets.length} ${filteredMediaAssets.length === 1 ? "item" : "items"} renamed.`,
    });
  }

  function removeUnusedAssets() {
    const unusedAssets = mediaHealth.assets.filter((item) => item.linkedLayerCount === 0).map((item) => item.asset);
    if (unusedAssets.length === 0) {
      setMediaMessage({ tone: "default", text: "No unused media to remove." });
      return;
    }

    let removedCount = 0;
    for (const asset of unusedAssets) {
      if (removeMediaAsset(asset.id).removedAsset) removedCount += 1;
    }

    setMediaMessage({
      tone: removedCount > 0 ? "default" : "destructive",
      text:
        removedCount > 0
          ? `${removedCount} unused ${removedCount === 1 ? "item" : "items"} removed.`
          : "Unused media could not be removed.",
    });
  }

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden border-r border-border bg-card/50" aria-label="Media library">
      <ScrollArea className="min-h-0 flex-1" aria-label="Media library controls and assets">
        <div className="space-y-3 p-3">
        <MediaBinImportControls
          inputRef={inputRef}
          reconnectInputRef={reconnectInputRef}
          batchReconnectInputRef={batchReconnectInputRef}
          isImporting={isImporting}
          canImportDesktopFiles={canImportDesktopFiles}
          favoriteAssetCount={favoriteAssetCount}
          missingAssetCount={missingAssetCount}
          totalAssetCount={mediaAssets.length}
          onFiles={onFiles}
          onReconnectMissingMedia={reconnectMissingMedia}
          onReconnectMissingMediaBatch={reconnectMissingMediaBatch}
          onImportDesktopFiles={importDesktopFiles}
          onOpenSelfHostedImport={() => setIsSelfHostedImportOpen(true)}
        />
        <SelfHostedMediaImportDialog
          open={isSelfHostedImportOpen}
          isImporting={isImporting}
          onOpenChange={setIsSelfHostedImportOpen}
          onImport={importSelfHostedMedia}
        />
        <SelfHostedMediaUploadDialog
          asset={uploadAsset}
          open={Boolean(uploadAsset)}
          isUploading={isImporting}
          onOpenChange={(open) => {
            if (!open) setUploadAssetId(null);
          }}
          onUpload={uploadToSelfHostedStorage}
        />
        <MediaBinStatusPanels
          message={mediaMessage}
          lastRemovedAssetName={lastRemovedMedia?.asset.name ?? null}
          mediaHealth={mediaHealth}
          activeFilter={mediaFilter}
          impactSummary={missingImpactSummary}
          missingIssueCount={missingIssueCount}
          missingAssetCount={missingAssetCount}
          isImporting={isImporting}
          onRestoreRemovedAsset={restoreRemovedAsset}
          onFilter={setMediaFilter}
          onBatchReconnect={() => batchReconnectInputRef.current?.click()}
        />
        <MediaBinCollectionControls
          mediaFilter={mediaFilter}
          collectionName={collectionName}
          activeCollectionId={activeCollectionId}
          activeCollection={activeCollection}
          mediaCollections={mediaCollections}
          onMediaFilterChange={setMediaFilter}
          onCollectionNameChange={setCollectionName}
          onAddCollection={addCollection}
          onActiveCollectionChange={setActiveCollectionId}
          onRemoveActiveCollection={removeActiveCollection}
        />
        <MediaBinBatchActions
          activeCollection={activeCollection}
          filteredAssetCount={filteredMediaAssets.length}
          unusedAssetCount={unusedAssetCount}
          renamePrefix={renamePrefix}
          isImporting={isImporting}
          onRenamePrefixChange={setRenamePrefix}
          onAssignFilteredToCollection={assignFilteredAssetsToActiveCollection}
          onPrefixRenameFiltered={prefixRenameFilteredAssets}
          onRemoveUnused={removeUnusedAssets}
        />
        <StockAssetBrowser isImporting={isImporting} onImport={importStockAsset} />
        <RecordingControls onRecorded={addRecordedMedia} />
        <RecordingTakeReview takes={recordedTakeAssets} isImporting={isImporting} onPromoteTake={promoteRecordedTake} />
        <CreationPanel />
        <Separator />
        <div className="space-y-2" role="list" aria-label="Media assets">
          {mediaAssets.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground" role="status">
              Import media to start.
            </div>
          ) : null}
          {mediaAssets.length > 0 && filteredMediaAssets.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground" role="status">
              No media matches this filter.
            </div>
          ) : null}
          {filteredMediaAssets.map((asset) => {
            const assetHealth = mediaHealthByAssetId.get(asset.id);
            const isFavorite = assetHealth?.isFavorite ?? favoriteMediaAssetIdsSet.has(asset.id);
            const isInActiveCollection = activeCollectionAssetIds.has(asset.id);

            return (
              <div key={asset.id} role="listitem">
                <MediaAssetCard
                  asset={asset}
                  assetHealth={assetHealth}
                  activeCollection={activeCollection}
                  isFavorite={isFavorite}
                  isInActiveCollection={isInActiveCollection}
                  isImporting={isImporting}
                  onToggleFavorite={toggleFavoriteMediaAsset}
                  onToggleCollection={toggleAssetCollection}
                  onAddLayer={addLayerFromAsset}
                  onStartReconnect={startReconnect}
                  onUploadToStorage={setUploadAssetId}
                  onRemove={removeAsset}
                />
              </div>
            );
          })}
        </div>
        </div>
      </ScrollArea>
    </aside>
  );
}

function mediaImportResultMessage(importedCount: number, failedCount: number) {
  if (failedCount === 0) return null;

  const failedLabel = failedCount === 1 ? "file" : "files";
  if (importedCount > 0) {
    return `${importedCount} imported. ${failedCount} ${failedLabel} could not be imported.`;
  }

  return `No files imported. ${failedCount} ${failedLabel} could not be imported.`;
}

function mediaRemovalResultMessage(removedLayerCount: number) {
  if (removedLayerCount === 0) return "Media removed from this project.";

  return `Media removed with ${removedLayerCount} linked ${removedLayerCount === 1 ? "timeline layer" : "timeline layers"}.`;
}

function reconnectResultMessage(assetName: string, remainingMissingCount: number) {
  if (remainingMissingCount === 0) return `${assetName} reconnected. All media is available.`;

  return `${assetName} reconnected. ${remainingMissingCount} ${remainingMissingCount === 1 ? "item still needs" : "items still need"} reconnecting.`;
}

function batchReconnectResultMessage(reconnectedCount: number, failedCount: number, unmatchedCount: number) {
  if (reconnectedCount === 0) {
    return "No missing media matched the selected filenames.";
  }

  const parts = [`${reconnectedCount} ${reconnectedCount === 1 ? "item" : "items"} reconnected`];
  if (failedCount > 0) parts.push(`${failedCount} failed`);
  if (unmatchedCount > 0) parts.push(`${unmatchedCount} unmatched`);
  return `${parts.join(", ")}.`;
}

function findReconnectFile(assetName: string, files: File[]) {
  const normalizedAssetName = normalizeMediaFilename(assetName);
  const normalizedAssetBase = mediaFilenameBase(normalizedAssetName);
  return (
    files.find((file) => normalizeMediaFilename(file.name) === normalizedAssetName) ??
    files.find((file) => mediaFilenameBase(normalizeMediaFilename(file.name)) === normalizedAssetBase)
  );
}

async function stockDownloadFailureMessage(response: Response) {
  try {
    const data = await response.json();
    if (typeof data === "object" && data !== null && "reason" in data && typeof data.reason === "string") {
      return data.reason;
    }
  } catch {
    return "Stock media could not be imported.";
  }

  return "Stock media could not be imported.";
}

function stockImportExceptionMessage(error: unknown) {
  if (isClientApiUnavailableError(error)) return error.message;
  return "Stock media could not be imported.";
}

function stockImportResultMessage(asset: StockAsset, layerId: string | null, options: StockImportOptions) {
  if (options.addToTimeline) {
    return layerId
      ? `${asset.name} added to ${stockAudioCollectionName} and placed on the timeline.`
      : `${asset.name} was imported, but could not be placed on the timeline.`;
  }

  if (asset.kind === "audio") {
    return `${asset.name} added to ${stockAudioCollectionName}.`;
  }

  return `${asset.name} added to media.`;
}

function selfHostedUploadResultMessage(assetName: string, verification: SelfHostedUploadVerificationResult) {
  if (verification.status === "verified") return `${assetName} uploaded and verified from your storage.`;
  if (verification.status === "failed") return `${assetName} uploaded, but the public URL check failed. ${verification.message}`;
  return `${assetName} uploaded. ${verification.message}`;
}

function normalizeMediaFilename(value: string) {
  return value.trim().toLowerCase();
}

function mediaFilenameBase(value: string) {
  return value.replace(/\.[^.]+$/, "");
}

function nextRecordingTrack(layers: Array<{ track: number }>) {
  return layers.reduce((track, layer) => Math.max(track, layer.track + 1), 0);
}

function cleanBatchRenamePrefix(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 48);
}

function prefixMediaAssetName(prefix: string, name: string) {
  const cleanName = name.trim().replace(/\s+/g, " ");
  if (cleanName.toLowerCase().startsWith(`${prefix.toLowerCase()} `)) {
    return cleanName;
  }

  return `${prefix} ${cleanName}`.slice(0, 160);
}
