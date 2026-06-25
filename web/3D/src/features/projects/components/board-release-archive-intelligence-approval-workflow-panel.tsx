import { CheckCircle2, Download, FileWarning, ShieldAlert, ShieldCheck, Signature, TriangleAlert, UserCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveIntelligenceApprovalRow,
  BoardReleaseArchiveIntelligenceApprovalStatus,
  BoardReleaseArchiveIntelligenceApprovalWorkflowReport,
} from "@/features/projects/board-release-archive-intelligence-approval-workflow";

function statusVariant(status: BoardReleaseArchiveIntelligenceApprovalStatus) {
  if (status === "hash-mismatch" || status === "rejected") {
    return "destructive" as const;
  }

  return status === "approved" ? "outline" : "secondary";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveIntelligenceApprovalStatus }) {
  if (status === "approved") {
    return <CheckCircle2 className="size-3.5" />;
  }

  if (status === "hash-mismatch" || status === "rejected") {
    return <ShieldAlert className="size-3.5" />;
  }

  return status === "exception-needed" ? <FileWarning className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function formatDate(value: string | null) {
  if (!value) {
    return "Not signed";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function ApprovalRow({ row }: { row: BoardReleaseArchiveIntelligenceApprovalRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <UserCheck2 className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="text-xs text-muted-foreground">{row.recommendationKind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.recommendationStatus} recommendation</p>
      </TableCell>
      <TableCell className="whitespace-normal">
        <p className="font-medium">{row.reviewerName}</p>
        <p className="text-xs text-muted-foreground">{row.reviewerEmail}</p>
        <Badge className="mt-2 rounded-md" variant="outline">
          {row.reviewerRole}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[260px] whitespace-normal text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{row.acknowledgement}</p>
        <p className="mt-1">{row.exceptionNote ?? "No exception note attached"}</p>
      </TableCell>
      <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
        <p>{formatDate(row.signedOffAt)}</p>
        <p className="mt-1 truncate font-mono">{row.signedPacketHash ?? "No packet hash sign-off"}</p>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveIntelligenceApprovalWorkflowPanel({
  report,
}: {
  report: BoardReleaseArchiveIntelligenceApprovalWorkflowReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Archive intelligence approvals
            </CardTitle>
            <CardDescription>Reviewer acknowledgement, exception notes, and packet hash sign-off for archive intelligence recommendations.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.workflowScore < 70 ? "destructive" : "outline"}>
              {report.summary.workflowScore}/100 workflow
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
          <SummaryTile detail="open recommendations" label="Approvals" value={`${report.summary.totalCount}`} />
          <SummaryTile detail="signed and noted" label="Approved" value={`${report.summary.approvedCount}`} />
          <SummaryTile detail="needs acknowledgement" label="Pending" value={`${report.summary.pendingCount}`} />
          <SummaryTile detail="blocked without notes" label="Exceptions" value={`${report.summary.exceptionNeededCount}`} />
          <SummaryTile detail="stale sign-off" label="Hash mismatch" value={`${report.summary.hashMismatchCount}`} />
          <SummaryTile detail="changes requested" label="Rejected" value={`${report.summary.rejectedCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Signature className="size-4" />
            Approval next action
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.packetHash}</p>
        </div>

        {report.rows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recommendation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Acknowledgement</TableHead>
                <TableHead>Packet hash</TableHead>
                <TableHead>Next action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{report.rows.map((row) => <ApprovalRow key={row.id} row={row} />)}</TableBody>
          </Table>
        ) : (
          <div className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4" />
            No archive intelligence approvals are required for this packet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
