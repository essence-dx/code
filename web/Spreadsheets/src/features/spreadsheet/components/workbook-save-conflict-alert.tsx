"use client";

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function WorkbookSaveConflictAlert({
  disabled,
  onReload,
  onOverwrite,
  serverUpdatedAt,
}: {
  disabled: boolean;
  onReload: () => void;
  onOverwrite: () => void;
  serverUpdatedAt: string;
}) {
  return (
    <Alert variant="destructive" className="m-3 w-auto">
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Server copy changed at {new Date(serverUpdatedAt).toLocaleString()}.
            Autosave is paused, and your local edits are still in this browser.
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onReload}
            disabled={disabled}
          >
            Reload server copy
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={onOverwrite}
            disabled={disabled}
          >
            Overwrite server copy
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
}
