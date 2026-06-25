"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getDraftHandoffChanges,
  type DraftHandoffChange,
} from "@/features/ai/creation-draft-handoff";
import type {
  CreationDraft,
  CreationDraftInput,
} from "@/features/ai/creation-drafts";

type CreationDraftCompareProps = {
  current: CreationDraftInput;
  draft: CreationDraft;
  onApply: (draft: CreationDraft) => void;
  onClose: () => void;
};

type CreationDraftCompareChange = Omit<DraftHandoffChange, "section"> & {
  section: DraftHandoffChange["section"] | "notes";
};

export function CreationDraftCompare({
  current,
  draft,
  onApply,
  onClose,
}: CreationDraftCompareProps) {
  const changes: CreationDraftCompareChange[] = [
    ...getDraftHandoffChanges(current, draft),
    noteChange(draft),
  ];
  const changedCount = changes.filter((change) => change.changed).length;

  return (
    <div className="mt-3 rounded-md border border-sky-300/20 bg-sky-300/5 p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">Compare draft</p>
            <Badge variant="secondary" className="bg-white/5">
              {changedCount} changed
            </Badge>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {draft.title}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            title="Close draft compare"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            type="button"
            title={`Review apply for ${draft.title}`}
            onClick={() => onApply(draft)}
          >
            Review apply
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {changes.map((change) => (
          <div
            key={change.section}
            className="grid gap-3 rounded-md border border-white/10 bg-black/20 p-2 md:grid-cols-[120px_1fr_1fr_auto]"
          >
            <p className="text-sm font-medium">{change.label}</p>
            <FieldValue label="Current" value={change.before} />
            <FieldValue label="Draft" value={change.after} />
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
        ))}
      </div>
    </div>
  );
}

function noteChange(draft: CreationDraft): CreationDraftCompareChange {
  const note = draft.notes?.trim() || "None";

  return {
    after: note,
    before: "Current composer note: none",
    changed: note !== "None",
    label: "Notes",
    section: "notes",
  };
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
