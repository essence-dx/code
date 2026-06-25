import { CheckCircle2, Download, FileJson2, GitCompareArrows, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveGovernancePolicyDriftMonitorReport,
  BoardReleaseArchiveGovernancePolicyDriftMonitorRow,
  BoardReleaseArchiveGovernancePolicyDriftMonitorStatus,
} from "@/features/projects/board-release-archive-governance-policy-drift-monitor";

function statusVariant(status: BoardReleaseArchiveGovernancePolicyDriftMonitorStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveGovernancePolicyDriftMonitorStatus }) {
  if (status === "aligned") {
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

function DriftRow({ row }: { row: BoardReleaseArchiveGovernancePolicyDriftMonitorRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[260px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <GitCompareArrows className="size-3.5" />
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
      <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">{row.activeRule}</TableCell>
      <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">{row.recommendation}</TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="font-mono">{row.driftScore}/100</p>
        <p className="mt-1 line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.driftHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveGovernancePolicyDriftMonitorPanel({
  report,
}: {
  report: BoardReleaseArchiveGovernancePolicyDriftMonitorReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitCompareArrows className="size-4" />
              Archive governance policy drift monitor
            </CardTitle>
            <CardDescription>Compare active governance rules against archive packet and quorum recommendations before policy drift reaches release decisions.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.driftScore < 80 ? "destructive" : "outline"}>
              {report.summary.driftScore}/100 drift
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
          <SummaryTile detail="drift rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="aligned rows" label="Aligned" value={`${report.summary.alignedCount}`} />
          <SummaryTile detail="watch rows" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="blocked rows" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="workspace" label="Drift" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Drift next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.driftHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Policy area</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Active rule</TableHead>
              <TableHead>Recommendation</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <DriftRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
