import { CheckCircle2, ClipboardCheck, Download, FileJson2, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveAssurancePostReleaseAuditChecklistReport,
  BoardReleaseArchiveAssurancePostReleaseAuditItem,
  BoardReleaseArchiveAssurancePostReleaseAuditStatus,
} from "@/features/projects/board-release-archive-assurance-post-release-audit-checklist";

function statusVariant(status: BoardReleaseArchiveAssurancePostReleaseAuditStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "pending" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveAssurancePostReleaseAuditStatus }) {
  if (status === "closed") {
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

function AuditRow({ row }: { row: BoardReleaseArchiveAssurancePostReleaseAuditItem }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <ClipboardCheck className="size-3.5" />
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
        <p className="mt-1 truncate text-xs text-muted-foreground">{row.owner}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p>{row.dueAt}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{row.sourceHash}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.proofHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveAssurancePostReleaseAuditChecklistPanel({
  report,
}: {
  report: BoardReleaseArchiveAssurancePostReleaseAuditChecklistReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-4" />
              Archive assurance post-release audit checklist
            </CardTitle>
            <CardDescription>Closeout checklist for reviewer acknowledgement completion and renewal closure proof after release handoff.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.checklistScore < 80 ? "destructive" : "outline"}>
              {report.summary.checklistScore}/100 audit
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
          <SummaryTile detail="audit rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="closed proof" label="Closed" value={`${report.summary.closedCount}`} />
          <SummaryTile detail="pending proof" label="Pending" value={`${report.summary.pendingCount}`} />
          <SummaryTile detail="blocked proof" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="acknowledgements" label="Ack closed" value={`${report.summary.acknowledgementClosedCount}`} />
          <SummaryTile detail="renewals" label="Renewal closed" value={`${report.summary.renewalClosedCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Post-release audit next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.auditHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Audit item</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due proof</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <AuditRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
