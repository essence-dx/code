import { CheckCircle2, Download, FileJson2, Gauge, RotateCcw, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveStewardshipContinuityRehearsalReport,
  BoardReleaseArchiveStewardshipContinuityRehearsalRow,
  BoardReleaseArchiveStewardshipContinuityRehearsalStatus,
} from "@/features/projects/board-release-archive-stewardship-continuity-rehearsal";

function statusVariant(status: BoardReleaseArchiveStewardshipContinuityRehearsalStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveStewardshipContinuityRehearsalStatus }) {
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

function RehearsalRow({ row }: { row: BoardReleaseArchiveStewardshipContinuityRehearsalRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <RotateCcw className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="text-xs text-muted-foreground">{row.kind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>Handoff {row.ownerHandoffMinutes}m</p>
        <p>Recovery {row.packetRecoveryMinutes}m</p>
        <p>Resume {row.governanceResumeMinutes}m</p>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{row.rehearsalScore}/100</TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.evidenceHash ?? "evidence pending"}</p>
        <p className="mt-1 truncate font-mono">{row.rehearsalHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveStewardshipContinuityRehearsalPanel({
  report,
}: {
  report: BoardReleaseArchiveStewardshipContinuityRehearsalReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="size-4" />
              Archive stewardship continuity rehearsal
            </CardTitle>
            <CardDescription>Rehearse owner handoff, packet recovery, and governance review resumption before release archive stewardship ownership changes.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.rehearsalScore < 80 ? "destructive" : "outline"}>
              {report.summary.rehearsalScore}/100 rehearsal
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
          <SummaryTile detail="rehearsal rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="ready rows" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="watch rows" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="blocked rows" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="workspace" label="Continuity" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Gauge className="size-4" />
            Rehearsal next action
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.continuityHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Continuity area</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Timing</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <RehearsalRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
