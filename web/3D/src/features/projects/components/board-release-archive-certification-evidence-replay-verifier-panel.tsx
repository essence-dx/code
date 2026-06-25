import { CheckCircle2, Download, FileJson2, RotateCcw, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveCertificationEvidenceReplayVerifierReport,
  BoardReleaseArchiveCertificationReplayRow,
  BoardReleaseArchiveCertificationReplayStatus,
} from "@/features/projects/board-release-archive-certification-evidence-replay-verifier";

function statusVariant(status: BoardReleaseArchiveCertificationReplayStatus) {
  if (status === "missing") {
    return "destructive" as const;
  }

  return status === "drift" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveCertificationReplayStatus }) {
  if (status === "matched") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "missing" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function ReplayRow({ row }: { row: BoardReleaseArchiveCertificationReplayRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <RotateCcw className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="truncate text-xs text-muted-foreground">{row.kind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.sourceStatus}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p className="font-medium">{row.recordCount} records</p>
        <p className="truncate font-mono text-xs text-muted-foreground">actual {row.actualHash ?? "missing"}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">expected {row.expectedHash}</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.replayHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveCertificationEvidenceReplayVerifierPanel({
  report,
}: {
  report: BoardReleaseArchiveCertificationEvidenceReplayVerifierReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="size-4" />
              Archive certification evidence replay verifier
            </CardTitle>
            <CardDescription>Recomputes certificate source hashes and flags drift between closeout evidence, current sources, and certificate history.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.replayScore < 80 ? "destructive" : "outline"}>
              {report.summary.replayScore}/100 replay
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
          <SummaryTile detail="replay rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="matched sources" label="Matched" value={`${report.summary.matchedCount}`} />
          <SummaryTile detail="hash drift" label="Drift" value={`${report.summary.driftCount}`} />
          <SummaryTile detail="missing evidence" label="Missing" value={`${report.summary.missingCount}`} />
          <SummaryTile detail="workspace" label="Verifier" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Replay verifier next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.replayHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Replay</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Hashes</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <ReplayRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
