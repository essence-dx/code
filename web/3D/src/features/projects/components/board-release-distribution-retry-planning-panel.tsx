import { CheckCircle2, Download, FileJson2, RotateCcw, ShieldAlert, TimerReset, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseDistributionRetryPlan,
  BoardReleaseDistributionRetryPlanningReport,
  BoardReleaseDistributionRetryStatus,
} from "@/features/projects/board-release-distribution-retry-planning";

function statusVariant(status: BoardReleaseDistributionRetryStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "scheduled" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseDistributionRetryStatus }) {
  if (status === "ready") {
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

function RetryRow({ retry }: { retry: BoardReleaseDistributionRetryPlan }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <RotateCcw className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{retry.recipientName}</p>
            <p className="truncate text-xs text-muted-foreground">{retry.recipientEmail ?? "No email on file"}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(retry.status)}>
          <StatusIcon status={retry.status} />
          {retry.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{retry.reason}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{retry.retryAction}</p>
        <p>{formatDate(retry.dueAt)}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{retry.nextAction}</p>
        <p className="mt-1 truncate font-mono">{retry.retryHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseDistributionRetryPlanningPanel({ report }: { report: BoardReleaseDistributionRetryPlanningReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TimerReset className="size-4" />
              Board release distribution retry planning
            </CardTitle>
            <CardDescription>Retry plans for suppressed, missing, blocked, or expired release distribution routes.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.retryCount} retries
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
          <SummaryTile detail="retry rows" label="Retries" value={`${report.summary.retryCount}`} />
          <SummaryTile detail="needs repair" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="queued retries" label="Scheduled" value={`${report.summary.scheduledCount}`} />
          <SummaryTile detail="missing contacts" label="Missing" value={`${report.summary.missingRecipientCount}`} />
          <SummaryTile detail="expired ack" label="Expired" value={`${report.summary.expiredAcknowledgementCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Retry planning next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Retry</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.retries.map((retry) => <RetryRow key={retry.retryId} retry={retry} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
