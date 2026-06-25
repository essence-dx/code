import { BellRing, CheckCircle2, Download, Mail, MessageSquareText, Route, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveIntelligenceNotificationCandidate,
  BoardReleaseArchiveIntelligenceNotificationRoute,
  BoardReleaseArchiveIntelligenceNotificationRoutingReport,
  BoardReleaseArchiveIntelligenceNotificationSeverity,
} from "@/features/projects/board-release-archive-intelligence-notification-routing";

function severityVariant(severity: BoardReleaseArchiveIntelligenceNotificationSeverity) {
  if (severity === "critical") {
    return "destructive" as const;
  }

  return severity === "warning" ? "secondary" : "outline";
}

function StatusIcon({ severity }: { severity: BoardReleaseArchiveIntelligenceNotificationSeverity }) {
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

function routeCounts(routes: BoardReleaseArchiveIntelligenceNotificationRoute[], notificationId: string) {
  const eligible = routes.filter((route) => route.candidateId === notificationId && route.status === "eligible");

  return {
    email: eligible.filter((route) => route.channel === "email").length,
    inApp: eligible.filter((route) => route.channel === "in-app").length,
    total: eligible.length,
  };
}

function NotificationRow({
  notification,
  routes,
}: {
  notification: BoardReleaseArchiveIntelligenceNotificationCandidate;
  routes: BoardReleaseArchiveIntelligenceNotificationRoute[];
}) {
  const counts = routeCounts(routes, notification.id);

  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
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
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-3">{notification.actionLabel}</p>
        <p className="mt-1 truncate font-mono">{notification.sourceHash}</p>
      </TableCell>
    </TableRow>
  );
}

function RoutePreviewRow({ route }: { route: BoardReleaseArchiveIntelligenceNotificationRoute }) {
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
      <TableCell className="max-w-[380px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{route.reason}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveIntelligenceNotificationRoutingPanel({
  report,
}: {
  report: BoardReleaseArchiveIntelligenceNotificationRoutingReport;
}) {
  const visibleRoutes = report.routes.filter((route) => route.status !== "eligible").slice(0, 8);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Route className="size-4" />
              Archive intelligence routing
            </CardTitle>
            <CardDescription>Role and preference aware routing for blocked archive intelligence recommendations.</CardDescription>
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
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail={`${report.summary.criticalCount} critical`} label="Notifications" value={`${report.summary.notificationCount}`} />
          <SummaryTile detail="all generated routes" label="Routes" value={`${report.summary.routeCount}`} />
          <SummaryTile detail="email and in-app" label="Eligible" value={`${report.summary.eligibleRouteCount}`} />
          <SummaryTile detail="email routes" label="Email" value={`${report.summary.emailEligibleCount}`} />
          <SummaryTile detail="in-app routes" label="In-app" value={`${report.summary.inAppEligibleCount}`} />
          <SummaryTile detail="preference + role" label="Suppressed" value={`${report.summary.suppressedByPreferenceCount + report.summary.suppressedByRoleCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Routing next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Notification</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Eligible</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.notifications.length > 0 ? (
              report.notifications.map((notification) => <NotificationRow key={notification.id} notification={notification} routes={report.routes} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={4}>
                  No archive intelligence recommendations need routing.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

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
            <TableBody>
              {visibleRoutes.map((route) => (
                <RoutePreviewRow key={route.dedupeKey} route={route} />
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}
