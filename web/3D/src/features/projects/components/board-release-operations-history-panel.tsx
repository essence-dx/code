import { CheckCircle2, Download, FileJson2, History, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseOperationsHistoryRecord,
  BoardReleaseOperationsHistoryReport,
  BoardReleaseOperationsHistoryStatus,
} from "@/features/projects/board-release-operations-history";

function statusVariant(status: BoardReleaseOperationsHistoryStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseOperationsHistoryStatus }) {
  if (status === "ready" || status === "archived") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not archived";
  }

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

function HistoryRow({ record }: { record: BoardReleaseOperationsHistoryRecord }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <History className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{record.releasePromotionId ?? "Unassigned release"}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{record.historyId}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(record.status)}>
          <StatusIcon status={record.status} />
          {record.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{record.gateScore}/100 gate</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{record.varianceCount} variances</p>
        <p>{record.varianceBlockerCount} blockers</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{record.notificationEligibleRouteCount} eligible</p>
        <p>{record.notificationSuppressedCount} suppressed</p>
      </TableCell>
      <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
        <p>{formatDate(record.archivedAt)}</p>
        <p className="truncate font-mono">{record.historyHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseOperationsHistoryPanel({ report }: { report: BoardReleaseOperationsHistoryReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4" />
              Board release operations history
            </CardTitle>
            <CardDescription>Promotion gates, archive hashes, variance summaries, and notification route counts preserved as release operations records.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.historyCount} records
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
          <SummaryTile detail="history records" label="Records" value={`${report.summary.historyCount}`} />
          <SummaryTile detail="blocked ops" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="watch ops" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="ready ops" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="archived ops" label="Archived" value={`${report.summary.archivedCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">History next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Operation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Variance</TableHead>
              <TableHead>Notifications</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.records.map((record) => <HistoryRow key={record.historyId} record={record} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
