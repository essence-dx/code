"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCopy,
  DatabaseZap,
  Download,
  Eraser,
  FileJson2,
  ShieldCheck,
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
import { purgeCollaborationEventReplay } from "@/features/admin/actions";
import type {
  AdminCollaborationEventIngestionReport,
  AdminCollaborationEventStatus,
} from "@/features/admin/admin-collaboration-event-ingestion";
import {
  getAdminCollaborationEventIngestionCsv,
  getAdminCollaborationEventIngestionJson,
  getAdminCollaborationEventIngestionMarkdown,
} from "@/features/admin/admin-collaboration-event-ingestion-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminCollaborationEventIngestionPanelProps = {
  report: AdminCollaborationEventIngestionReport;
};

export function AdminCollaborationEventIngestionPanel({
  report,
}: AdminCollaborationEventIngestionPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  function exportJson() {
    downloadTextFile({
      content: getAdminCollaborationEventIngestionJson(report),
      filename: "collaboration-event-ingestion.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminCollaborationEventIngestionCsv(report),
      filename: "collaboration-event-ingestion.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminCollaborationEventIngestionMarkdown(report),
      filename: "collaboration-event-ingestion.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminCollaborationEventIngestionMarkdown(report),
    );
  }

  function purgeReplay() {
    setActionError(null);
    startTransition(() => {
      void purgeCollaborationEventReplay({
        retentionDays: report.retentionDays,
        note: `Purged stale collaboration replay payloads older than ${report.retentionDays} days after exporting event ingestion evidence.`,
      })
        .then(() => router.refresh())
        .catch((error) => {
          setActionError(
            error instanceof Error ? error.message : "Replay purge failed.",
          );
        });
    });
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <DatabaseZap className="size-4" />
            Collaboration event ingestion
          </CardTitle>
          <CardDescription>
            Privacy-safe durable event ledger, replay windows, incident
            retention, and workspace purge controls.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Badge variant="outline">
            <ShieldCheck className="size-3" />
            {report.redactedEventCount}/{report.durableEventCount} redacted
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Events" value={report.durableEventCount} />
          <Metric label="Presence" value={report.presenceEventCount} />
          <Metric label="Chat" value={report.chatEventCount} />
          <Metric label="Activity" value={report.activityEventCount} />
          <Metric label="Room actions" value={report.roomActionEventCount} />
          <Metric label="Purge queue" value={report.purgeCandidateCount} />
        </div>

        {actionError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {actionError}
          </div>
        ) : null}

        <div className="grid gap-3 xl:grid-cols-[1fr_0.85fr]">
          <div className="grid gap-2">
            {report.incidents.map((incident) => (
              <div
                key={incident.id}
                className="rounded-md border border-border bg-muted/20 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{incident.label}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant={getStatusVariant(incident.status)}>
                        {incident.status}
                      </Badge>
                      <Badge variant="outline">{incident.category}</Badge>
                      <Badge variant="outline">{incident.value}</Badge>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {incident.detail}
                </p>
                <p className="mt-2 text-xs">{incident.recommendation}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-2">
            {report.replayWindows.slice(0, 6).map((window) => (
              <div
                key={window.fileId}
                className="rounded-md border border-border bg-background p-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate font-medium">{window.fileName}</div>
                  <Badge variant={getStatusVariant(window.status)}>
                    {window.status}
                  </Badge>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Info label="Events" value={`${window.eventCount}`} />
                  <Info
                    label="Expires"
                    value={formatShortDate(window.retentionExpiresAt)}
                  />
                  <Info label="Chat" value={`${window.chatCount}`} />
                  <Info label="Presence" value={`${window.presenceCount}`} />
                </div>
                <p className="mt-2 text-muted-foreground">
                  {window.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-5">
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
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending || report.purgeCandidateCount === 0}
            onClick={purgeReplay}
          >
            <Eraser className="size-3.5" />
            {pending ? "Purging" : "Purge stale"}
          </Button>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-foreground">{value}</div>
    </div>
  );
}

function formatShortDate(value: string | null) {
  if (!value) {
    return "none";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getStatusVariant(status: AdminCollaborationEventStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
