"use client";

import type { ReactNode } from "react";
import {
  BellRing,
  ClipboardCopy,
  Download,
  FileJson2,
  MailWarning,
  MessageSquareText,
  RotateCcw,
  ShieldOff,
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
  AdminExternalCommentNotificationWorkflowStatus,
  AdminExternalCommentNotificationWorkflowsReport,
} from "@/features/admin/admin-external-comment-notification-workflows";
import {
  getAdminExternalCommentNotificationWorkflowsCsv,
  getAdminExternalCommentNotificationWorkflowsJson,
  getAdminExternalCommentNotificationWorkflowsMarkdown,
} from "@/features/admin/admin-external-comment-notification-workflows";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminExternalCommentNotificationWorkflowsPanelProps = {
  report: AdminExternalCommentNotificationWorkflowsReport;
};

export function AdminExternalCommentNotificationWorkflowsPanel({
  report,
}: AdminExternalCommentNotificationWorkflowsPanelProps) {
  function exportJson() {
    downloadTextFile({
      content: getAdminExternalCommentNotificationWorkflowsJson(report),
      filename: "admin-external-comment-notification-workflows.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminExternalCommentNotificationWorkflowsCsv(report),
      filename: "admin-external-comment-notification-workflows.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminExternalCommentNotificationWorkflowsMarkdown(report),
      filename: "admin-external-comment-notification-workflows.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminExternalCommentNotificationWorkflowsMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="size-4" />
            External comment notification workflows
          </CardTitle>
          <CardDescription>
            Delivery retry queues, digest previews, mention routing, and
            suppression review for external comment recipients.
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
          <Metric label="Deliveries" value={report.deliveryCount} />
          <Metric label="Failed" value={report.failedDeliveryCount} />
          <Metric label="Retries" value={report.retryQueueCount} />
          <Metric label="Digest previews" value={report.digestPreviewCount} />
          <Metric label="Unrouted" value={report.unroutedMentionCount} />
          <Metric label="Suppressed" value={report.suppressedRecipientCount} />
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

        <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
          <QueueCard
            icon={<RotateCcw className="size-4" />}
            title="Retry queue"
            count={report.retryQueue.length}
          >
            {report.retryQueue.slice(0, 6).map((item) => (
              <EvidenceRow
                key={item.id}
                status={item.status}
                title={`${item.kind} to ${item.recipientEmail}`}
                detail={`${item.fileName} has ${item.attemptCount} failed attempt${item.attemptCount === 1 ? "" : "s"}: ${item.lastReason}`}
              />
            ))}
          </QueueCard>

          <QueueCard
            icon={<MessageSquareText className="size-4" />}
            title="Mention routing"
            count={report.mentionRoutes.length}
          >
            {report.mentionRoutes.slice(0, 6).map((route) => (
              <EvidenceRow
                key={route.id}
                status={route.status}
                title={`${route.mentionedEmail} / ${route.deliveryStatus}`}
                detail={`${route.fileName}: ${route.recommendation}`}
              />
            ))}
          </QueueCard>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
          <QueueCard
            icon={<MailWarning className="size-4" />}
            title="Digest previews"
            count={report.digestPreviews.length}
          >
            {report.digestPreviews.slice(0, 4).map((preview) => (
              <EvidenceRow
                key={preview.id}
                status={preview.status}
                title={preview.subject}
                detail={`${preview.recipientEmail}: ${preview.signalCount} signals`}
              />
            ))}
          </QueueCard>

          <QueueCard
            icon={<ShieldOff className="size-4" />}
            title="Suppression controls"
            count={report.suppressionControls.length}
          >
            {report.suppressionControls.slice(0, 6).map((control) => (
              <EvidenceRow
                key={control.id}
                status={control.status}
                title={control.mutedEmail ?? "File-level notifications"}
                detail={`${control.fileName}: ${control.reason}`}
              />
            ))}
          </QueueCard>
        </div>
      </CardContent>
    </Card>
  );
}

function QueueCard({
  children,
  count,
  icon,
  title,
}: {
  children: ReactNode;
  count: number;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2 text-sm font-medium">
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </div>
        <Badge variant="outline">{count}</Badge>
      </div>
      <div className="mt-3 grid gap-2">{children}</div>
    </div>
  );
}

function EvidenceRow({
  detail,
  status,
  title,
}: {
  detail: string;
  status: AdminExternalCommentNotificationWorkflowStatus;
  title: string;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="font-medium">{title}</div>
        <Badge variant={getStatusVariant(status)}>{status}</Badge>
      </div>
      <p className="mt-1 text-muted-foreground">{detail}</p>
    </div>
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

function getStatusVariant(
  status: AdminExternalCommentNotificationWorkflowStatus,
) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
