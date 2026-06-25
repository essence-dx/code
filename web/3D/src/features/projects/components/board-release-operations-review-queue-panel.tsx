import { CheckCircle2, ClipboardCheck, Download, FileJson2, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseOperationsReviewQueueItem,
  BoardReleaseOperationsReviewQueueReport,
  BoardReleaseOperationsReviewQueueStatus,
} from "@/features/projects/board-release-operations-review-queue";

function statusVariant(status: BoardReleaseOperationsReviewQueueStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "in-review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseOperationsReviewQueueStatus }) {
  if (status === "ready" || status === "closed") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(value));
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

function QueueRow({ item }: { item: BoardReleaseOperationsReviewQueueItem }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <ClipboardCheck className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{item.releasePromotionId ?? "Unassigned release"}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{item.queueId}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(item.status)}>
          <StatusIcon status={item.status} />
          {item.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{item.closeoutTransition}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{item.ownerName}</p>
        <p className="truncate">{item.ownerEmail ?? "No email on file"}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDate(item.dueAt)}</TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{item.nextAction}</p>
        <p className="mt-1 truncate font-mono">{item.historyHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseOperationsReviewQueuePanel({ report }: { report: BoardReleaseOperationsReviewQueueReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-4" />
              Board release operations review queue
            </CardTitle>
            <CardDescription>Owner assignments, due windows, and closeout transitions for board release operations records.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.queueCount} queued
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
          <SummaryTile detail="review items" label="Queue" value={`${report.summary.queueCount}`} />
          <SummaryTile detail="needs action" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="active review" label="In review" value={`${report.summary.inReviewCount}`} />
          <SummaryTile detail="can close" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="already sealed" label="Closed" value={`${report.summary.closedCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Queue next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Release</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.items.map((item) => <QueueRow item={item} key={item.queueId} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
