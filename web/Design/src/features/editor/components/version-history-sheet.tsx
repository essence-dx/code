"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ProjectVersionSummary } from "@/features/editor/types";

type VersionHistorySheetProps = {
  open: boolean;
  versions: ProjectVersionSummary[];
  restoringVersionId: string | null;
  onOpenChange: (open: boolean) => void;
  onRestoreVersion: (versionId: string) => void;
};

export function VersionHistorySheet({
  open,
  versions,
  restoringVersionId,
  onOpenChange,
  onRestoreVersion,
}: VersionHistorySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[360px] sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Version history</SheetTitle>
          <SheetDescription>
            Restore an earlier saved state of this design.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
          {versions.length ? (
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="overflow-hidden rounded-md border border-border bg-card"
                >
                  <div className="aspect-video bg-muted">
                    {version.thumbnail ? (
                      <img
                        src={version.thumbnail}
                        alt=""
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    ) : null}
                  </div>
                  <div className="space-y-3 p-3">
                    <div>
                      <p className="truncate text-sm font-medium">
                        {version.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatVersionDate(version.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={restoringVersionId !== null}
                      onClick={() => onRestoreVersion(version.id)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      {restoringVersionId === version.id
                        ? "Restoring..."
                        : "Restore this version"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Versions appear after you save this design.
            </p>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function formatVersionDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
