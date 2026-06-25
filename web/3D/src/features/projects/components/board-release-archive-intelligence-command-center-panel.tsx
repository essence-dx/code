import { CheckCircle2, ClipboardList, Download, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveIntelligenceCommandCenterReport,
  BoardReleaseArchiveIntelligenceCommandCenterRow,
  BoardReleaseArchiveIntelligenceCommandCenterStatus,
} from "@/features/projects/board-release-archive-intelligence-command-center";

function statusVariant(status: BoardReleaseArchiveIntelligenceCommandCenterStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveIntelligenceCommandCenterStatus }) {
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

function CommandRow({ row }: { row: BoardReleaseArchiveIntelligenceCommandCenterRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <ClipboardList className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.label}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{row.detail}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.score}/100</p>
      </TableCell>
      <TableCell className="whitespace-normal text-sm">
        <p className="font-medium">{row.owner}</p>
      </TableCell>
      <TableCell className="max-w-[380px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-3">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveIntelligenceCommandCenterPanel({
  report,
}: {
  report: BoardReleaseArchiveIntelligenceCommandCenterReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4" />
              Archive intelligence command center
            </CardTitle>
            <CardDescription>Packet history, notification routes, approvals, and remediation work in one archive automation view.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.commandScore < 70 ? "destructive" : "outline"}>
              {report.summary.commandScore}/100 command
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="command rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="needs action" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="monitor" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="complete" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="open recommendations" label="Remediation" value={`${report.summary.remediationWorkCount}`} />
          <SummaryTile detail="workspace" label="Command" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Command next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.packetHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Control</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <CommandRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
