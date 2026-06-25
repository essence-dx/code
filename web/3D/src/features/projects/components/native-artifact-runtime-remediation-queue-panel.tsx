import { CheckCircle2, ClipboardList, Download, FileJson2, Siren, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  NativeArtifactRuntimeRemediationQueueFileFormat,
  NativeArtifactRuntimeRemediationQueueReport,
  NativeArtifactRuntimeRemediationQueueRow,
  NativeArtifactRuntimeRemediationQueueStatus,
} from "@/features/projects/native-artifact-runtime-remediation-queue";

function statusVariant(status: NativeArtifactRuntimeRemediationQueueStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: NativeArtifactRuntimeRemediationQueueStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <Siren className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function FileIcon({ format }: { format: NativeArtifactRuntimeRemediationQueueFileFormat }) {
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

function QueueFlag({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <Badge className="gap-1 rounded-md" variant={enabled ? "outline" : "destructive"}>
      {enabled ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
      {label}
    </Badge>
  );
}

function QueueRow({ row }: { row: NativeArtifactRuntimeRemediationQueueRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <ClipboardList className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.platform}</p>
            <p className="truncate text-xs text-muted-foreground">{row.blockerId}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal">
        <div className="flex flex-wrap gap-1.5">
          <QueueFlag enabled={row.ownerReady} label="owner" />
          <QueueFlag enabled={row.dueDateReady} label="due date" />
          <QueueFlag enabled={row.escalationReady} label="escalation" />
          <QueueFlag enabled={row.evidencePacketReady} label="evidence" />
        </div>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate">{row.owner || "missing owner"}</p>
        <p className="mt-1 truncate">{row.dueAt || "missing due date"}</p>
        <p className="mt-1 truncate">{row.escalationRoute || "missing escalation route"}</p>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate">{row.evidencePacketUrl || "missing evidence packet URL"}</p>
        <p className="mt-1 truncate font-mono">{row.queueHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function NativeArtifactRuntimeRemediationQueuePanel({ report }: { report: NativeArtifactRuntimeRemediationQueueReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4" />
              Artifact runtime remediation queue
            </CardTitle>
            <CardDescription>Operator-owned native artifact and CAD runtime blocker remediation with due dates, escalation routes, evidence packets, and exportable release proof.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.queueScore < 80 ? "destructive" : "outline"}>
              {report.summary.queueScore}/100 queue
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
          <SummaryTile detail="platform rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="ready rows" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="critical blockers" label="Critical" value={`${report.summary.criticalCount}`} />
          <SummaryTile detail="escalation routes" label="Escalations" value={`${report.summary.escalationRouteCount}`} />
          <SummaryTile detail="evidence packets" label="Evidence" value={`${report.summary.evidencePacketCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Queue action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.queueHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Readiness</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <QueueRow key={row.platform} row={row} />)}</TableBody>
        </Table>

        <Badge className="w-fit gap-1 rounded-md" variant="outline">
          <Download className="size-3.5" />
          {report.summary.queueHash}
        </Badge>
      </CardContent>
    </Card>
  );
}
