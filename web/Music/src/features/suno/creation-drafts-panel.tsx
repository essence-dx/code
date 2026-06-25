"use client";

import {
  BookmarkPlus,
  Download,
  Filter,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  composeDraftHandoff,
  createDraftHandoffSelection,
  getDraftHandoffChanges,
  hasSelectedDraftSections,
  type DraftHandoffSection,
  type DraftHandoffSelection,
} from "@/features/ai/creation-draft-handoff";
import {
  draftFilters,
  draftMatchesFilter,
  draftMatchesSearch,
  getDraftQuality,
  type DraftFilter,
} from "@/features/ai/creation-draft-quality";
import {
  creationDraftLimit,
  serializeCreationDraftArchive,
  type CreationDraft,
  type CreationDraftArchivePreview as CreationDraftArchivePreviewData,
  type CreationDraftImportResult,
  type CreationDraftInput,
} from "@/features/ai/creation-drafts";
import { useCreationDrafts } from "@/features/ai/use-creation-drafts";
import { CreationDraftArchivePreview } from "./creation-draft-archive-preview";
import { CreationDraftArchiveRecovery } from "./creation-draft-archive-recovery";
import { CreationDraftArchiveTimeline } from "./creation-draft-archive-timeline";
import { CreationDraftBulkReview } from "./creation-draft-bulk-review";
import { CreationDraftCard } from "./creation-draft-card";
import { CreationDraftCompare } from "./creation-draft-compare";
import { CreationDraftHandoffPreview } from "./creation-draft-handoff-preview";
import { CreationDraftRetention } from "./creation-draft-retention";

type CreationDraftsPanelProps = {
  current: CreationDraftInput;
  onApply: (draft: CreationDraftInput) => void;
};

const emptyHandoffSelection: DraftHandoffSelection = {
  controls: false,
  lyrics: false,
  persona: false,
  prompt: false,
  style: false,
  title: false,
  voice: false,
};

export function CreationDraftsPanel({
  current,
  onApply,
}: CreationDraftsPanelProps) {
  const {
    archiveEvents,
    clearArchiveEvents,
    clearRecoverySnapshot,
    deleteDraft,
    deleteDraftBatch,
    drafts,
    exportArchiveEvents,
    exportDrafts,
    importDrafts,
    previewDraftArchive,
    previewRecoveryRestore,
    recoverySnapshot,
    recordArchiveEvent,
    restoreRecoverySnapshot,
    saveDraft,
    setDraftPinned,
    updateDraftNotes,
  } =
    useCreationDrafts();
  const [cleanupArmed, setCleanupArmed] = useState(false);
  const [clearRecoveryReviewOpen, setClearRecoveryReviewOpen] =
    useState(false);
  const [compareDraft, setCompareDraft] = useState<CreationDraft | null>(null);
  const [deleteReviewOpen, setDeleteReviewOpen] = useState(false);
  const [filter, setFilter] = useState<DraftFilter>("all");
  const [pendingArchive, setPendingArchive] = useState<{
    fileName: string;
    preview: CreationDraftArchivePreviewData;
    raw: string;
  } | null>(null);
  const [pendingDraft, setPendingDraft] = useState<CreationDraft | null>(null);
  const [query, setQuery] = useState("");
  const [restoreReviewOpen, setRestoreReviewOpen] = useState(false);
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [selection, setSelection] = useState<DraftHandoffSelection>(
    emptyHandoffSelection,
  );
  const [title, setTitle] = useState(current.title);
  const importInputRef = useRef<HTMLInputElement>(null);
  const filteredDrafts = useMemo(
    () =>
      drafts.filter(
        (draft) =>
          draftMatchesFilter(draft, filter) && draftMatchesSearch(draft, query),
      ).sort(
        (a, b) =>
          Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
          b.updatedAt - a.updatedAt,
      ),
    [drafts, filter, query],
  );
  const visibleDrafts = filteredDrafts.slice(0, 12);
  const selectedDraftSet = useMemo(
    () => new Set(selectedDraftIds),
    [selectedDraftIds],
  );
  const selectedVisibleIds = visibleDrafts
    .filter((draft) => selectedDraftSet.has(draft.id))
    .map((draft) => draft.id);
  const selectedVisibleDrafts = visibleDrafts.filter((draft) =>
    selectedDraftSet.has(draft.id),
  );
  const selectableVisibleIds = visibleDrafts
    .filter((draft) => !draft.pinned)
    .map((draft) => draft.id);
  const weakVisibleIds = visibleDrafts
    .filter((draft) => !draft.pinned && getDraftQuality(draft).score < 50)
    .map((draft) => draft.id);
  const pinnedDraftCount = drafts.filter((draft) => draft.pinned).length;
  const notedDraftCount = drafts.filter((draft) => draft.notes).length;
  const weakDraftCount = drafts.filter(
    (draft) => getDraftQuality(draft).score < 50,
  ).length;
  const pendingChanges = useMemo(
    () => (pendingDraft ? getDraftHandoffChanges(current, pendingDraft) : []),
    [current, pendingDraft],
  );
  const selectedCount = pendingChanges.filter(
    (change) => selection[change.section],
  ).length;
  const recoveryRestorePreview = useMemo(
    () =>
      recoverySnapshot ? previewRecoveryRestore(recoverySnapshot) : null,
    [drafts.length, previewRecoveryRestore, recoverySnapshot],
  );

  useEffect(() => {
    setTitle(current.title);
  }, [current.title]);

  useEffect(() => {
    setCleanupArmed(false);
    setDeleteReviewOpen(false);
  }, [filter, query, drafts.length]);

  useEffect(() => {
    if (!recoverySnapshot) {
      setClearRecoveryReviewOpen(false);
      setRestoreReviewOpen(false);
    }
  }, [recoverySnapshot]);

  useEffect(() => {
    const draftById = new Map(drafts.map((draft) => [draft.id, draft]));
    setSelectedDraftIds((currentIds) =>
      currentIds.filter((id) => draftById.has(id)),
    );
    setCompareDraft((currentDraft) =>
      currentDraft ? (draftById.get(currentDraft.id) ?? null) : null,
    );
    setPendingDraft((currentDraft) =>
      currentDraft ? (draftById.get(currentDraft.id) ?? null) : null,
    );
  }, [drafts]);

  function saveCurrentDraft() {
    const draft = saveDraft({
      ...current,
      source: current.source ?? { label: "Manual", type: "manual" },
      title,
    });
    setTitle(draft.title);
    toast.success("Creation draft saved.");
  }

  function previewDraft(draft: CreationDraft) {
    setCompareDraft(null);
    setPendingDraft(draft);
    setSelection(createDraftHandoffSelection(current, draft));
    toast.message("Review draft changes before applying.");
  }

  function exportAllDrafts() {
    downloadDraftArchive(exportDrafts(), "essence-suno-creation-drafts.json");
  }

  function exportCurrentDraftVaultBeforeImport() {
    downloadDraftArchive(exportDrafts(), "essence-suno-creation-drafts.json");
    toast.success("Current draft vault exported.");
  }

  function exportCurrentDraftVaultBeforeRestore() {
    downloadDraftArchive(
      exportDrafts(),
      `essence-suno-creation-drafts-before-restore-${dateSlug(
        Date.now(),
      )}.json`,
    );
    toast.success("Current draft vault exported.");
  }

  function exportRecoverySnapshot() {
    if (!recoverySnapshot || !recoveryRestorePreview) {
      return;
    }

    downloadDraftArchive(
      recoverySnapshot.archive,
      recoverySnapshotFileName(
        recoverySnapshot.createdAt,
        recoveryRestorePreview.recoverySnapshotReason,
        recoveryRestorePreview.archiveScope,
        recoveryRestorePreview.archiveVersion,
      ),
    );
    recordRecoveryTimelineEvent("recovery-export");
    toast.success("Recovery snapshot exported.");
  }

  function confirmRecoveryRestore() {
    if (!recoverySnapshot) {
      return;
    }

    const result = restoreRecoverySnapshot(recoverySnapshot);
    setRestoreReviewOpen(false);

    if (result.restored > 0 || result.total === 0) {
      toast.success(
        `Recovery restored ${result.restored} draft${
          result.restored === 1 ? "" : "s"
        }.`,
      );
      return;
    }

    toast.message("That recovery snapshot could not be restored.");
  }

  function confirmRecoveryClear() {
    recordRecoveryTimelineEvent("recovery-dismiss");
    clearRecoverySnapshot();
    setClearRecoveryReviewOpen(false);
    setRestoreReviewOpen(false);
    toast.success("Recovery snapshot dismissed.");
  }

  function recordRecoveryTimelineEvent(
    type: "recovery-dismiss" | "recovery-export",
  ) {
    if (!recoverySnapshot || !recoveryRestorePreview) {
      return;
    }

    recordArchiveEvent({
      archiveScope: recoveryRestorePreview.archiveScope,
      archiveVersion: recoveryRestorePreview.archiveVersion,
      draftCount: recoverySnapshot.draftCount,
      recoveryReason: recoveryRestorePreview.recoverySnapshotReason,
      totalDrafts: recoveryRestorePreview.recoveryDraftCount,
      type,
    });
  }

  function exportSelectedVisibleDrafts() {
    if (!selectedVisibleDrafts.length) {
      return;
    }

    downloadDraftArchive(
      serializeCreationDraftArchive(selectedVisibleDrafts, {
        scope: "selected-visible",
      }),
      "essence-suno-selected-creation-drafts.json",
    );
    toast.success("Selected visible drafts exported.");
  }

  function exportArchiveTimeline() {
    downloadDraftArchive(
      exportArchiveEvents(),
      `essence-suno-archive-timeline-${dateSlug(Date.now())}.json`,
    );
    toast.success("Archive timeline exported.");
  }

  function downloadDraftArchive(content: string, filename: string) {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function previewDraftArchiveFile(file: File) {
    try {
      const raw = await file.text();
      const preview = previewDraftArchive(raw);

      if (!preview.total) {
        toast.message(
          "That file did not contain a compatible creation draft archive.",
        );
        return;
      }

      setPendingArchive({ fileName: file.name, preview, raw });
      toast.message(archivePreviewSummary(preview));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not preview creation drafts.",
      );
    }
  }

  function confirmDraftArchiveImport() {
    if (!pendingArchive) {
      return;
    }

    try {
      const result = importDrafts(pendingArchive.raw);
      setPendingArchive(null);

      if (result.imported > 0) {
        toast.success(importDraftSummary(result));
        return;
      }

      toast.message(
        result.total
          ? importDraftSummary(result)
          : "That file did not contain a compatible creation draft archive.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not import creation drafts.",
      );
    }
  }

  function importDraftSummary(result: CreationDraftImportResult) {
    const details = [
      result.duplicates ? `${result.duplicates} duplicate` : "",
      result.invalid ? `${result.invalid} invalid` : "",
      result.capacityLimited ? `${result.capacityLimited} over limit` : "",
    ].filter(Boolean);
    const suffix = details.length ? ` (${details.join(", ")})` : "";

    return `${archiveScopeLabel(result.archiveScope)}: imported ${
      result.imported
    } of ${result.total} draft${result.total === 1 ? "" : "s"}${suffix}.`;
  }

  function archivePreviewSummary(preview: CreationDraftArchivePreviewData) {
    const details = [
      preview.duplicates ? `${preview.duplicates} duplicate` : "",
      preview.invalid ? `${preview.invalid} invalid` : "",
      preview.capacityLimited ? `${preview.capacityLimited} over limit` : "",
    ].filter(Boolean);
    const suffix = details.length ? ` (${details.join(", ")})` : "";

    return `${archiveScopeLabel(preview.archiveScope)}: ${preview.importable} of ${
      preview.total
    } draft${preview.total === 1 ? "" : "s"} ready to import${suffix}.`;
  }

  function archiveScopeLabel(scope: CreationDraftImportResult["archiveScope"]) {
    if (scope === "selected-visible") {
      return "Selected archive";
    }

    if (scope === "full-vault") {
      return "Full archive";
    }

    return "Legacy archive";
  }

  function deleteWeakVisibleDrafts() {
    if (!weakVisibleIds.length) {
      return;
    }

    if (!cleanupArmed) {
      setCleanupArmed(true);
      toast.message("Press confirm to delete weak visible drafts.");
      return;
    }

    deleteDraftBatch(weakVisibleIds);
    setCleanupArmed(false);
    toast.success("Weak visible drafts deleted.");
  }

  function toggleDraftSelection(id: string) {
    setDeleteReviewOpen(false);
    setSelectedDraftIds((currentIds) =>
      currentIds.includes(id)
        ? currentIds.filter((currentId) => currentId !== id)
        : [...currentIds, id],
    );
  }

  function selectVisibleDrafts() {
    setDeleteReviewOpen(false);
    setSelectedDraftIds((currentIds) =>
      Array.from(new Set([...currentIds, ...selectableVisibleIds])),
    );
  }

  function clearVisibleSelection() {
    setDeleteReviewOpen(false);
    setSelectedDraftIds((currentIds) =>
      currentIds.filter((id) => !selectedVisibleIds.includes(id)),
    );
  }

  function deleteSelectedVisibleDrafts() {
    if (!selectedVisibleIds.length) {
      return;
    }

    deleteDraftBatch(selectedVisibleIds);
    setSelectedDraftIds((currentIds) =>
      currentIds.filter((id) => !selectedVisibleIds.includes(id)),
    );
    setDeleteReviewOpen(false);
    toast.success("Selected visible drafts deleted.");
  }

  function toggleHandoffSection(
    section: DraftHandoffSection,
    checked: boolean,
  ) {
    setSelection((currentSelection) => ({
      ...currentSelection,
      [section]: checked,
    }));
  }

  function applySelectedDraftSections() {
    if (!pendingDraft || !hasSelectedDraftSections(selection)) {
      return;
    }

    const nextDraft = composeDraftHandoff(current, pendingDraft, selection);
    onApply(nextDraft);
    setTitle(nextDraft.title);
    setPendingDraft(null);
    setSelection(emptyHandoffSelection);
    toast.success("Selected draft sections applied.");
  }

  return (
    <div className="rounded-md border border-white/10 bg-slate-950/45 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="font-medium">Creation drafts</p>
          <p className="text-sm text-muted-foreground">
            Save and review reusable creation direction before generation.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {filteredDrafts.length}/{drafts.length} shown
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="sm:w-64"
            aria-label="Creation draft title"
          />
          <Button
            variant="secondary"
            className="gap-2"
            title="Save creation draft"
            onClick={saveCurrentDraft}
          >
            <BookmarkPlus className="size-4" />
            Save
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Import creation drafts"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";

              if (file) {
                void previewDraftArchiveFile(file);
              }
            }}
          />
          <Button
            variant="ghost"
            className="gap-2"
            title="Import creation drafts"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload className="size-4" />
            Import
          </Button>
          <Button
            variant="ghost"
            className="gap-2"
            disabled={!drafts.length}
            title="Export creation drafts"
            onClick={exportAllDrafts}
          >
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search drafts"
          aria-label="Search creation drafts"
        />
        <Select
          value={filter}
          onValueChange={(value) => setFilter(value as DraftFilter)}
        >
          <SelectTrigger aria-label="Creation draft filter">
            <Filter className="mr-2 size-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {draftFilters.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={cleanupArmed ? "destructive" : "outline"}
          className="gap-2"
          disabled={!weakVisibleIds.length}
          title={
            cleanupArmed ? "Confirm weak draft cleanup" : "Clear weak drafts"
          }
          onClick={deleteWeakVisibleDrafts}
        >
          <Trash2 className="size-4" />
          {cleanupArmed ? "Confirm clear" : "Clear weak"}
        </Button>
      </div>

      {drafts.length ? (
        <div className="mt-3">
          <CreationDraftRetention
            cleanupCandidates={weakVisibleIds.length}
            filtered={filteredDrafts.length}
            limit={creationDraftLimit}
            noted={notedDraftCount}
            onExport={exportAllDrafts}
            pinned={pinnedDraftCount}
            selected={selectedVisibleIds.length}
            total={drafts.length}
            weak={weakDraftCount}
          />
        </div>
      ) : null}

      {pendingArchive ? (
        <CreationDraftArchivePreview
          currentDraftCount={drafts.length}
          fileName={pendingArchive.fileName}
          onCancel={() => setPendingArchive(null)}
          onConfirm={confirmDraftArchiveImport}
          onExportCurrent={exportCurrentDraftVaultBeforeImport}
          preview={pendingArchive.preview}
        />
      ) : null}

      {recoverySnapshot && recoveryRestorePreview ? (
        <CreationDraftArchiveRecovery
          clearReviewOpen={clearRecoveryReviewOpen}
          onCancelClear={() => setClearRecoveryReviewOpen(false)}
          onCancelRestore={() => setRestoreReviewOpen(false)}
          onConfirmClear={confirmRecoveryClear}
          onExport={exportRecoverySnapshot}
          onExportCurrent={exportCurrentDraftVaultBeforeRestore}
          onConfirmRestore={confirmRecoveryRestore}
          onReviewClear={() => {
            setRestoreReviewOpen(false);
            setClearRecoveryReviewOpen(true);
          }}
          onReviewRestore={() => {
            setClearRecoveryReviewOpen(false);
            setRestoreReviewOpen(true);
          }}
          restorePreview={recoveryRestorePreview}
          restoreReviewOpen={restoreReviewOpen}
          snapshot={recoverySnapshot}
        />
      ) : null}

      {archiveEvents.length ? (
        <CreationDraftArchiveTimeline
          events={archiveEvents}
          onClear={() => {
            clearArchiveEvents();
            toast.success("Archive timeline cleared.");
          }}
          onExport={exportArchiveTimeline}
        />
      ) : null}

      {visibleDrafts.length ? (
        <CreationDraftBulkReview
          deleteReviewOpen={deleteReviewOpen}
          onCancelDelete={() => setDeleteReviewOpen(false)}
          onClearSelected={clearVisibleSelection}
          onConfirmDelete={deleteSelectedVisibleDrafts}
          onExportSelected={exportSelectedVisibleDrafts}
          onReviewDelete={() => setDeleteReviewOpen(true)}
          onSelectVisible={selectVisibleDrafts}
          selectableCount={selectableVisibleIds.length}
          selectedCount={selectedVisibleIds.length}
        />
      ) : null}

      {compareDraft ? (
        <CreationDraftCompare
          current={current}
          draft={compareDraft}
          onApply={previewDraft}
          onClose={() => setCompareDraft(null)}
        />
      ) : null}

      {pendingDraft ? (
        <CreationDraftHandoffPreview
          changes={pendingChanges}
          onApply={applySelectedDraftSections}
          onCancel={() => {
            setPendingDraft(null);
            setSelection(emptyHandoffSelection);
          }}
          onToggle={toggleHandoffSection}
          selectedCount={selectedCount}
          selection={selection}
          subtitle={
            pendingDraft.notes ? `Note: ${pendingDraft.notes}` : undefined
          }
          title={pendingDraft.title}
        />
      ) : null}

      {visibleDrafts.length ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {visibleDrafts.map((draft) => (
            <CreationDraftCard
              key={draft.id}
              draft={draft}
              onApply={previewDraft}
              onCompare={setCompareDraft}
              onDelete={(id) => {
                deleteDraft(id);
                toast.success("Creation draft deleted.");
              }}
              onTogglePin={(id, pinned) => {
                setDraftPinned(id, pinned);
                toast.success(
                  pinned ? "Creation draft pinned." : "Creation draft unpinned.",
                );
              }}
              onToggleSelect={toggleDraftSelection}
              onUpdateNote={(id, note) => {
                updateDraftNotes(id, note);
                toast.success(
                  note.trim()
                    ? "Creation draft note saved."
                    : "Creation draft note cleared.",
                );
              }}
              selected={selectedDraftSet.has(draft.id)}
            />
          ))}
        </div>
      ) : drafts.length ? (
        <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-4 text-sm text-muted-foreground">
          No drafts match the current filter.
        </div>
      ) : null}
      {filteredDrafts.length > visibleDrafts.length ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Narrow search or filters to review the remaining drafts.
        </p>
      ) : null}
    </div>
  );
}

function dateSlug(value: number) {
  return new Date(value).toISOString().replace(/[:.]/g, "-");
}

function recoverySnapshotFileName(
  createdAt: number,
  reason: "archive-import" | "recovery-restore",
  scope: "full-vault" | "legacy" | "selected-visible",
  version: number | null,
) {
  return [
    "essence-suno-creation-drafts-recovery",
    reason,
    scope,
    version ? `v${version}` : "legacy",
    dateSlug(createdAt),
  ].join("-") + ".json";
}
