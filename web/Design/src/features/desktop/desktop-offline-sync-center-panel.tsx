"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  ExternalLink,
  FolderSync,
  FileWarning,
  HardDriveDownload,
  RefreshCcw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type {
  DesktopOfflineSyncCenter,
  DesktopOfflineSyncQueueItem,
  DesktopOfflineSyncStatus,
} from "@/features/desktop/desktop-offline-sync-center";

type DesktopOfflineSyncCenterPanelProps = {
  center: DesktopOfflineSyncCenter;
};

const statusLabel: Record<DesktopOfflineSyncStatus, string> = {
  ready: "Ready",
  attention: "Attention",
  blocked: "Blocked",
};

const statusVariant: Record<
  DesktopOfflineSyncStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  attention: "outline",
  blocked: "destructive",
};

export function DesktopOfflineSyncCenterPanel({
  center,
}: DesktopOfflineSyncCenterPanelProps) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDriveDownload className="h-5 w-5" />
              Desktop sync queue
            </CardTitle>
            <CardDescription>
              Offline handoff, conflict checks, resumable uploads, and export
              recovery.
            </CardDescription>
          </div>
          <Badge variant={statusVariant[center.status]}>
            {center.score}/100 {statusLabel[center.status]}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          <SyncMetric label="Queue" value={center.totals.queueItems} />
          <SyncMetric label="Conflicts" value={center.totals.conflicts} />
          <SyncMetric
            label="Uploads"
            value={center.totals.resumableUploads}
          />
          <SyncMetric label="Exports" value={center.totals.exportHandoffs} />
          <SyncMetric label="Batch" value={center.totals.batchExports} />
          <SyncMetric label="Watched" value={center.totals.watchedFolders} />
          <SyncMetric label="Integrity" value={center.totals.integrityIssues} />
          <SyncMetric label="Audits" value={center.totals.auditEvents} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs defaultValue="queue" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 md:w-fit">
            <TabsTrigger value="queue">Queue</TabsTrigger>
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
            <TabsTrigger value="next">Next</TabsTrigger>
          </TabsList>

          <TabsContent value="queue">
            {center.queue.length ? (
              <ScrollArea className="h-[360px] rounded-md border border-border">
                <div className="divide-y divide-border">
                  {center.queue.map((item) => (
                    <SyncQueueRow key={item.id} item={item} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <EmptyState text="No desktop or offline handoff work is waiting." />
            )}
          </TabsContent>

          <TabsContent value="diagnostics">
            <div className="grid gap-3 md:grid-cols-2">
              {center.diagnostics.map((diagnostic) => (
                <div
                  key={diagnostic.id}
                  className="rounded-md border border-border bg-muted/20 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {diagnostic.label}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {diagnostic.detail}
                      </p>
                    </div>
                    <Badge variant={statusVariant[diagnostic.status]}>
                      {diagnostic.value}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="next">
            <div className="grid gap-2">
              {center.nextActions.map((action) => (
                <p
                  key={action}
                  className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground"
                >
                  {action}
                </p>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function SyncQueueRow({ item }: { item: DesktopOfflineSyncQueueItem }) {
  const Icon = getQueueIcon(item);

  return (
    <article className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <p className="truncate text-sm font-semibold">{item.title}</p>
          <Badge variant={statusVariant[item.status]}>
            {statusLabel[item.status]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{item.detail}</p>
        <div className="h-2 max-w-md overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.max(6, Math.min(item.progress, 100))}%` }}
          />
        </div>
        <div className="grid gap-1">
          {item.diagnostics.slice(0, 2).map((diagnostic) => (
            <p key={diagnostic} className="text-xs text-muted-foreground">
              {diagnostic}
            </p>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <p className="text-xs text-muted-foreground">
          {formatSyncTime(item.updatedAt)}
        </p>
        {item.href ? (
          <Button asChild variant="outline" size="sm">
            <a href={item.href}>
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function SyncMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function getQueueIcon(item: DesktopOfflineSyncQueueItem) {
  if (item.kind === "conflict-resolution") return AlertTriangle;
  if (item.kind === "asset-upload") return CloudUpload;
  if (item.kind === "export-handoff") return RefreshCcw;
  if (item.kind === "batch-export") return RefreshCcw;
  if (item.kind === "watched-folder") return FolderSync;
  if (item.kind === "integrity-check") return FileWarning;
  if (item.kind === "desktop-cache") return HardDriveDownload;
  if (item.status === "ready") return CheckCircle2;

  return FileWarning;
}

function formatSyncTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Just now";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
