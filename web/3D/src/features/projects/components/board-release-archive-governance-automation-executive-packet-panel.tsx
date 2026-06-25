import { CheckCircle2, Download, FileJson2, PackageCheck, ShieldAlert, TriangleAlert, Vote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveGovernanceAutomationExecutivePacketReport,
  BoardReleaseArchiveGovernanceAutomationExecutivePacketRow,
  BoardReleaseArchiveGovernanceAutomationExecutivePacketStatus,
} from "@/features/projects/board-release-archive-governance-automation-executive-packet";

function statusVariant(status: BoardReleaseArchiveGovernanceAutomationExecutivePacketStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveGovernanceAutomationExecutivePacketStatus }) {
  if (status === "approved") {
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

function PacketRow({ row }: { row: BoardReleaseArchiveGovernanceAutomationExecutivePacketRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Vote className="size-3.5" />
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
        <p className="font-medium text-foreground">{row.ownerRole}</p>
        <p>{row.sourceScore}/100 source</p>
      </TableCell>
      <TableCell className="max-w-[460px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.recommendation}</p>
        <p className="mt-1 truncate font-mono">{row.evidenceHash}</p>
        <p className="mt-1 truncate font-mono">{row.packetHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveGovernanceAutomationExecutivePacketPanel({
  report,
}: {
  report: BoardReleaseArchiveGovernanceAutomationExecutivePacketReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="size-4" />
              Archive governance automation executive packet
            </CardTitle>
            <CardDescription>Trigger register, runbook, failure ledger, audit trail, and release recommendation evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.packetScore < 80 ? "destructive" : "outline"}>
              {report.summary.packetScore}/100 packet
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail="packet rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="approved rows" label="Approved" value={`${report.summary.approvedCount}`} />
          <SummaryTile detail="review rows" label="Review" value={`${report.summary.reviewCount}`} />
          <SummaryTile detail="blocked rows" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="workspace" label="Packet" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Executive action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.packetHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Packet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Recommendation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <PacketRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
