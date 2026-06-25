import { Archive, CheckCircle2, Download, FileCheck2, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardAssuranceEvidenceBundleFile,
  BoardAssuranceEvidenceBundleReport,
  BoardAssuranceEvidenceBundleStatus,
} from "@/features/projects/board-assurance-evidence-bundle";

function statusVariant(status: BoardAssuranceEvidenceBundleStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardAssuranceEvidenceBundleStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function formatByteSize(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  return `${Math.round(value / 1024)} KB`;
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

function BundleFileRow({ file }: { file: BoardAssuranceEvidenceBundleFile }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <FileCheck2 className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{file.label}</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">{file.path}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(file.status)}>
          <StatusIcon status={file.status} />
          {file.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{file.recordCount} records</p>
      </TableCell>
      <TableCell className="max-w-[280px] whitespace-normal text-xs text-muted-foreground">
        <p className="break-all">{file.contentHash}</p>
        <p className="mt-1">{formatByteSize(file.byteSize)}</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-3">{file.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardAssuranceEvidenceBundlePanel({ report }: { report: BoardAssuranceEvidenceBundleReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Archive className="size-4" />
              Board assurance evidence bundle
            </CardTitle>
            <CardDescription>Downloadable board packet joining approvals, replay audits, incidents, runbook proof, exceptions, and file hashes.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.evidenceScore < 80 ? "destructive" : "outline"}>
              {report.summary.evidenceScore}/100 evidence
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm" })} download={report.jsonFileName} href={report.jsonDataUri}>
              <Download className="size-4" />
              JSON
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="active packet evidence" label="Approvals" value={`${report.summary.approvalRecordCount}`} />
          <SummaryTile detail="decision replay rows" label="Replay" value={`${report.summary.replayRowCount}`} />
          <SummaryTile detail="persisted baselines" label="Snapshots" value={`${report.summary.replaySnapshotCount}`} />
          <SummaryTile detail="incident templates" label="Postmortems" value={`${report.summary.incidentPostmortemCount}`} />
          <SummaryTile detail={`${report.summary.completedRunbookCount} complete`} label="Runbook" value={`${report.summary.totalRunbookCount}`} />
          <SummaryTile detail={formatByteSize(report.summary.totalByteSize)} label="Files" value={`${report.summary.fileCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Bundle next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evidence file</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Hash</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.files.map((file) => <BundleFileRow key={file.path} file={file} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
