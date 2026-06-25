"use client";

import type { ReactNode } from "react";
import {
  AtSign,
  BellRing,
  CalendarCheck2,
  ClipboardCopy,
  Download,
  FileJson2,
  LifeBuoy,
  MessageSquareText,
  Settings2,
  SmilePlus,
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
  AdminCollaborationNotificationPreferenceCategory,
  AdminCollaborationNotificationPreferenceCenterReport,
  AdminCollaborationNotificationPreferenceStatus,
} from "@/features/admin/admin-collaboration-notification-preference-center";
import {
  getAdminCollaborationNotificationPreferenceCenterCsv,
  getAdminCollaborationNotificationPreferenceCenterJson,
  getAdminCollaborationNotificationPreferenceCenterMarkdown,
} from "@/features/admin/admin-collaboration-notification-preference-center";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminCollaborationNotificationPreferenceCenterPanelProps = {
  report: AdminCollaborationNotificationPreferenceCenterReport;
};

export function AdminCollaborationNotificationPreferenceCenterPanel({
  report,
}: AdminCollaborationNotificationPreferenceCenterPanelProps) {
  function exportJson() {
    downloadTextFile({
      content: getAdminCollaborationNotificationPreferenceCenterJson(report),
      filename: "admin-collaboration-notification-preference-center.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminCollaborationNotificationPreferenceCenterCsv(report),
      filename: "admin-collaboration-notification-preference-center.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminCollaborationNotificationPreferenceCenterMarkdown(report),
      filename: "admin-collaboration-notification-preference-center.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminCollaborationNotificationPreferenceCenterMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="size-4" />
            Collaboration notification preference center
          </CardTitle>
          <CardDescription>
            Preference coverage for reactions, cursor chat, review sessions,
            mentions, digests, and recovery packet alerts.
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
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-7">
          <Metric label="Categories" value={report.categoryCount} />
          <Metric label="Scopes" value={report.preferenceScopeCount} />
          <Metric label="Blocked" value={report.blockedPreferenceCount} />
          <Metric label="Suppressed" value={report.suppressedPreferenceCount} />
          <Metric label="Signals" value={report.alertSignalCount} />
          <Metric label="Digest recipients" value={report.digestRecipientCount} />
          <Metric label="Alert gaps" value={report.alertGapCount} />
        </div>

        <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
          {report.rows.map((row) => (
            <div
              key={row.id}
              className="rounded-md border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2 font-medium">
                  {getCategoryIcon(row.category)}
                  <span>{row.label}</span>
                </div>
                <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{row.detail}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                <Badge variant="outline">{row.value}</Badge>
                <Badge variant="outline">{row.count} gaps</Badge>
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
            icon={<Settings2 className="size-4" />}
            title="Preference scopes"
            count={report.preferences.length}
          >
            {report.preferences.slice(0, 8).map((preference) => (
              <EvidenceRow
                key={preference.id}
                status={preference.status}
                title={`${preference.label} / ${preference.state}`}
                detail={`${preference.signalCount} signals, ${preference.blockedSignalCount} blocked. ${preference.recommendation}`}
              />
            ))}
          </QueueCard>

          <QueueCard
            icon={<LifeBuoy className="size-4" />}
            title="Alert gaps"
            count={report.alertGaps.length}
          >
            {report.alertGaps.slice(0, 8).map((gap) => (
              <EvidenceRow
                key={gap.id}
                status={gap.status}
                title={`${gap.label} / ${gap.target}`}
                detail={`${gap.detail} ${gap.command}`}
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
  status: AdminCollaborationNotificationPreferenceStatus;
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function getCategoryIcon(
  category: AdminCollaborationNotificationPreferenceCategory,
) {
  if (category === "reactions") {
    return <SmilePlus className="size-4" />;
  }

  if (category === "cursor-chat") {
    return <MessageSquareText className="size-4" />;
  }

  if (category === "review-sessions") {
    return <CalendarCheck2 className="size-4" />;
  }

  if (category === "mentions") {
    return <AtSign className="size-4" />;
  }

  if (category === "recovery-packets") {
    return <LifeBuoy className="size-4" />;
  }

  return <BellRing className="size-4" />;
}

function getStatusVariant(status: AdminCollaborationNotificationPreferenceStatus) {
  if (status === "ready") {
    return "default";
  }

  if (status === "review") {
    return "secondary";
  }

  return "destructive";
}
