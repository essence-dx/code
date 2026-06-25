"use client";

import { FolderOpen, HardDriveDownload, Save, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type {
  DesktopFileBridgeState,
  useDesktopFileBridge,
} from "@/features/desktop/use-desktop-file-bridge";

type DesktopBridge = ReturnType<typeof useDesktopFileBridge>;

type DesktopFileBridgeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bridge: DesktopBridge;
};

const stateCopy: Record<DesktopFileBridgeState, string> = {
  idle: "Ready",
  saving: "Saving",
  saved: "Saved",
  opening: "Opening",
  opened: "Opened",
  caching: "Caching",
  cached: "Cached",
  error: "Needs attention",
};

export function DesktopFileBridgeDialog({
  open,
  onOpenChange,
  bridge,
}: DesktopFileBridgeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Desktop files</DialogTitle>
          <DialogDescription>
            Open, save, and cache this design on this computer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <Badge variant={bridge.state === "error" ? "destructive" : "secondary"}>
              {stateCopy[bridge.state]}
            </Badge>
            {bridge.cachedAssetCount > 0 ? (
              <Badge variant="outline">{bridge.cachedAssetCount} assets</Badge>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="desktop-file-path">
              File path
            </label>
            <Input
              id="desktop-file-path"
              value={bridge.filePath}
              placeholder={`G:\\Designs\\${bridge.suggestedFileName}`}
              onChange={(event) => bridge.setFilePath(event.target.value)}
            />
            {bridge.message ? (
              <p className="text-sm text-muted-foreground">{bridge.message}</p>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              onClick={() => void bridge.saveAsDesktopFile()}
              disabled={bridge.state === "saving"}
            >
              <Save className="h-4 w-4" />
              Save as
            </Button>
            <Button
              variant="outline"
              onClick={() => void bridge.openFromDesktopFile()}
              disabled={bridge.state === "opening"}
            >
              <FolderOpen className="h-4 w-4" />
              Open
            </Button>
            <Button
              variant="outline"
              onClick={() => void bridge.cacheOfflineAssets()}
              disabled={bridge.state === "caching"}
            >
              <HardDriveDownload className="h-4 w-4" />
              Cache assets
            </Button>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Recent files</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void bridge.refreshRecentFiles()}
              >
                Refresh
              </Button>
            </div>
            <ScrollArea className="max-h-64 rounded-md border">
              {bridge.recentFiles.length ? (
                <div className="divide-y">
                  {bridge.recentFiles.map((file) => (
                    <div
                      key={file.filePath}
                      className="grid gap-3 p-3 sm:grid-cols-[1fr_auto]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {file.projectName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {file.filePath}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void bridge.openFromDesktopFile(file.filePath)
                          }
                        >
                          <FolderOpen className="h-4 w-4" />
                          Open
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Remove ${file.projectName} from recent files`}
                          onClick={() =>
                            void bridge.removeRecentFile(file.filePath)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="p-4 text-sm text-muted-foreground">
                  No recent local files.
                </p>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
