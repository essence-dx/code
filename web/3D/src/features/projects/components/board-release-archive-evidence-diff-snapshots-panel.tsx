import { CheckCircle2, Download, FileJson2, GitCompareArrows, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveEvidenceDiffSnapshotReport,
  BoardReleaseArchiveEvidenceDiffSnapshotRow,
  BoardReleaseArchiveEvidenceDiffSnapshotStatus,
} from "@/features/projects/board-release-archive-evidence-diff-snapshots";

function statusVariant(status: BoardReleaseArchiveEvidenceDiffSnapshotStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveEvidenceDiffSnapshotStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function DiffRow({ row }: { row: BoardReleaseArchiveEvidenceDiffSnapshotRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <GitCompareArrows className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="truncate text-xs text-muted-foreground">{row.fileName}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.change}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p className="font-medium">{row.kind}</p>
        <p className="text-xs text-muted-foreground">
          {row.previousStatus ?? "none"} to {row.currentStatus ?? "none"}
        </p>
      </TableCell>
      <TableCell className="text-sm">
        <p>{row.recordDelta >= 0 ? `+${row.recordDelta}` : row.recordDelta} records</p>
        <p className="text-xs text-muted-foreground">{row.byteDelta >= 0 ? `+${row.byteDelta}` : row.byteDelta} bytes</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.currentVaultHash ?? row.previousVaultHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveEvidenceDiffSnapshotsPanel({
  report,
}: {
  report: BoardReleaseArchiveEvidenceDiffSnapshotReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitCompareArrows className="size-4" />
              Archive evidence diff snapshots
            </CardTitle>
            <CardDescription>Saved vault baseline comparison for archive evidence bundle hashes, record counts, and evidence sizes.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.snapshotScore < 80 ? "destructive" : "outline"}>
              {report.summary.snapshotScore}/100 diff
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
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="bundle rows" label="Rows" value={`${report.summary.totalCount}`} />
          <SummaryTile detail="baseline drift" label="Changed" value={`${report.summary.changedCount}`} />
          <SummaryTile detail="new bundles" label="Added" value={`${report.summary.addedCount}`} />
          <SummaryTile detail="missing bundles" label="Missing" value={`${report.summary.missingCount}`} />
          <SummaryTile detail="stable bundles" label="Unchanged" value={`${report.summary.unchangedCount}`} />
          <SummaryTile detail="workspace" label="Snapshot" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Diff next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.snapshotHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bundle</TableHead>
              <TableHead>Diff</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Delta</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <DiffRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
