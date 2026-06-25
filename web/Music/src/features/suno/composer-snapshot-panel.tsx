"use client";

import {
  CheckSquare2,
  Download,
  GitCompareArrows,
  History,
  Pencil,
  Pin,
  RotateCcw,
  Save,
  Search,
  Square,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  composerSnapshotLimit,
  type ComposerSnapshot,
} from "@/features/ai/composer-snapshots";
import type { CreationDraftInput } from "@/features/ai/creation-drafts";
import { ComposerSnapshotCompare } from "./composer-snapshot-compare";
import { ComposerSnapshotRetention } from "./composer-snapshot-retention";

type ComposerSnapshotPanelProps = {
  current: CreationDraftInput;
  onDelete: (id: string) => void;
  onDeleteMany: (ids: string[]) => void;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  onRestore: (snapshot: ComposerSnapshot) => void;
  onSnapshot: () => void;
  onTogglePin: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  snapshots: ComposerSnapshot[];
};

const reasonOptions: ComposerSnapshot["reason"][] = [
  "manual",
  "draft",
  "playlist",
  "replay",
  "reuse",
];

export function ComposerSnapshotPanel({
  current,
  onDelete,
  onDeleteMany,
  onExport,
  onImport,
  onRestore,
  onSnapshot,
  onTogglePin,
  onUpdateNote,
  snapshots,
}: ComposerSnapshotPanelProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [compareSnapshotId, setCompareSnapshotId] = useState<string | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [deleteReviewOpen, setDeleteReviewOpen] = useState(false);
  const [selectedSnapshotIds, setSelectedSnapshotIds] = useState<string[]>([]);
  const [selectedReasons, setSelectedReasons] =
    useState<ComposerSnapshot["reason"][]>(reasonOptions);
  const selectedReasonSet = useMemo(
    () => new Set(selectedReasons),
    [selectedReasons],
  );
  const filteredSnapshots = useMemo(
    () =>
      snapshots.filter(
        (snapshot) =>
          selectedReasonSet.has(snapshot.reason) &&
          snapshotMatchesQuery(snapshot, query),
      ),
    [query, selectedReasonSet, snapshots],
  );
  const latest = filteredSnapshots[0];
  const hiddenCount = snapshots.length - filteredSnapshots.length;
  const pinnedCount = snapshots.filter((snapshot) => snapshot.pinned).length;
  const selectedSnapshotSet = useMemo(
    () => new Set(selectedSnapshotIds),
    [selectedSnapshotIds],
  );
  const selectedVisibleIds = useMemo(
    () =>
      filteredSnapshots
        .filter((snapshot) => selectedSnapshotSet.has(snapshot.id))
        .map((snapshot) => snapshot.id),
    [filteredSnapshots, selectedSnapshotSet],
  );
  const selectableVisibleIds = filteredSnapshots
    .filter((snapshot) => snapshot.id !== latest?.id && !snapshot.pinned)
    .map((snapshot) => snapshot.id);
  const compareSnapshot =
    filteredSnapshots.find((snapshot) => snapshot.id === compareSnapshotId) ??
    null;

  useEffect(() => {
    const liveSnapshotIds = new Set(snapshots.map((snapshot) => snapshot.id));
    setSelectedSnapshotIds((currentIds) =>
      currentIds.filter((id) => liveSnapshotIds.has(id)),
    );
    setCompareSnapshotId((currentId) =>
      currentId && liveSnapshotIds.has(currentId) ? currentId : null,
    );
  }, [snapshots]);

  function toggleReason(reason: ComposerSnapshot["reason"]) {
    setDeleteReviewOpen(false);
    setSelectedReasons((currentReasons) =>
      currentReasons.includes(reason)
        ? currentReasons.filter((currentReason) => currentReason !== reason)
        : [...currentReasons, reason],
    );
  }

  function toggleSnapshotSelection(id: string) {
    setDeleteReviewOpen(false);
    setSelectedSnapshotIds((currentIds) =>
      currentIds.includes(id)
        ? currentIds.filter((currentId) => currentId !== id)
        : [...currentIds, id],
    );
  }

  function selectVisibleSnapshots() {
    setDeleteReviewOpen(false);
    setSelectedSnapshotIds((currentIds) =>
      Array.from(new Set([...currentIds, ...selectableVisibleIds])),
    );
  }

  function clearVisibleSelection() {
    setDeleteReviewOpen(false);
    setSelectedSnapshotIds((currentIds) =>
      currentIds.filter((id) => !selectedVisibleIds.includes(id)),
    );
  }

  function deleteSelectedSnapshots() {
    if (!selectedVisibleIds.length) {
      return;
    }

    onDeleteMany(selectedVisibleIds);
    setSelectedSnapshotIds((currentIds) =>
      currentIds.filter((id) => !selectedVisibleIds.includes(id)),
    );
    setDeleteReviewOpen(false);
  }

  return (
    <div className="rounded-md border border-white/10 bg-slate-950/45 p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <History className="size-4 text-emerald-200" />
            <p className="font-medium">Composer snapshots</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Local restore points saved before handoffs overwrite composer fields.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={importInputRef}
            type="file"
            aria-label="Import composer snapshots"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = "";

              if (file) {
                void onImport(file);
              }
            }}
          />
          <Button
            variant="ghost"
            className="gap-2"
            disabled={!snapshots.length}
            title="Export composer snapshots"
            onClick={onExport}
          >
            <Download className="size-4" />
            Export
          </Button>
          <Button
            variant="ghost"
            className="gap-2"
            title="Import composer snapshots"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload className="size-4" />
            Import
          </Button>
          <Button variant="secondary" className="gap-2" onClick={onSnapshot}>
            <Save className="size-4" />
            Snapshot now
          </Button>
        </div>
      </div>

      {snapshots.length ? (
        <div className="mt-3 space-y-2 rounded-md border border-white/10 bg-black/20 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              aria-label="Search composer snapshots"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, handoff, changed fields, or origin"
              className="pl-8"
            />
          </div>
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Snapshot origin filters"
          >
            {reasonOptions.map((reason) => {
              const selected = selectedReasonSet.has(reason);

              return (
                <Button
                  key={reason}
                  type="button"
                  size="sm"
                  variant={selected ? "secondary" : "ghost"}
                  aria-pressed={selected}
                  className="h-8"
                  onClick={() => toggleReason(reason)}
                >
                  {reasonLabel(reason)}
                </Button>
              );
            })}
            {hiddenCount > 0 ? (
              <Badge variant="outline" className="ml-auto border-white/10">
                {hiddenCount} hidden
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-auto border-white/10">
                Showing all
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {filteredSnapshots.length} of {snapshots.length} local
            restore points.
          </p>
          <ComposerSnapshotRetention
            filtered={filteredSnapshots.length}
            hidden={hiddenCount}
            limit={composerSnapshotLimit}
            onExport={onExport}
            pinned={pinnedCount}
            selected={selectedVisibleIds.length}
            total={snapshots.length}
          />
          <div
            className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2"
            role="group"
            aria-label="Snapshot bulk cleanup controls"
          >
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!selectableVisibleIds.length}
              onClick={selectVisibleSnapshots}
            >
              Select visible
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!selectedVisibleIds.length}
              onClick={clearVisibleSelection}
            >
              Clear selected
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={!selectedVisibleIds.length}
              onClick={() => setDeleteReviewOpen(true)}
            >
              Review delete ({selectedVisibleIds.length})
            </Button>
          </div>
          {deleteReviewOpen ? (
            <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive sm:flex-row sm:items-center sm:justify-between">
              <span>
                Delete {selectedVisibleIds.length} selected visible restore
                point{selectedVisibleIds.length === 1 ? "" : "s"}?
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={deleteSelectedSnapshots}
                >
                  Delete selected
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteReviewOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {compareSnapshot ? (
        <ComposerSnapshotCompare
          current={current}
          onClose={() => setCompareSnapshotId(null)}
          onRestore={onRestore}
          snapshot={compareSnapshot}
        />
      ) : null}

      {latest ? (
        <SnapshotCard
          highlight
          onCompare={setCompareSnapshotId}
          onDelete={onDelete}
          onRestore={onRestore}
          onTogglePin={onTogglePin}
          onToggleSelect={toggleSnapshotSelection}
          onUpdateNote={onUpdateNote}
          selected={selectedSnapshotSet.has(latest.id)}
          snapshot={latest}
        />
      ) : (
        <p className="mt-3 rounded-md border border-white/10 bg-black/20 p-3 text-sm text-muted-foreground">
          {snapshots.length
            ? "No snapshots match the current search or origin filters."
            : "No snapshots yet."}
        </p>
      )}

      {filteredSnapshots.length > 1 ? (
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {filteredSnapshots.slice(1).map((snapshot) => (
            <SnapshotCard
              key={snapshot.id}
              onCompare={setCompareSnapshotId}
              onDelete={onDelete}
              onRestore={onRestore}
              onTogglePin={onTogglePin}
              onToggleSelect={toggleSnapshotSelection}
              onUpdateNote={onUpdateNote}
              selected={selectedSnapshotSet.has(snapshot.id)}
              snapshot={snapshot}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SnapshotCard({
  highlight,
  onCompare,
  onDelete,
  onRestore,
  onTogglePin,
  onToggleSelect,
  onUpdateNote,
  selected,
  snapshot,
}: {
  highlight?: boolean;
  onCompare: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (snapshot: ComposerSnapshot) => void;
  onTogglePin: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  selected: boolean;
  snapshot: ComposerSnapshot;
}) {
  return (
    <div
      className={
        highlight
          ? "mt-3 rounded-md border border-white/10 bg-black/20 p-2"
          : "rounded-md bg-black/20 p-2 text-xs text-muted-foreground"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-white/5">
              {reasonLabel(snapshot.reason)}
            </Badge>
            {snapshot.pinned ? (
              <Badge
                variant="secondary"
                className="bg-emerald-400/15 text-emerald-100"
              >
                Pinned
              </Badge>
            ) : null}
            <p className="truncate text-sm font-medium text-slate-200">
              {snapshot.draft.title}
            </p>
          </div>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            Before {snapshot.handoffTitle} / {snapshot.changedFields.join(", ")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(snapshot.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon-sm"
            variant={snapshot.pinned ? "secondary" : "ghost"}
            aria-label={`${snapshot.pinned ? "Unpin" : "Pin"} ${snapshot.draft.title}`}
            aria-pressed={Boolean(snapshot.pinned)}
            title={`${snapshot.pinned ? "Unpin" : "Pin"} ${snapshot.draft.title}`}
            onClick={() => onTogglePin(snapshot.id)}
          >
            <Pin className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Compare ${snapshot.draft.title}`}
            title={`Compare ${snapshot.draft.title}`}
            onClick={() => onCompare(snapshot.id)}
          >
            <GitCompareArrows className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`${selected ? "Deselect" : "Select"} ${snapshot.draft.title}`}
            aria-pressed={selected}
            title={`${selected ? "Deselect" : "Select"} ${snapshot.draft.title}`}
            onClick={() => onToggleSelect(snapshot.id)}
          >
            {selected ? (
              <CheckSquare2 className="size-4" />
            ) : (
              <Square className="size-4" />
            )}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Restore ${snapshot.draft.title}`}
            title={`Restore ${snapshot.draft.title}`}
            onClick={() => onRestore(snapshot)}
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Delete ${snapshot.draft.title}`}
            title={`Delete ${snapshot.draft.title}`}
            onClick={() => onDelete(snapshot.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      <SnapshotNote snapshot={snapshot} onUpdateNote={onUpdateNote} />
    </div>
  );
}

function SnapshotNote({
  onUpdateNote,
  snapshot,
}: {
  onUpdateNote: (id: string, note: string) => void;
  snapshot: ComposerSnapshot;
}) {
  const [draft, setDraft] = useState(snapshot.note ?? "");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(snapshot.note ?? "");
    }
  }, [editing, snapshot.note]);

  if (!editing) {
    return (
      <div className="mt-2 flex items-start justify-between gap-2 rounded-md bg-white/[0.03] p-2 text-xs text-muted-foreground">
        <p className="line-clamp-2">
          {snapshot.note || "No note for this restore point."}
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 shrink-0 gap-1"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-3" />
          {snapshot.note ? "Edit" : "Add note"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-md bg-white/[0.03] p-2">
      <Textarea
        value={draft}
        aria-label={`Private note for ${snapshot.draft.title}`}
        maxLength={500}
        rows={3}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Add a private note for this restore point"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {draft.trim().length}/500
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              onUpdateNote(snapshot.id, draft);
              setEditing(false);
            }}
          >
            Save note
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(snapshot.note ?? "");
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function reasonLabel(reason: ComposerSnapshot["reason"]) {
  const labels: Record<ComposerSnapshot["reason"], string> = {
    draft: "Draft",
    manual: "Manual",
    playlist: "Playlist",
    replay: "Replay",
    reuse: "Reuse",
  };

  return labels[reason];
}

function snapshotMatchesQuery(snapshot: ComposerSnapshot, query: string) {
  const value = query.trim().toLowerCase();

  if (!value) {
    return true;
  }

  return [
    snapshot.draft.title,
    snapshot.handoffTitle,
    snapshot.note ?? "",
    reasonLabel(snapshot.reason),
    ...snapshot.changedFields,
  ]
    .join(" ")
    .toLowerCase()
    .includes(value);
}
