"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BellRing, CheckCircle2, Download, FileJson2, History, Loader2, Mail, MessageSquareText, Route, Save, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BoardAssuranceNotificationDeliveryHistoryReport, BoardAssuranceNotificationDeliveryRecord } from "@/features/projects/board-assurance-notification-history";
import type {
  BoardAssuranceNotificationCandidate,
  BoardAssuranceNotificationRoute,
  BoardAssuranceNotificationRoutingReport,
  BoardAssuranceNotificationSeverity,
} from "@/features/projects/board-assurance-notification-routing";

function severityVariant(severity: BoardAssuranceNotificationSeverity) {
  if (severity === "critical") {
    return "destructive" as const;
  }

  return severity === "warning" ? "secondary" : "outline";
}

function StatusIcon({ severity }: { severity: BoardAssuranceNotificationSeverity }) {
  if (severity === "info") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return severity === "critical" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function SummaryTile({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function routeCounts(routes: BoardAssuranceNotificationRoute[], notificationId: string) {
  const eligible = routes.filter((route) => route.candidateId === notificationId && route.status === "eligible");

  return {
    email: eligible.filter((route) => route.channel === "email").length,
    inApp: eligible.filter((route) => route.channel === "in-app").length,
    total: eligible.length,
  };
}

function NotificationRow({ notification, routes }: { notification: BoardAssuranceNotificationCandidate; routes: BoardAssuranceNotificationRoute[] }) {
  const counts = routeCounts(routes, notification.id);

  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <BellRing className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{notification.title}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{notification.detail}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={severityVariant(notification.severity)}>
          <StatusIcon severity={notification.severity} />
          {notification.severity}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{notification.topic}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p className="font-medium">{counts.total} eligible</p>
        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Mail className="size-3" />
            {counts.email}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquareText className="size-3" />
            {counts.inApp}
          </span>
        </p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-3">{notification.actionLabel}</p>
      </TableCell>
    </TableRow>
  );
}

function HistoryRecordRow({ record, workspaceId }: { record: BoardAssuranceNotificationDeliveryRecord; workspaceId: string }) {
  return (
    <TableRow>
      <TableCell className="max-w-[260px] whitespace-normal">
        <p className="font-medium">{formatDate(record.createdAt)}</p>
        <p className="line-clamp-1 font-mono text-xs text-muted-foreground">{record.contentHash}</p>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={severityVariant(record.status)}>
          <StatusIcon severity={record.status} />
          {record.status}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{record.eligibleRouteCount} eligible</p>
        <p>{record.pendingAcknowledgementCount} pending ack, {record.retryNeededCount} retry</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{record.changedRouteCount} changed</p>
        <p>{record.newRouteCount} new, {record.removedRouteCount} removed</p>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          <a
            className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })}
            href={`/api/workspaces/${workspaceId}/board-assurance-notification-history/${record.id}?format=json`}
          >
            <FileJson2 className="size-3.5" />
            JSON
          </a>
          <a
            className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })}
            href={`/api/workspaces/${workspaceId}/board-assurance-notification-history/${record.id}?format=csv`}
          >
            <Download className="size-3.5" />
            CSV
          </a>
        </div>
      </TableCell>
    </TableRow>
  );
}

function RoutePreviewRow({ route }: { route: BoardAssuranceNotificationRoute }) {
  return (
    <TableRow>
      <TableCell className="whitespace-normal">
        <p className="font-medium">{route.recipientName}</p>
        <p className="text-xs text-muted-foreground">{route.recipientEmail}</p>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant={route.status === "eligible" ? "outline" : route.status === "suppressed-by-role" ? "destructive" : "secondary"}>
          {route.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{route.recipientRole}</p>
      </TableCell>
      <TableCell className="text-sm">
        <span className="inline-flex items-center gap-1">
          {route.channel === "email" ? <Mail className="size-3.5" /> : <MessageSquareText className="size-3.5" />}
          {route.channel}
        </span>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{route.reason}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardAssuranceNotificationRoutingPanel({
  canPersist,
  history,
  report,
  workspaceId,
}: {
  canPersist?: boolean;
  history?: BoardAssuranceNotificationDeliveryHistoryReport | null;
  report: BoardAssuranceNotificationRoutingReport;
  workspaceId?: string;
}) {
  const [deliveryHistory, setDeliveryHistory] = useState(history ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const visibleNotifications = report.notifications.slice(0, 8);
  const visibleRoutes = report.routes.filter((route) => route.status !== "eligible").slice(0, 8);

  async function saveHistory() {
    if (!canPersist || !workspaceId || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/board-assurance-notification-history`, {
        body: JSON.stringify({ report }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; history?: BoardAssuranceNotificationDeliveryHistoryReport } | null;

      if (!response.ok || !payload?.history) {
        throw new Error(payload?.error ?? "Board assurance notification history could not be saved.");
      }

      setDeliveryHistory(payload.history);
      toast.success("Board assurance notification history saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Board assurance notification history could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Route className="size-4" />
              Board assurance routing
            </CardTitle>
            <CardDescription>Recipient routing for replay blockers, expiring exceptions, and evidence bundle readiness.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={severityVariant(report.summary.status)}>
              <StatusIcon severity={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.routingScore < 45 ? "destructive" : "outline"}>
              {report.summary.routingScore}/100 routing
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
            {deliveryHistory ? (
              <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={deliveryHistory.csvFileName} href={deliveryHistory.csvDataUri}>
                <History className="size-4" />
                History CSV
              </a>
            ) : null}
            {canPersist && workspaceId ? (
              <Button className="h-8 gap-2" disabled={isSaving} onClick={saveHistory} size="sm" type="button" variant="outline">
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save history
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail={`${report.summary.criticalCount} critical`} label="Notifications" value={`${report.summary.notificationCount}`} />
          <SummaryTile detail="routable recipients" label="Eligible" value={`${report.summary.eligibleRouteCount}`} />
          <SummaryTile detail="Brevo-ready channel" label="Email" value={`${report.summary.emailEligibleCount}`} />
          <SummaryTile detail="dashboard channel" label="In-app" value={`${report.summary.inAppEligibleCount}`} />
          <SummaryTile detail="topic permission" label="Role stops" value={`${report.summary.suppressedByRoleCount}`} />
          <SummaryTile detail="saved preferences" label="Preference stops" value={`${report.summary.suppressedByPreferenceCount}`} />
        </div>

        {deliveryHistory ? (
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <SummaryTile detail={formatDate(deliveryHistory.summary.latestSavedAt)} label="History" value={`${deliveryHistory.summary.totalRecordCount}`} />
            <SummaryTile detail="latest record" label="Pending ack" value={`${deliveryHistory.summary.pendingAcknowledgementCount}`} />
            <SummaryTile detail="email retries" label="Retry" value={`${deliveryHistory.summary.latestRetryNeededCount}`} />
            <SummaryTile detail="latest diff" label="Changed" value={`${deliveryHistory.summary.latestChangedRouteCount}`} />
            <SummaryTile detail="latest diff" label="Removed" value={`${deliveryHistory.summary.latestRemovedRouteCount}`} />
            <SummaryTile detail="vs previous save" label="Route delta" value={`${deliveryHistory.summary.routeDelta}`} />
          </div>
        ) : null}

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Routing next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        {visibleNotifications.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Notification</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Routes</TableHead>
                <TableHead>Next action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleNotifications.map((notification) => (
                <NotificationRow key={notification.id} notification={notification} routes={report.routes} />
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4" />
            No board assurance notifications need routing for the current packet.
          </div>
        )}

        {visibleRoutes.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{visibleRoutes.map((route) => <RoutePreviewRow key={`${route.candidateId}:${route.userId}:${route.channel}`} route={route} />)}</TableBody>
          </Table>
        ) : null}

        {deliveryHistory ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Saved</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Routes</TableHead>
                <TableHead>Diff</TableHead>
                <TableHead>Files</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveryHistory.records.length > 0 ? (
                deliveryHistory.records
                  .slice(0, 6)
                  .map((record) => <HistoryRecordRow key={record.id} record={record} workspaceId={workspaceId ?? report.workspaceId} />)
              ) : (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={5}>
                    No board assurance notification history is saved yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}
