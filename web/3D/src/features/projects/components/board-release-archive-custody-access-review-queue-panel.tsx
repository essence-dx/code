import { CheckCircle2, Download, FileJson2, ShieldAlert, TriangleAlert, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveCustodyAccessReviewQueueReport,
  BoardReleaseArchiveCustodyAccessReviewQueueRow,
  BoardReleaseArchiveCustodyAccessReviewStatus,
} from "@/features/projects/board-release-archive-custody-access-review-queue";

function statusVariant(status: BoardReleaseArchiveCustodyAccessReviewStatus | BoardReleaseArchiveCustodyAccessReviewQueueReport["summary"]["status"]) {
  if (status === "expired" || status === "revoked" || status === "blocked") {
    return "destructive" as const;
  }

  return status === "pending" || status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveCustodyAccessReviewStatus | BoardReleaseArchiveCustodyAccessReviewQueueReport["summary"]["status"] }) {
  if (status === "approved") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" || status === "expired" || status === "revoked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function AccessRow({ row }: { row: BoardReleaseArchiveCustodyAccessReviewQueueRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <UserCheck className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.recipient}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{row.recipientType}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.accessExpiresAt}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p className="truncate font-mono text-xs text-muted-foreground">{row.accessGrantHash}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{row.reviewEvidenceHash ?? row.revocationEvidenceHash ?? "evidence pending"}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.accessReviewHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveCustodyAccessReviewQueuePanel({
  report,
}: {
  report: BoardReleaseArchiveCustodyAccessReviewQueueReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="size-4" />
              Archive custody access review queue
            </CardTitle>
            <CardDescription>Recipient access review for board, auditor, partner, and internal archive custody recipients.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.reviewScore < 80 ? "destructive" : "outline"}>
              {report.summary.reviewScore}/100 access
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
          <SummaryTile detail="recipient reviews" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="active access" label="Approved" value={`${report.summary.approvedCount}`} />
          <SummaryTile detail="needs evidence" label="Pending" value={`${report.summary.pendingCount}`} />
          <SummaryTile detail="past expiry" label="Expired" value={`${report.summary.expiredCount}`} />
          <SummaryTile detail="removed access" label="Revoked" value={`${report.summary.revokedCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Access review next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.accessReviewHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <AccessRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
