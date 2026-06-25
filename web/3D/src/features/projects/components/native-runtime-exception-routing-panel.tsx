import { AlertTriangle, CheckCircle2, Download, FileJson2, Route, ShieldAlert, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  NativeRuntimeExceptionRouteRow,
  NativeRuntimeExceptionRoutingFileFormat,
  NativeRuntimeExceptionRoutingReport,
  NativeRuntimeExceptionRoutingStatus,
} from "@/features/projects/native-runtime-exception-routing";

function statusVariant(status: NativeRuntimeExceptionRoutingStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: NativeRuntimeExceptionRoutingStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function FileIcon({ format }: { format: NativeRuntimeExceptionRoutingFileFormat }) {
  return format === "json" ? <FileJson2 className="size-4" /> : <Table2 className="size-4" />;
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

function ExceptionRow({ row }: { row: NativeRuntimeExceptionRouteRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <AlertTriangle className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.kind}</p>
            <p className="truncate text-xs text-muted-foreground">{row.sourceId}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[280px] whitespace-normal text-xs text-muted-foreground">
        <p>{row.routeTarget}</p>
        <p className="mt-1">Eligible: {row.routeEligible ? "yes" : "no"}</p>
        <p className="mt-1">Severity: {row.severity}</p>
      </TableCell>
      <TableCell className="max-w-[280px] whitespace-normal text-xs text-muted-foreground">
        <p>{row.owner}</p>
        <p className="mt-1">{row.dueAt}</p>
        <p className="mt-1">{row.ageHours}h old</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.routingHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function NativeRuntimeExceptionRoutingPanel({ report }: { report: NativeRuntimeExceptionRoutingReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Route className="size-4" />
              Native runtime exception routing
            </CardTitle>
            <CardDescription>Routes missing signatures, failed CAD workers, install rehearsal regressions, and stale artifact approvals to native release owners.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.routingScore < 80 ? "destructive" : "outline"}>
              {report.summary.routingScore}/100 routing
            </Badge>
            {report.files.map((file) => (
              <Button key={file.format} render={<a download={file.download} href={file.href} />} className="h-8 gap-2" size="sm" variant="outline">
                <FileIcon format={file.format} />
                {file.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail="exception rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="route eligible" label="Routed" value={`${report.summary.routedCount}`} />
          <SummaryTile detail="critical, blocked, or stale" label="Escalate" value={`${report.summary.escalationCount}`} />
          <SummaryTile detail="release blockers" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="workspace" label="Routing" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Exception routing action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.routingHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Exception</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <ExceptionRow key={row.exceptionId} row={row} />)}</TableBody>
        </Table>

        <Badge className="w-fit gap-1 rounded-md" variant="outline">
          <Download className="size-3.5" />
          {report.summary.routingHash}
        </Badge>
      </CardContent>
    </Card>
  );
}
