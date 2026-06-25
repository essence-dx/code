"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getDraftHandoffChanges,
  type DraftHandoffChange,
} from "@/features/ai/creation-draft-handoff";
import type { CreationDraftInput } from "@/features/ai/creation-drafts";
import type { ComposerSnapshot } from "@/features/ai/composer-snapshots";

type ComposerSnapshotCompareProps = {
  current: CreationDraftInput;
  onClose: () => void;
  onRestore: (snapshot: ComposerSnapshot) => void;
  snapshot: ComposerSnapshot;
};

type SnapshotCompareChange = Omit<DraftHandoffChange, "section"> & {
  section: DraftHandoffChange["section"] | "notes";
};

export function ComposerSnapshotCompare({
  current,
  onClose,
  onRestore,
  snapshot,
}: ComposerSnapshotCompareProps) {
  const changes = [
    ...getDraftHandoffChanges(current, snapshot.draft),
    noteChange(snapshot),
  ];
  const changedCount = changes.filter((change) => change.changed).length;

  return (
    <div className="mt-3 rounded-md border border-emerald-300/20 bg-emerald-300/5 p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">Compare snapshot</p>
            <Badge variant="secondary" className="bg-white/5">
              {changedCount} changed
            </Badge>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {snapshot.draft.title}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="ghost" onClick={onClose}>
            <X className="size-4" />
            Close
          </Button>
          <Button onClick={() => onRestore(snapshot)}>Review restore</Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {changes.map((change) => (
          <CompareRow key={change.section} change={change} />
        ))}
      </div>
    </div>
  );
}

function CompareRow({ change }: { change: SnapshotCompareChange }) {
  return (
    <div className="grid gap-3 rounded-md border border-white/10 bg-black/20 p-2 md:grid-cols-[120px_1fr_1fr_auto]">
      <p className="text-sm font-medium">{change.label}</p>
      <FieldValue label="Current" value={change.before} />
      <FieldValue label="Snapshot" value={change.after} />
      <Badge
        variant="secondary"
        className={
          change.changed
            ? "h-fit bg-amber-400/15 text-amber-100"
            : "h-fit bg-white/5"
        }
      >
        {change.changed ? "Changed" : "Same"}
      </Badge>
    </div>
  );
}

function FieldValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.7rem] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs text-slate-200">
        {value}
      </p>
    </div>
  );
}

function noteChange(snapshot: ComposerSnapshot): SnapshotCompareChange {
  const note = snapshot.note?.trim() || "None";

  return {
    after: note,
    before: "Current composer note: none",
    changed: note !== "None",
    label: "Notes",
    section: "notes",
  };
}
