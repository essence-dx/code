import { BellRing, CheckCircle2, Download, Mail, MessageSquareText, Route, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardAuditReminderCandidate,
  BoardAuditReminderRoute,
  BoardAuditReminderRoutingReport,
  BoardAuditReminderSeverity,
} from "@/features/projects/board-audit-reminder-routing";

function severityVariant(severity: BoardAuditReminderSeverity | BoardAuditReminderRoutingReport["summary"]["status"]) {
  if (severity === "critical") {
    return "destructive" as const;
  }

  return severity === "warning" ? "secondary" : "outline";
}

function StatusIcon({ severity }: { severity: BoardAuditReminderSeverity | BoardAuditReminderRoutingReport["summary"]["status"] }) {
  if (severity === "ready") {
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

function routeCounts(routes: BoardAuditReminderRoute[], reminderId: string) {
  const eligible = routes.filter((route) => route.reminderId === reminderId && route.status === "eligible");

  return {
    email: eligible.filter((route) => route.channel === "email").length,
    inApp: eligible.filter((route) => route.channel === "in-app").length,
    total: eligible.length,
  };
}

function ReminderRow({ reminder, routes }: { reminder: BoardAuditReminderCandidate; routes: BoardAuditReminderRoute[] }) {
  const counts = routeCounts(routes, reminder.id);

  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <BellRing className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{reminder.title}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{reminder.detail}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={severityVariant(reminder.severity)}>
          <StatusIcon severity={reminder.severity} />
          {reminder.severity}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{reminder.dueAt.slice(0, 10)}</p>
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
        <p className="line-clamp-3">{reminder.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

function RoutePreviewRow({ route }: { route: BoardAuditReminderRoute }) {
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

export function BoardAuditReminderRoutingPanel({ report }: { report: BoardAuditReminderRoutingReport }) {
  const visibleReminders = report.reminders.slice(0, 8);
  const visibleRoutes = report.routes.filter((route) => route.status !== "eligible").slice(0, 8);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Route className="size-4" />
              Board audit reminder routing
            </CardTitle>
            <CardDescription>Overdue follow-up task reminders routed through workspace notification preferences.</CardDescription>
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
          <SummaryTile detail={`${report.summary.criticalCount} critical`} label="Reminders" value={`${report.summary.reminderCount}`} />
          <SummaryTile detail="overdue tasks" label="Overdue" value={`${report.summary.overdueTaskCount}`} />
          <SummaryTile detail="routable recipients" label="Eligible" value={`${report.summary.eligibleRouteCount}`} />
          <SummaryTile detail="email channel" label="Email" value={`${report.summary.emailEligibleCount}`} />
          <SummaryTile detail="dashboard channel" label="In-app" value={`${report.summary.inAppEligibleCount}`} />
          <SummaryTile detail="saved preferences" label="Preference stops" value={`${report.summary.suppressedByPreferenceCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Reminder next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        {visibleReminders.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reminder</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Routes</TableHead>
                <TableHead>Next action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleReminders.map((reminder) => (
                <ReminderRow key={reminder.id} reminder={reminder} routes={report.routes} />
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4" />
            No overdue board audit reminders need routing.
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
            <TableBody>{visibleRoutes.map((route) => <RoutePreviewRow key={`${route.reminderId}:${route.userId}:${route.channel}`} route={route} />)}</TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}
