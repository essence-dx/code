import { CheckCircle2, Download, FileJson2, History, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveOversightIncidentReplayDrillReport,
  BoardReleaseArchiveOversightIncidentReplayDrillRow,
  BoardReleaseArchiveOversightIncidentReplayStatus,
} from "@/features/projects/board-release-archive-oversight-incident-replay-drill";

function statusVariant(status: BoardReleaseArchiveOversightIncidentReplayStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveOversightIncidentReplayStatus }) {
  if (status === "passed") {
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

function DrillRow({ row }: { row: BoardReleaseArchiveOversightIncidentReplayDrillRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <History className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.scenario}</p>
            <p className="text-xs text-muted-foreground">incident replay scenario</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{row.drillScore}/100</TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.replayEvidenceHash ?? "replay evidence pending"}</p>
        <p className="mt-1 truncate font-mono">{row.drillHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveOversightIncidentReplayDrillPanel({
  report,
}: {
  report: BoardReleaseArchiveOversightIncidentReplayDrillReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4" />
              Archive oversight incident replay drill
            </CardTitle>
            <CardDescription>Replay coverage for custody access failures, retention unlocks, and restore drift.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.drillScore < 80 ? "destructive" : "outline"}>
              {report.summary.drillScore}/100 drill
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
          <SummaryTile detail="drill rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="passed scenarios" label="Passed" value={`${report.summary.passedCount}`} />
          <SummaryTile detail="watch scenarios" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="blocked scenarios" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="workspace" label="Drill" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Drill next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.drillHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scenario</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Replay evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <DrillRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
