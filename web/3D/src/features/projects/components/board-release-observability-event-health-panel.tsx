import { Activity, CheckCircle2, Download, FileJson2, HeartPulse, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseObservabilityEventHealthMonitor,
  BoardReleaseObservabilityEventHealthReport,
  BoardReleaseObservabilityEventHealthStatus,
} from "@/features/projects/board-release-observability-event-health";

function statusVariant(status: BoardReleaseObservabilityEventHealthStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseObservabilityEventHealthStatus }) {
  if (status === "healthy") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(value));
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

function MonitorRow({ monitor }: { monitor: BoardReleaseObservabilityEventHealthMonitor }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Activity className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{monitor.title}</p>
            <p className="truncate text-xs text-muted-foreground">{monitor.signal}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(monitor.status)}>
          <StatusIcon status={monitor.status} />
          {monitor.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{monitor.severity}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{formatDate(monitor.lastSeenAt)}</p>
        <p>{monitor.releasePromotionId ?? "Unassigned release"}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{monitor.nextAction}</p>
        <p className="mt-1 truncate font-mono">{monitor.monitorHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseObservabilityEventHealthPanel({ report }: { report: BoardReleaseObservabilityEventHealthReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="size-4" />
              Board release observability event health
            </CardTitle>
            <CardDescription>Monitors stale packets, stuck acknowledgements, delayed retries, and unresolved variance closure.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.monitorCount} monitors
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.jsonFileName} href={report.jsonDataUri}>
              <FileJson2 className="size-4" />
              JSON
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <SummaryTile detail="health monitors" label="Monitors" value={`${report.summary.monitorCount}`} />
          <SummaryTile detail="needs repair" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="watch signals" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="healthy signals" label="Healthy" value={`${report.summary.healthyCount}`} />
          <SummaryTile detail="critical" label="Critical" value={`${report.summary.criticalCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Event health next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Monitor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.monitors.map((monitor) => <MonitorRow key={monitor.monitorId} monitor={monitor} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
