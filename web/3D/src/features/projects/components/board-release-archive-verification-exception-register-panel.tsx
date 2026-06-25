import { CheckCircle2, Download, FileJson2, ShieldAlert, TriangleAlert, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveVerificationExceptionApprovalStatus,
  BoardReleaseArchiveVerificationExceptionRegisterReport,
  BoardReleaseArchiveVerificationExceptionRegisterRow,
  BoardReleaseArchiveVerificationExceptionStatus,
} from "@/features/projects/board-release-archive-verification-exception-register";

function statusVariant(status: BoardReleaseArchiveVerificationExceptionStatus) {
  return status === "open" ? ("destructive" as const) : "outline";
}

function approvalVariant(status: BoardReleaseArchiveVerificationExceptionApprovalStatus) {
  if (status === "missing") {
    return "destructive" as const;
  }

  return status === "expired" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveVerificationExceptionStatus }) {
  return status === "cleared" ? <CheckCircle2 className="size-3.5" /> : <ShieldAlert className="size-3.5" />;
}

function ApprovalIcon({ status }: { status: BoardReleaseArchiveVerificationExceptionApprovalStatus }) {
  if (status === "approved") {
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

function ExceptionRow({ row }: { row: BoardReleaseArchiveVerificationExceptionRegisterRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Workflow className="size-3.5" />
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
        <p className="mt-1 text-xs text-muted-foreground">{row.sourceStatus}</p>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={approvalVariant(row.approvalStatus)}>
          <ApprovalIcon status={row.approvalStatus} />
          {row.approvalStatus}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.approver ?? "No approver"}</p>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{row.owner}</p>
        <p className="mt-1">{row.expiresAt}</p>
        <p className="mt-1 truncate font-mono">{row.approvalEvidenceHash ?? "missing approval evidence"}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.exceptionHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveVerificationExceptionRegisterPanel({
  report,
}: {
  report: BoardReleaseArchiveVerificationExceptionRegisterReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="size-4" />
              Archive verification exception register
            </CardTitle>
            <CardDescription>Owner, expiry, and board approval evidence register for unresolved archive verification blockers.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.registerScore < 80 ? "destructive" : "outline"}>
              {report.summary.registerScore}/100 register
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
          <SummaryTile detail="register rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="unresolved" label="Open" value={`${report.summary.openCount}`} />
          <SummaryTile detail="approved exceptions" label="Approved" value={`${report.summary.approvedCount}`} />
          <SummaryTile detail="missing evidence" label="Missing" value={`${report.summary.missingApprovalCount}`} />
          <SummaryTile detail="expired approvals" label="Expired" value={`${report.summary.expiredCount}`} />
          <SummaryTile detail="workspace" label="Register" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Exception next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.registerHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Exception</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Board approval</TableHead>
              <TableHead>Owner / expiry</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <ExceptionRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
