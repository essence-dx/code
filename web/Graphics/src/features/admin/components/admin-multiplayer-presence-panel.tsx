"use client";

import type { ReactNode } from "react";
import {
  Activity,
  ClipboardCopy,
  Download,
  FileJson2,
  RadioTower,
  RefreshCcw,
  Save,
  Users,
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
import type {
  AdminMultiplayerPresenceReport,
  AdminMultiplayerPresenceStatus,
} from "@/features/admin/admin-multiplayer-presence";
import {
  getAdminMultiplayerPresenceCsv,
  getAdminMultiplayerPresenceJson,
  getAdminMultiplayerPresenceMarkdown,
} from "@/features/admin/admin-multiplayer-presence";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminMultiplayerPresencePanelProps = {
  report: AdminMultiplayerPresenceReport;
};

export function AdminMultiplayerPresencePanel({
  report,
}: AdminMultiplayerPresencePanelProps) {
  function exportJson() {
    downloadTextFile({
      content: getAdminMultiplayerPresenceJson(report),
      filename: "admin-multiplayer-presence.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminMultiplayerPresenceCsv(report),
      filename: "admin-multiplayer-presence.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminMultiplayerPresenceMarkdown(report),
      filename: "admin-multiplayer-presence.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminMultiplayerPresenceMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <RadioTower className="size-4" />
            Multiplayer presence operations
          </CardTitle>
          <CardDescription>
            Presence and cursor evidence, follow/spotlight ownership, stale-room
            recovery, and save-conflict visibility for active rooms.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Button type="button" size="sm" variant="outline" onClick={exportJson}>
            <FileJson2 className="size-3.5" />
            JSON
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
            <Download className="size-3.5" />
            CSV
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={exportMarkdown}
          >
            <Download className="size-3.5" />
            MD
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={copyMarkdown}
          >
            <ClipboardCopy className="size-3.5" />
            Copy
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Rooms" value={report.roomCount} />
          <Metric label="Cursor evidence" value={report.cursorEvidenceCount} />
          <Metric label="Spotlight" value={report.spotlightEventCount} />
          <Metric label="Follow" value={report.followEventCount} />
          <Metric label="Stale recovery" value={report.staleRecoveryQueueCount} />
          <Metric label="Save conflicts" value={report.saveConflictCount} />
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          {report.rows.map((row) => (
            <div
              key={row.id}
              className="rounded-md border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{row.label}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.detail}
                  </p>
                </div>
                <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <Badge variant="outline">{row.value}</Badge>
                {row.target ? <Badge variant="outline">{row.target}</Badge> : null}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {row.recommendation}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {report.rooms.slice(0, 8).map((room) => (
            <div
              key={room.id}
              className="rounded-md border border-border bg-background p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium">
                    <Users className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{room.fileName}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {room.presenterSummary}
                  </p>
                </div>
                <Badge variant={getStatusVariant(room.status)}>
                  {room.status}
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                <Info
                  icon={<Activity className="size-3.5" />}
                  label="Presence"
                  value={`${room.cursorEvidenceCount}`}
                />
                <Info
                  icon={<RadioTower className="size-3.5" />}
                  label="Spot/follow"
                  value={`${room.spotlightEventCount}/${room.followEventCount}`}
                />
                <Info
                  icon={<RefreshCcw className="size-3.5" />}
                  label="Recovery"
                  value={room.staleRecoveryStatus}
                />
                <Info
                  icon={<Save className="size-3.5" />}
                  label="Conflicts"
                  value={`${room.saveConflictCount}`}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {room.recommendation}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 font-mono text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: AdminMultiplayerPresenceStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
