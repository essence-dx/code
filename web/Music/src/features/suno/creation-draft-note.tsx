"use client";

import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CreationDraft } from "@/features/ai/creation-drafts";

type CreationDraftNoteProps = {
  draft: CreationDraft;
  onUpdateNote: (id: string, note: string) => void;
};

export function CreationDraftNote({
  draft,
  onUpdateNote,
}: CreationDraftNoteProps) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(draft.notes ?? "");

  useEffect(() => {
    if (!editing) {
      setNote(draft.notes ?? "");
    }
  }, [draft.notes, editing]);

  if (!editing) {
    return (
      <div className="mt-3 flex items-start justify-between gap-2 rounded-md bg-white/[0.03] p-2 text-xs text-muted-foreground">
        <p className="line-clamp-2">
          {draft.notes || "No private note for this draft."}
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 shrink-0 gap-1"
          aria-label={`${draft.notes ? "Edit" : "Add"} note for ${draft.title}`}
          title={`${draft.notes ? "Edit" : "Add"} note for ${draft.title}`}
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-3" />
          {draft.notes ? "Edit" : "Add note"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-md bg-white/[0.03] p-2">
      <Textarea
        value={note}
        aria-label={`Private note for ${draft.title}`}
        maxLength={500}
        rows={3}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Add a private note for this draft"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {note.trim().length}/500
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            title={`Save note for ${draft.title}`}
            onClick={() => {
              onUpdateNote(draft.id, note);
              setEditing(false);
            }}
          >
            Save note
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            title={`Cancel note editing for ${draft.title}`}
            onClick={() => {
              setNote(draft.notes ?? "");
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
