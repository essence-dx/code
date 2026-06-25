import { CheckCircle2, ClipboardCheck, Download, FileJson2, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveVerificationFinalAcceptancePacketReport,
  BoardReleaseArchiveVerificationFinalAcceptancePacketRow,
  BoardReleaseArchiveVerificationFinalAcceptancePacketStatus,
} from "@/features/projects/board-release-archive-verification-final-acceptance-packet";

function statusVariant(status: BoardReleaseArchiveVerificationFinalAcceptancePacketStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveVerificationFinalAcceptancePacketStatus }) {
  if (status === "accepted") {
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

function AcceptanceRow({ row }: { row: BoardReleaseArchiveVerificationFinalAcceptancePacketRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <ClipboardCheck className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
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
      <TableCell className="text-sm">
        <p className="font-medium">{row.kind}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{row.evidenceHash}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.acceptanceHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveVerificationFinalAcceptancePacketPanel({
  report,
}: {
  report: BoardReleaseArchiveVerificationFinalAcceptancePacketReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-4" />
              Archive verification final acceptance packet
            </CardTitle>
            <CardDescription>Board closeout packet with validator output, exception register, distribution proof, readiness timeline, and recommendation.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.finalAcceptanceScore < 80 ? "destructive" : "outline"}>
              {report.summary.finalAcceptanceScore}/100 acceptance
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
          <SummaryTile detail="acceptance rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="ready for closeout" label="Accepted" value={`${report.summary.acceptedCount}`} />
          <SummaryTile detail="monitor" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="needs action" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="workspace" label="Packet" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Executive recommendation</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.executiveRecommendation}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.finalAcceptanceHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evidence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <AcceptanceRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
