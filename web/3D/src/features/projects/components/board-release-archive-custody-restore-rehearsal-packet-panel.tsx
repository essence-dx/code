import { CheckCircle2, Download, FileJson2, RotateCcw, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveCustodyRestoreRehearsalPacketReport,
  BoardReleaseArchiveCustodyRestoreRehearsalPacketRow,
  BoardReleaseArchiveCustodyRestoreRehearsalStatus,
} from "@/features/projects/board-release-archive-custody-restore-rehearsal-packet";

function statusVariant(status: BoardReleaseArchiveCustodyRestoreRehearsalStatus | BoardReleaseArchiveCustodyRestoreRehearsalPacketReport["summary"]["status"]) {
  if (status === "missing" || status === "blocked") {
    return "destructive" as const;
  }

  return status === "drift" || status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveCustodyRestoreRehearsalStatus | BoardReleaseArchiveCustodyRestoreRehearsalPacketReport["summary"]["status"] }) {
  if (status === "restored") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "missing" || status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function RestoreRow({ row }: { row: BoardReleaseArchiveCustodyRestoreRehearsalPacketRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <RotateCcw className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.artifact}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">Restore rehearsal hash comparison</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">
        <p className="truncate font-mono text-xs text-muted-foreground">{row.sourceHash}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{row.reconstructedHash ?? "reconstruction missing"}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.restoreHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveCustodyRestoreRehearsalPacketPanel({
  report,
}: {
  report: BoardReleaseArchiveCustodyRestoreRehearsalPacketReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="size-4" />
              Archive custody restore rehearsal packet
            </CardTitle>
            <CardDescription>Reconstruction proof that locked custody evidence can be restored from archived hashes.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.restoreScore < 80 ? "destructive" : "outline"}>
              {report.summary.restoreScore}/100 restore
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
          <SummaryTile detail="restore rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="matched hashes" label="Restored" value={`${report.summary.restoredCount}`} />
          <SummaryTile detail="missing records" label="Missing" value={`${report.summary.missingCount}`} />
          <SummaryTile detail="hash drift" label="Drift" value={`${report.summary.driftCount}`} />
          <SummaryTile detail="workspace" label="Packet" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Restore next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.restorePacketHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Artifact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Hashes</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <RestoreRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
