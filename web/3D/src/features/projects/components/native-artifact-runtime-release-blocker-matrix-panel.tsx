import { CheckCircle2, Download, FileJson2, GitPullRequestArrow, ShieldAlert, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  NativeArtifactRuntimeReleaseBlockerMatrixFileFormat,
  NativeArtifactRuntimeReleaseBlockerMatrixReport,
  NativeArtifactRuntimeReleaseBlockerMatrixStatus,
  NativeArtifactRuntimeReleaseBlockerRow,
} from "@/features/projects/native-artifact-runtime-release-blocker-matrix";

function statusVariant(status: NativeArtifactRuntimeReleaseBlockerMatrixStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: NativeArtifactRuntimeReleaseBlockerMatrixStatus }) {
  if (status === "go") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function FileIcon({ format }: { format: NativeArtifactRuntimeReleaseBlockerMatrixFileFormat }) {
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

function MatrixFlag({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <Badge className="gap-1 rounded-md" variant={enabled ? "outline" : "destructive"}>
      {enabled ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
      {label}
    </Badge>
  );
}

function MatrixRow({ row }: { row: NativeArtifactRuntimeReleaseBlockerRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <GitPullRequestArrow className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.platform}</p>
            <p className="truncate text-xs text-muted-foreground">{row.blockerId}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.goNoGo)}>
          <StatusIcon status={row.goNoGo} />
          {row.goNoGo}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal">
        <div className="flex flex-wrap gap-1.5">
          <MatrixFlag enabled={row.signedArtifactReady} label="signed artifact" />
          <MatrixFlag enabled={row.updaterDistributionReady} label="updater" />
          <MatrixFlag enabled={row.cadRuntimeReady} label="CAD runtime" />
          <MatrixFlag enabled={row.releaseApprovalReady} label="approval" />
        </div>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate">{row.owner || "missing owner"}</p>
        <p className="mt-1 truncate">{row.dueAt || "missing due date"}</p>
        <p className="mt-1 truncate">{row.evidenceUrl || "missing evidence URL"}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.matrixHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function NativeArtifactRuntimeReleaseBlockerMatrixPanel({ report }: { report: NativeArtifactRuntimeReleaseBlockerMatrixReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitPullRequestArrow className="size-4" />
              Artifact runtime release blocker matrix
            </CardTitle>
            <CardDescription>Signed artifact, updater distribution, CAD runtime, and release approval readiness combined into one native artifact runtime go/no-go packet.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.matrixScore < 80 ? "destructive" : "outline"}>
              {report.summary.matrixScore}/100 matrix
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
          <SummaryTile detail="go rows" label="Go" value={`${report.summary.goCount}`} />
          <SummaryTile detail="release blockers" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="CAD runtime ready" label="CAD" value={`${report.summary.cadRuntimeReadyCount}`} />
          <SummaryTile detail="release approvals" label="Approval" value={`${report.summary.releaseApprovalReadyCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Matrix action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.matrixHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>Go/no-go</TableHead>
              <TableHead>Readiness</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <MatrixRow key={row.platform} row={row} />)}</TableBody>
        </Table>

        <Badge className="w-fit gap-1 rounded-md" variant="outline">
          <Download className="size-3.5" />
          {report.summary.matrixHash}
        </Badge>
      </CardContent>
    </Card>
  );
}
