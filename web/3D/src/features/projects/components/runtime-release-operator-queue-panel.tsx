import { AlertCircle, CalendarClock, CheckCircle2, Download, FileJson2, Table2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RuntimeReleaseOperatorQueue, RuntimeReleaseOperatorQueueRow, RuntimeReleaseOperatorQueueStatus } from "@/features/projects/runtime-release-operator-queue";

function statusVariant(status: RuntimeReleaseOperatorQueueStatus) {
  return status === "ready" ? "outline" : "destructive";
}

function StatusIcon({ status }: { status: RuntimeReleaseOperatorQueueStatus }) {
  return status === "ready" ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />;
}

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "No due date";
}

function QueueRow({ row }: { row: RuntimeReleaseOperatorQueueRow }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.gateLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">{row.nextAction}</p>
          </div>
          <Badge className="shrink-0 gap-1 rounded-md" variant={statusVariant(row.status)}>
            <StatusIcon status={row.status} />
            {row.status}
          </Badge>
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <p className="flex min-w-0 items-center gap-2">
            <UserRound className="size-3.5 shrink-0" />
            <span className="truncate">{row.ownerName}</span>
          </p>
          <p className="flex min-w-0 items-center gap-2">
            <CalendarClock className="size-3.5 shrink-0" />
            <span className="truncate">{formatDateTime(row.dueAt)}</span>
          </p>
        </div>
        <p className="truncate font-mono text-xs text-muted-foreground">{row.evidenceHash}</p>
        <div className="flex flex-wrap gap-2">
          {row.downloads.map((download) => (
            <Button key={`${row.gateId}:${download.id}`} render={<a download={download.download} href={download.href} />} className="h-8 gap-2" size="sm" variant="outline">
              <Download className="size-4" />
              {download.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RuntimeReleaseOperatorQueuePanel({ queue }: { queue: RuntimeReleaseOperatorQueue }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="size-4" />
              Runtime operator queue
            </CardTitle>
            <CardDescription>Owner, due-date, blocker, and evidence download controls for runtime release gates.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(queue.summary.status)}>
              <StatusIcon status={queue.summary.status} />
              {queue.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={queue.summary.queueScore < 100 ? "destructive" : "outline"}>
              {queue.summary.queueScore}/100 queue
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {queue.rows.map((row) => (
            <QueueRow key={row.gateId} row={row} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button render={<a download={queue.csvFileName} href={queue.csvDataUri} />} className="gap-2" size="sm" variant="outline">
            <Table2 className="size-4" />
            Queue CSV
          </Button>
          <Button render={<a download={queue.jsonFileName} href={queue.jsonDataUri} />} className="gap-2" size="sm" variant="outline">
            <FileJson2 className="size-4" />
            Queue JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
