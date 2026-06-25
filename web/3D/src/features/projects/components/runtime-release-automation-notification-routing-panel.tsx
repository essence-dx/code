import { BellRing, CheckCircle2, Download, FileJson2, Mail, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  RuntimeReleaseAutomationNotificationFileFormat,
  RuntimeReleaseAutomationNotificationRoutingReport,
  RuntimeReleaseAutomationNotificationSeverity,
} from "@/features/projects/runtime-release-automation-notification-routing";

function severityVariant(severity: RuntimeReleaseAutomationNotificationSeverity) {
  return severity === "critical" ? "destructive" : "outline";
}

function SeverityIcon({ severity }: { severity: RuntimeReleaseAutomationNotificationSeverity }) {
  return severity === "critical" ? <TriangleAlert className="size-3.5" /> : <CheckCircle2 className="size-3.5" />;
}

function FileIcon({ format }: { format: RuntimeReleaseAutomationNotificationFileFormat }) {
  return format === "json" ? <FileJson2 className="size-4" /> : <Table2 className="size-4" />;
}

export function RuntimeReleaseAutomationNotificationRoutingPanel({ report }: { report: RuntimeReleaseAutomationNotificationRoutingReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="size-4" />
              Automation notification routing
            </CardTitle>
            <CardDescription>Release automation routes for overdue queue rows, stale approvals, and candidate comparison regressions.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={severityVariant(report.summary.status)}>
              <SeverityIcon severity={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.routingScore < 100 ? "destructive" : "outline"}>
              {report.summary.routingScore}/100 routing
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 xl:grid-cols-3">
          {report.notifications.map((notification) => (
            <div key={notification.id} className="rounded-md border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{notification.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{notification.detail}</p>
                </div>
                <Badge className="shrink-0 gap-1 rounded-md" variant={severityVariant(notification.severity)}>
                  <SeverityIcon severity={notification.severity} />
                  {notification.severity}
                </Badge>
              </div>
              <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{notification.sourceHash}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="gap-1 rounded-md" variant="outline">
            <Mail className="size-3.5" />
            {report.summary.emailEligibleCount} email
          </Badge>
          <Badge className="gap-1 rounded-md" variant="outline">
            <BellRing className="size-3.5" />
            {report.summary.inAppEligibleCount} in-app
          </Badge>
          {report.files.map((file) => (
            <Button key={file.format} render={<a download={file.download} href={file.href} />} className="gap-2" size="sm" variant="outline">
              <FileIcon format={file.format} />
              {file.label}
            </Button>
          ))}
          <Badge className="gap-1 rounded-md" variant="outline">
            <Download className="size-3.5" />
            {report.summary.routingHash}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
