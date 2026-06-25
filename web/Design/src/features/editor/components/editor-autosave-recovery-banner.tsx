"use client";

import { RotateCcw, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  EditorAutosaveConflictStatus,
  EditorAutosaveSnapshot,
} from "@/features/editor/editor-autosave";

type EditorAutosaveRecoveryBannerProps = {
  snapshot: EditorAutosaveSnapshot | null;
  conflictStatus: EditorAutosaveConflictStatus | null;
  onRestore: () => void;
  onDiscard: () => void;
};

export function EditorAutosaveRecoveryBanner({
  snapshot,
  conflictStatus,
  onRestore,
  onDiscard,
}: EditorAutosaveRecoveryBannerProps) {
  if (!snapshot) return null;

  const serverChanged = conflictStatus === "server-changed";

  return (
    <Alert className="rounded-none border-x-0 border-t-0 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <AlertTitle className="flex items-center gap-2">
            Unsaved local draft found
            <Badge variant={serverChanged ? "destructive" : "secondary"}>
              {serverChanged ? "Server changed" : "Offline draft"}
            </Badge>
          </AlertTitle>
          <AlertDescription className="mt-1">
            {snapshot.projectName} was saved locally{" "}
            {formatAutosaveTime(snapshot.updatedAt)}.
          </AlertDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" onClick={onRestore}>
            <RotateCcw className="h-4 w-4" />
            Restore
          </Button>
          <Button size="sm" variant="outline" onClick={onDiscard}>
            <Trash2 className="h-4 w-4" />
            Dismiss
          </Button>
        </div>
      </div>
    </Alert>
  );
}

function formatAutosaveTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "recently";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
