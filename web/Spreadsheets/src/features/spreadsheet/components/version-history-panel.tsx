"use client";

import { History, RotateCcw, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  WorkbookVersionRestore,
  WorkbookVersionSnapshot,
} from "@/features/workbooks/types";

function formatSnapshotDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
}

export function VersionHistoryPanel({
  disabled = false,
  versions,
  restoreLog,
  onCreateVersion,
  onDeleteVersion,
  onRestoreVersion,
}: {
  disabled?: boolean;
  versions: WorkbookVersionSnapshot[];
  restoreLog: WorkbookVersionRestore[];
  onCreateVersion: (label: string) => void;
  onDeleteVersion: (versionId: string) => void;
  onRestoreVersion: (versionId: string) => void;
}) {
  function handleCreateVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (disabled) {
      return;
    }

    onCreateVersion(String(formData.get("label") ?? ""));
    form.reset();
  }

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Version history</h2>
        </div>
        <Badge variant="secondary" className="font-mono">
          {versions.length}
        </Badge>
      </div>
      <form
        className="mb-3 flex gap-2"
        onSubmit={handleCreateVersion}
      >
        <Input
          name="label"
          className="h-8"
          placeholder="Checkpoint label"
          maxLength={80}
          disabled={disabled}
        />
        <Button type="submit" size="sm" disabled={disabled}>
          Save
        </Button>
      </form>
      {restoreLog.length > 0 ? (
        <div className="mb-3 rounded-md border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              Restore log
            </h3>
            <Badge variant="outline" className="font-mono">
              {restoreLog.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {restoreLog.slice(0, 3).map((restore) => (
              <div key={restore.id} className="min-w-0 text-xs">
                <p className="truncate font-medium">{restore.label}</p>
                <p className="font-mono text-muted-foreground">
                  {formatSnapshotDate(restore.restoredAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        {versions.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm leading-6 text-muted-foreground">
            No saved versions yet.
          </p>
        ) : (
          versions.map((version) => (
            <section key={version.id} className="rounded-lg border bg-card p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-medium">
                    {version.label}
                  </h3>
                  <p className="font-mono text-xs text-muted-foreground">
                    {formatSnapshotDate(version.createdAt)}
                  </p>
                </div>
                <ConfirmDestructiveButton
                  title="Delete this saved version?"
                  description="This removes the saved snapshot from version history. It does not change the current workbook."
                  label="Delete saved version"
                  disabled={disabled}
                  onConfirm={() => onDeleteVersion(version.id)}
                >
                  <Trash2 />
                </ConfirmDestructiveButton>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                {version.sheetCount} sheets / {version.cellCount} cells
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" disabled={disabled}>
                    <RotateCcw />
                    Restore
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restore this version?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This replaces the current workbook content with the saved
                      snapshot while keeping the version list.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onRestoreVersion(version.id)}
                    >
                      Restore version
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </section>
          ))
        )}
      </div>
    </section>
  );
}
